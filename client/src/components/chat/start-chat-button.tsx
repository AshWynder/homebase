import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { MessageSquare, Users } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  useStartDirectChat,
  useStartGroupChat,
} from '@/hooks/queries/use-start-chat';
import { cn } from '@/lib/utils';

interface StartChatButtonProps {
  /**
   * Where a failure goes.
   *
   * Defaults to a native alert rather than a toast: these buttons live in headers
   * and list rows on screens that mostly render no `<Toast>` at all, and raising
   * a toast here would silently appear nowhere on those screens. A screen that
   * already has one can pass `showToast` instead.
   */
  onError?: (message: string) => void;
  accessibilityLabel?: string;
  className?: string;
  /**
   * `chip`  — a full-width primary action in a column; the parent stretches it.
   * `block` — same height, explicitly sized by the caller for a row of siblings.
   * `header` — the compact header pill.
   */
  variant?: 'chip' | 'block' | 'header';
}

function useErrorReporter(onError?: (message: string) => void) {
  return (message: string) => {
    if (onError) {
      onError(message);
      return;
    }
    Alert.alert('Could not open chat', message);
  };
}

/**
 * Opens a property's group thread.
 *
 * There is no "does this thread exist" state to check: the server creates it on
 * first open and seats the property's staff and current residents, so the button
 * is never disabled for a reason the caller could have known in advance. It is
 * disabled only while the request is in flight, because a double tap here is
 * two navigations.
 */
export function StartGroupChatButton({
  propertyId,
  label = 'Group chat',
  onError,
  accessibilityLabel = 'Open the group chat for this property',
  className,
}: StartChatButtonProps & { propertyId: string; label?: string }) {
  const report = useErrorReporter(onError);
  const { start, isPending } = useStartGroupChat({ onError: report });

  return (
    <Pressable
      onPress={() => start(propertyId)}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isPending, busy: isPending }}
      hitSlop={12}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-full bg-teal-50 px-3 active:bg-teal-100',
        isPending && 'opacity-50',
        className,
      )}>
      {isPending ? (
        <ActivityIndicator size="small" color="#0F766E" />
      ) : (
        <Icon as={Users} size={16} className="text-teal-800" />
      )}
      <Text className="text-xs font-bold text-teal-900">{label}</Text>
    </Pressable>
  );
}

/**
 * Opens the direct thread with one person.
 *
 * Rendered only where a specific counterpart is already in view — a tenancy, a
 * unit, the author of a notice — so it is never offered for someone the server
 * would refuse. `profileId` is still optional because those screens render while
 * their query is loading, and a button that is briefly disabled is better than
 * one that is briefly wrong.
 */
export function StartDirectChatButton({
  profileId,
  name,
  onError,
  accessibilityLabel,
  className,
  variant = 'chip',
}: StartChatButtonProps & {
  profileId: string | null | undefined;
  /** Used for the accessibility label, e.g. "Message Jane Smith". */
  name?: string | null;
}) {
  const report = useErrorReporter(onError);
  const { start, isPending } = useStartDirectChat({ onError: report });
  const who = name?.trim();
  const label = accessibilityLabel ?? (who ? `Message ${who}` : 'Start a direct chat');
  const disabled = isPending || !profileId;

  const button = (
    <Pressable
      onPress={() => profileId && start(profileId)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: isPending }}
      hitSlop={12}
      className={cn(
        variant === 'header'
          ? 'h-9 flex-row items-center gap-1.5 rounded-full bg-teal-50 px-3 active:bg-teal-100'
          : cn(
              'min-h-11 flex-row items-center justify-center gap-1.5 rounded-2xl bg-teal-50 px-2 py-2.5',
              // Inside a row of siblings the chips share the width evenly; in a
              // column the parent stretches the child and `flex-1` does nothing.
              variant === 'block' && 'flex-1',
            ),
        disabled && 'opacity-40',
        className,
      )}>
      {isPending ? (
        <ActivityIndicator size="small" color="#0F766E" />
      ) : (
        <Icon as={MessageSquare} size={15} className="text-teal-800" />
      )}
      <Text className="text-xs font-semibold text-teal-900" numberOfLines={1}>
        Message
      </Text>
    </Pressable>
  );

  return variant === 'block' ? <View className="flex-1">{button}</View> : button;
}