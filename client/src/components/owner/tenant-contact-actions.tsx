import { View } from 'react-native';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';

import { StartDirectChatButton } from '@/components/chat/start-chat-button';
import { ActionChip } from '@/components/owner/action-chip';
import { openExternalUrl } from '@/lib/external-link';
import { telHref, whatsappHref } from '@/lib/phone';

interface TenantContactActionsProps {
  phone?: string | null;
  email?: string | null;
  /** Used to make the accessibility labels specific, e.g. "Call John". */
  name?: string | null;
  /**
   * The tenant's profile id, which enables the in-app Message button.
   *
   * Optional because these actions also render before the tenancy query resolves.
   * Without it the three external channels still work — a phone number does not
   * need a profile — and Message is simply absent rather than present-and-broken.
   */
  profileId?: string | null;
}

/**
 * How an owner reaches a tenant: one in-app channel and three that leave the app.
 *
 * Message gets its own full-width row above the external chips rather than
 * sitting beside them as a fourth. Four equal chips truncate their labels on a
 * narrow phone — "WhatsApp" goes first — and the in-app channel is the one worth
 * keeping legible: it is the only one that leaves the conversation attached to
 * the tenancy record instead of ending it in a dialler.
 */
export function TenantContactActions({
  phone,
  email,
  name,
  profileId,
}: TenantContactActionsProps) {
  const who = name?.trim() || 'your tenant';
  const tel = telHref(phone);
  const wa = whatsappHref(phone);

  return (
    <View className="gap-2">
      {profileId ? (
        <StartDirectChatButton
          profileId={profileId}
          name={name}
          accessibilityLabel={`Message ${who} in Homebase`}
        />
      ) : null}

      <View className="flex-row gap-2">
        <ActionChip
          icon={Phone}
          label="Call"
          disabled={!tel}
          accessibilityLabel={tel ? `Call ${who} on ${phone}` : `Call ${who}, no number on file`}
          onPress={() => {
            if (tel) void openExternalUrl(tel, { unavailableMessage: 'This device cannot place calls.' });
          }}
        />
        <ActionChip
          icon={Mail}
          label="Email"
          disabled={!email}
          accessibilityLabel={email ? `Email ${who} at ${email}` : `Email ${who}, no address on file`}
          onPress={() => {
            if (email) {
              void openExternalUrl(`mailto:${email}`, {
                unavailableMessage: 'This device has no mail app set up.',
              });
            }
          }}
        />
        <ActionChip
          icon={MessageCircle}
          label="WhatsApp"
          disabled={!wa}
          accessibilityLabel={
            wa ? `WhatsApp ${who} on ${phone}` : `WhatsApp ${who}, no number on file`
          }
          onPress={() => {
            if (wa) {
              void openExternalUrl(wa, { unavailableMessage: 'WhatsApp is not installed on this device.' });
            }
          }}
        />
      </View>
    </View>
  );
}
