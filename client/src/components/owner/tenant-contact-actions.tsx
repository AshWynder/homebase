import { View } from 'react-native';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';

import { ActionChip } from '@/components/owner/action-chip';
import { openExternalUrl } from '@/lib/external-link';
import { telHref, whatsappHref } from '@/lib/phone';

interface TenantContactActionsProps {
  phone?: string | null;
  email?: string | null;
  /** Used to make the accessibility labels specific, e.g. "Call John". */
  name?: string | null;
}

/**
 * The three ways an owner actually reaches a tenant. Previously this lived
 * inline in the tenancy detail and the unit detail only *displayed* the contact
 * details as read-only rows, so an owner looking at a unit could see a number
 * but not act on it. Both screens now use this.
 */
export function TenantContactActions({ phone, email, name }: TenantContactActionsProps) {
  const who = name?.trim() || 'your tenant';
  const tel = telHref(phone);
  const wa = whatsappHref(phone);

  return (
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
  );
}
