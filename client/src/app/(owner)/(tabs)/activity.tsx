import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Text } from '@/components/ui/text';
import { ACTIVITY_DESTINATIONS } from '@/lib/activity';

export default function ActivityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Activity" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {ACTIVITY_DESTINATIONS.map((destination) => (
          <Pressable
            key={destination.kind}
            onPress={() => router.push(destination.href)}
            accessibilityRole="button"
            accessibilityLabel={`${destination.title}. ${destination.description}`}
            className="flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <Icon as={destination.icon} size={20} className="text-teal-700" />
            </View>

            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold text-slate-900">
                {destination.title}
              </Text>
              <Text className="text-xs text-slate-500">{destination.description}</Text>
            </View>

            {destination.count > 0 ? (
              <View className="min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5">
                <Text className="text-xs font-bold text-white">{destination.count}</Text>
              </View>
            ) : null}

            <Icon as={ChevronRight} size={18} className="text-slate-400" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
