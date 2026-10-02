import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/** Back-navigating app bar for screens pushed above the tabs. */
export function DetailHeader({ title, subtitle, onBack }: DetailHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
        <Icon as={ArrowLeft} size={18} className="text-slate-800" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
