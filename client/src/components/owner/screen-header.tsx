import { router } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
}

/** App bar with the screen title and an optional green circular add button. */
export function ScreenHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Add',
  showBack = false,
  onBack,
}: ScreenHeaderProps) {
  return (
    <View className="bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3">
        {showBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-8 w-8 items-center justify-center rounded-full bg-muted active:bg-accent">
            <Icon as={ArrowLeft} size={17} className="text-foreground" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
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
    </View>
  );
}
