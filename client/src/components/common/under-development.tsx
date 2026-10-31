import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hammer } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { DetailHeader } from '@/components/common/detail-header';

interface UnderDevelopmentProps {
  title?: string;
}

export function UnderDevelopment({ title = 'Under Development' }: UnderDevelopmentProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <DetailHeader title={title} />
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="h-16 w-16 items-center justify-center rounded-full mb-4 bg-warning/10 dark:bg-warning/20">
          <Icon as={Hammer} size={28} className="text-warning" />
        </View>
        <Text className="text-lg font-bold text-center mb-2 text-foreground">
          Under Development
        </Text>
        <Text className="text-sm text-center text-muted-foreground">
          This feature is currently under development.
        </Text>
      </View>
    </SafeAreaView>
  );
}
