import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Camera, ImagePlus, TriangleAlert, X } from 'lucide-react-native';

import { MAINTENANCE_LIMITS } from '@/api/maintenance';
import { DetailHeader } from '@/components/common/detail-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useCreateMaintenanceTicket } from '@/hooks/queries/use-maintenance';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/axios';
import { pickMaintenancePhotos, promptForPhotoSource } from '@/lib/maintenance-photos';
import type { StagedPhoto } from '@/api/types';

export default function ReportMaintenanceScreen() {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [picking, setPicking] = useState(false);
  const [touched, setTouched] = useState(false);

  const createTicket = useCreateMaintenanceTicket();
  const { visible, message, type, showToast, hideToast } = useToast();

  const trimmed = description.trim();
  const remaining = MAINTENANCE_LIMITS.maxPhotos - photos.length;
  const descriptionError =
    touched && trimmed.length === 0 ? 'Please describe what is wrong' : null;

  const addPhotos = useCallback(
    async (source: 'camera' | 'library') => {
      setPicking(true);
      try {
        const result = await pickMaintenancePhotos(source, remaining);
        if (result.photos.length) {
          setPhotos((current) => [...current, ...result.photos].slice(0, MAINTENANCE_LIMITS.maxPhotos));
        }
      } finally {
        setPicking(false);
      }
    },
    [remaining],
  );

  const removePhoto = (id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  };

  const handleSubmit = () => {
    setTouched(true);
    if (trimmed.length === 0) return;

    createTicket.mutate(
      { description: trimmed, photos },
      {
        onSuccess: (ticket) => {
          showToast('Request sent to your landlord', 'success');
          // `replace` so the back gesture returns to the list rather than
          // re-opening this form with its photos already attached.
          router.replace(`/(tenant)/maintenance/${ticket.id}`);
        },
        onError: (error) => {
          // The axios interceptor normalises failures into ApiError, so the
          // server's own wording (413 size, 400 type, 403 not yours) is what
          // the tenant actually reads.
          const text =
            error instanceof ApiError
              ? error.message
              : 'Could not send your request. Please try again.';
          showToast(text, 'error');
        },
      },
    );
  };

  const atPhotoLimit = photos.length >= MAINTENANCE_LIMITS.maxPhotos;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader title="Report an issue" subtitle={photos.length ? undefined : 'Photos optional'} />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          {/* What happens next, up front. */}
          <View className="mb-5 flex-row items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Icon as={ImagePlus} size={18} className="text-teal-700" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-teal-900">A photo saves a trip</Text>
              <Text className="mt-0.5 text-xs leading-5 text-teal-800">
                Your landlord sees exactly what you see, so they can send the right
                person first time.
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            What&apos;s wrong?
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            onBlur={() => setTouched(true)}
            placeholder="e.g. The kitchen tap has been dripping since Monday and the cupboard underneath is damp."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            // Hard-capped at the server's limit so an over-long description is
            // impossible to submit rather than merely flagged.
            maxLength={MAINTENANCE_LIMITS.maxDescriptionLength}
            className={`rounded-2xl border bg-white p-4 text-slate-900 ${
              descriptionError ? 'border-rose-300' : 'border-slate-200'
            }`}
            style={{ minHeight: 120, fontSize: 15, lineHeight: 22 }}
          />
          <View className="mt-1.5 flex-row items-center justify-between">
            <Text className="flex-1 text-xs text-rose-600">
              {descriptionError ?? ' '}
            </Text>
            <Text
              className={`text-[11px] font-semibold ${
                description.length > MAINTENANCE_LIMITS.maxDescriptionLength * 0.9
                  ? 'text-amber-600'
                  : 'text-slate-400'
              }`}>
              {description.length}/{MAINTENANCE_LIMITS.maxDescriptionLength}
            </Text>
          </View>

          {/* Photos */}
          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Photos
            </Text>
            <Text className="text-[11px] font-semibold text-slate-400">
              {photos.length}/{MAINTENANCE_LIMITS.maxPhotos}
            </Text>
          </View>

          <View className="mt-2 flex-row flex-wrap gap-2.5">
            {photos.map((photo) => (
              <View
                key={photo.id}
                className="relative h-[84px] w-[84px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={150}
                />
                <Pressable
                  onPress={() => removePhoto(photo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-slate-900/70">
                  <Icon as={X} size={13} className="text-white" />
                </Pressable>
              </View>
            ))}

            {!atPhotoLimit ? (
              <Pressable
                onPress={() => promptForPhotoSource(addPhotos)}
                disabled={picking || createTicket.isPending}
                accessibilityRole="button"
                accessibilityLabel="Add a photo"
                className="h-[84px] w-[84px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 active:bg-teal-100">
                {picking ? (
                  <ActivityIndicator size="small" color="#0F766E" />
                ) : (
                  <>
                    <Icon as={ImagePlus} size={20} className="text-teal-700" />
                    <Text className="text-[10px] font-bold text-teal-800">Add</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          {atPhotoLimit ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <Icon as={TriangleAlert} size={12} className="text-amber-600" />
              <Text className="text-[11px] font-medium text-slate-500">
                That&apos;s the maximum. Remove one to add another.
              </Text>
            </View>
          ) : (
            <Text className="mt-2 text-[11px] font-medium text-slate-500">
              Up to {MAINTENANCE_LIMITS.maxPhotos} photos. They&apos;re compressed on your
              phone before sending.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Submit bar pinned above the safe area. */}
      <View className="border-t border-slate-200 bg-white px-5 py-3">
        <Button
          onPress={handleSubmit}
          disabled={createTicket.isPending || picking}
          className="h-12 w-full rounded-2xl bg-teal-800">
          {createTicket.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Sending…</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Icon as={Camera} size={16} className="text-white" />
              <Text className="text-sm font-bold text-white">Send request</Text>
            </View>
          )}
        </Button>
      </View>

      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
