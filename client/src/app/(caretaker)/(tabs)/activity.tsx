import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Text } from '@/components/ui/text';
import { useUnreadTotal } from '@/hooks/queries/use-chat';
import { useSentNotices } from '@/hooks/queries/use-notices';
import { activityDestinations } from '@/lib/activity';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; iconBg: string; iconColor: string }> = {
  maintenance: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  tenancy_notices: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
  },
  notices: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
  chats: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
  },
};

export default function CaretakerActivityScreen() {
  const noticesQuery = useSentNotices({});
  const chatsUnread = useUnreadTotal();
  const counts: Partial<Record<string, number>> = {
    notices: noticesQuery.data?.pages[0]?.total,
    chats: chatsUnread,
  };

  const destinations = activityDestinations('/(caretaker)/');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Activity Hub" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View className="mb-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Action Centers & Inbox
          </Text>
        </View>

        {destinations.map((destination) => {
          const liveCount = counts[destination.kind];
          const count = liveCount ?? destination.count ?? 0;
          const visual = CATEGORY_COLORS[destination.kind] || CATEGORY_COLORS.notices;

          return (
            <Pressable
              key={destination.kind}
              onPress={() => router.push(destination.href)}
              accessibilityRole="button"
              accessibilityLabel={`${destination.title}. ${destination.description}`}
              className="flex-row items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50 shadow-sm shadow-slate-100">
              <View className={`h-11 w-11 items-center justify-center rounded-xl ${visual.iconBg}`}>
                <Icon as={destination.icon} size={20} className={visual.iconColor} />
              </View>

              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-slate-900">
                    {destination.title}
                  </Text>
                  <View className={`rounded-md px-1.5 py-0.5 ${visual.bg}`}>
                    <Text className={`text-[10px] font-bold ${visual.text}`}>
                      {destination.category}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500">{destination.description}</Text>
              </View>

              {count > 0 ? (
                <View className="min-w-6 items-center justify-center rounded-full bg-teal-700 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">{count}</Text>
                </View>
              ) : null}

              <Icon as={ChevronRight} size={18} className="text-slate-400" />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
