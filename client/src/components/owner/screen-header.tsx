import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';

interface ScreenHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
}

/** App bar with the screen title and an optional green circular add button. */
export function ScreenHeader({ title, onAdd, addLabel = 'Add' }: ScreenHeaderProps) {
  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row items-center justify-between px-5 py-3">
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