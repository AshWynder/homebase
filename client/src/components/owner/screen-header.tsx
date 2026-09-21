import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';

interface ScreenHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
}

/** App bar with a brand mark and an optional green circular add button. */
export function ScreenHeader({ title, onAdd, addLabel = 'Add' }: ScreenHeaderProps) {
  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-md bg-teal-700">
            <Text className="text-base leading-none text-white">◇</Text>
          </View>
          <Text className="text-xl font-bold text-slate-900">Homebase</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text className="text-lg font-bold text-slate-900">{title}</Text>
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