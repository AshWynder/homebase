import { Alert, Linking } from 'react-native';

/**
 * Opens an external URL (dialler, mail client, WhatsApp) without letting a
 * failure surface as an unhandled rejection.
 *
 * `Linking.canOpenURL` is a check, not a guarantee: a device with no WhatsApp
 * installed reports `false` for the deep link, and `openURL` can still throw.
 * Both paths therefore end in a user-visible alert rather than a dead tap.
 */
export async function openExternalUrl(
  url: string,
  options: { unavailableMessage?: string } = {},
): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Not available', options.unavailableMessage ?? 'This action is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn't open link",
      options.unavailableMessage ?? 'Something went wrong opening that link. Please try again.',
    );
  }
}
