import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { MAINTENANCE_LIMITS } from '@/api/maintenance';
import type { StagedPhoto } from '@/api/types';

/** Longest edge kept, in px. Plenty for a landlord to diagnose a fault. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

export type PhotoSource = 'camera' | 'library';

export interface PickedPhotosResult {
  photos: StagedPhoto[];
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

/**
 * Downscales and re-encodes to JPEG.
 *
 * This does two jobs beyond shrinking bytes. It keeps every upload inside the
 * server's 8 MB per-file cap, and because the result is always a JPEG, the
 * multipart part is predictable — a tenant picking a HEIC photo off an iPhone
 * library would otherwise send a MIME type the server's allow-list rejects.
 */
async function compress(uri: string, index: number): Promise<StagedPhoto> {
  const context = ImageManipulator.manipulate(uri).resize({ width: MAX_DIMENSION });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    uri: result.uri,
    fileName: `maintenance-${index + 1}.jpg`,
  };
}

/**
 * Android can destroy the Activity while the system camera is in the
 * foreground, which throws away the pick result. The SDK exposes a way to
 * recover it, so a tenant who backgrounds the app mid-photo does not silently
 * lose the shot.
 *
 * The SDK can also return an error result here, which is why the success fields
 * are narrowed with an `in` check at the call site rather than assumed.
 */
async function recoverPendingResult(): Promise<
  ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null
> {
  try {
    return await ImagePicker.getPendingResultAsync();
  } catch {
    return null;
  }
}

async function requestCamera(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.granted) return true;

  Alert.alert(
    'Camera access needed',
    permission.canAskAgain
      ? 'Allow camera access in Settings to photograph the issue, or pick an existing photo instead.'
      : 'Camera access is turned off for Haven. Enable it in Settings, or pick an existing photo instead.',
  );
  return false;
}

async function requestLibrary(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;

  Alert.alert(
    'Photo access needed',
    permission.canAskAgain
      ? 'Allow photo access to attach an existing picture of the issue.'
      : 'Photo access is turned off for Haven. Enable it in Settings to attach a picture.',
  );
  return false;
}

/**
 * Picks, compresses and stages photos up to the server's cap.
 *
 * `remaining` is how many slots are left so the system picker is opened with a
 * matching `selectionLimit` — a tenant cannot pick nine photos and then be told
 * four of them are too many.
 */
export async function pickMaintenancePhotos(
  source: PhotoSource,
  remaining: number,
): Promise<PickedPhotosResult> {
  if (remaining <= 0) {
    Alert.alert(
      'Photo limit reached',
      `You can attach up to ${MAINTENANCE_LIMITS.maxPhotos} photos.`,
    );
    return { photos: [] };
  }

  const allowed = source === 'camera' ? await requestCamera() : await requestLibrary();
  if (!allowed) return { photos: [] };

  try {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
          });

    // Cancelling is a normal outcome, not an error: stay silent.
    if (result.canceled) return { photos: [] };

    const assets = result.assets ?? [];
    if (assets.length === 0) return { photos: [] };

    const photos = await Promise.all(
      assets.map((asset, index) => compress(asset.uri, index)),
    );

    return { photos };
  } catch (error) {
    const pending = await recoverPendingResult();
    if (pending && 'canceled' in pending && !pending.canceled && pending.assets.length) {
      const photos = await Promise.all(
        pending.assets.map((asset, index) => compress(asset.uri, index)),
      );
      return { photos };
    }

    Alert.alert('Could not add photos', toErrorMessage(error));
    return { photos: [] };
  }
}

/** Opens the camera or library choice, matching the app's existing Alert style. */
export function promptForPhotoSource(onPick: (source: PhotoSource) => void) {
  Alert.alert('Add a photo', 'Attach a picture so the landlord can see the issue.', [
    { text: 'Take a photo', onPress: () => onPick('camera') },
    { text: 'Choose from library', onPress: () => onPick('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
