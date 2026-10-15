import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Text } from '@/components/ui/text';
import { useUnreadTotal } from '@/hooks/queries/use-chat';
import { useSentNotices } from '@/hooks/queries/use-notices';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { ACTIVITY_DESTINATIONS } from '@/lib/activity';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; iconBg: string; iconColor: string }> = {
  maintenance: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  tenancy_notices: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  notices: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  chats: {
    bg: 'bg-info/10',
    text: 'text-info',
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
  },
};

export default function ActivityScreen() {
  const noticesQuery = useSentNotices({});
  const moveOutQuery = useTenancies({ isActive: false, limit: 1 });
  const chatsUnread = useUnreadTotal();
  const counts: Partial<Record<(typeof ACTIVITY_DESTINATIONS)[number]['kind'], number>> = {
    tenancy_notices: moveOutQuery.data?.total,
    notices: noticesQuery.data?.pages[0]?.total,
    chats: chatsUnread,
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Activity Hub" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-10 gap-3"
        showsVerticalScrollIndicator={false}>
        <View className="mb-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Action Centers & Inbox
          </Text>
        </View>

        {ACTIVITY_DESTINATIONS.map((destination) => {
          const liveCount = counts[destination.kind];
          const count = liveCount ?? destination.count ?? 0;
          const visual = CATEGORY_COLORS[destination.kind] || CATEGORY_COLORS.notices;

          return (
            <Pressable
              key={destination.kind}
              onPress={() => router.push(destination.href)}
              accessibilityRole="button"
              accessibilityLabel={`${destination.title}. ${destination.description}`}
              className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card p-4 active:bg-muted shadow-sm shadow-black/5">
              <View className={`h-11 w-11 items-center justify-center rounded-xl ${visual.iconBg}`}>
                <Icon as={destination.icon} size={20} className={visual.iconColor} />
              </View>

              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-foreground">
                    {destination.title}
                  </Text>
                  <View className={`rounded-md px-1.5 py-0.5 ${visual.bg}`}>
                    <Text className={`text-[10px] font-bold ${visual.text}`}>
                      {destination.category}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">{destination.description}</Text>
              </View>

              {count > 0 ? (
                <View className="min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5">
                  <Text className="text-xs font-bold text-primary-foreground">{count}</Text>
                </View>
              ) : null}

              <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
