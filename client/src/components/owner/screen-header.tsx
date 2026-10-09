import { router } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface ScreenHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
}

/** App bar with the screen title and an optional green circular add button. */
export function ScreenHeader({
  title,
  onAdd,
  addLabel = 'Add',
  showBack = false,
  onBack,
}: ScreenHeaderProps) {
  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row items-center gap-3 px-5 py-3">
        {showBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
            <Icon as={ArrowLeft} size={17} className="text-slate-800" />
          </Pressable>
        ) : null}

        <Text className="flex-1 text-lg font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>

        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityLabel={addLabel}
            className="h-8 w-8 items-center justify-center rounded-full bg-teal-700 active:bg-teal-800">
            <Icon as={Plus} size={18} className="text-white" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
