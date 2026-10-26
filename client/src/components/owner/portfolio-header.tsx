import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface PortfolioHeaderProps {
  /** Full display name; the first name drives the greeting and the avatar. */
  name?: string | null;
  onAdd?: () => void;
  addLabel?: string;
}

/**
 * Greeting header for the owner overview: an avatar with a presence dot, the
 * greeting and the circular add button.
 *
 * The ring around the presence dot is painted with the same surface colour the
 * Portfolio screen uses (`#f1f5f4`) so the dot reads as sitting on the
 * background rather than inside the avatar.
 */
export function PortfolioHeader({
  name,
  onAdd,
  addLabel = 'Add property',
}: PortfolioHeaderProps) {
  const firstName = name?.trim().split(/\s+/)[0] ?? '';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <View className="flex-row items-center gap-3 px-4 pb-1 pt-3">
      <View className="relative">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Text className="text-base font-bold text-primary-foreground">
            {initial}
          </Text>
        </View>
        <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f1f5f4] bg-success" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {firstName ? `Hello ${firstName} 👋` : 'Portfolio'}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          Your portfolio at a glance
        </Text>
      </View>

      {onAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-90">
          <Icon as={Plus} size={20} className="text-primary-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
