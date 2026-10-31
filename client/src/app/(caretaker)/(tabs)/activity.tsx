import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FileMinus, Megaphone, MessageSquare, Settings, Wrench } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ActivityCard } from '@/components/activity/activity-card';
import { useUnreadTotal } from '@/hooks/queries/use-chat';
import { useSentNotices } from '@/hooks/queries/use-notices';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useMaintenanceStatusCounts } from '@/hooks/queries/use-maintenance';
import { runRefresh } from '@/lib/refresh';
import { activityDestinations } from '@/lib/activity';
import { lightColors, obsidianColors } from '@/theme/colors';

const styles = StyleSheet.create({
  settingsButton: {
    backgroundColor: lightColors.container,
  },
  needsReview: {
    backgroundColor: lightColors.needsReviewBg,
    borderColor: lightColors.needsReviewBorder,
  },
  needsReviewDot: {
    backgroundColor: lightColors.needsReviewDot,
  },
  needsReviewText: {
    color: lightColors.needsReviewText,
  },
  darkContainer: {
    backgroundColor: obsidianColors.dark.background,
  },
  darkSettings: {
    backgroundColor: obsidianColors.dark.settingsBg,
    borderColor: obsidianColors.dark.settingsBorder,
    borderWidth: 1,
  },
  darkNeedsReview: {
    backgroundColor: obsidianColors.dark.needsReviewBg,
    borderColor: obsidianColors.dark.needsReviewBorder,
  },
  darkNeedsReviewDot: {
    backgroundColor: obsidianColors.dark.needsReviewDot,
  },
  darkNeedsReviewText: {
    color: obsidianColors.dark.needsReviewText,
  },
  titleText: {
    color: obsidianColors.dark.textPrimary,
  },
  subtitleText: {
    color: obsidianColors.dark.textSecondary,
  },
  selectorText: {
    color: obsidianColors.dark.textSecondary,
    letterSpacing: 1.2,
  },
});

export default function CaretakerActivityScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = obsidianColors.dark;

  const noticesQuery = useSentNotices({});
  const moveOutQuery = useTenancies({ isActive: false });
  const chatsUnread = useUnreadTotal();
  const maintenanceCounts = useMaintenanceStatusCounts();

  useFocusEffect(
    useCallback(() => {
      noticesQuery.refetch();
      moveOutQuery.refetch();
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    runRefresh([noticesQuery.refetch(), moveOutQuery.refetch()], setRefreshing);
  }, [noticesQuery, moveOutQuery]);

  const maintenanceActiveCount =
    (maintenanceCounts.byStatus?.OPEN ?? 0) + (maintenanceCounts.byStatus?.IN_PROGRESS ?? 0);

  const leaseNoticesCount = useMemo(() => {
    const items = moveOutQuery.data?.items ?? [];
    if (!items.length) {
      return moveOutQuery.data?.total ?? 0;
    }
    const actionable = items.filter((item: any) => {
      return item.terminationRequestedAt || item.terminationReason || !item.isActive;
    });
    return actionable.length;
  }, [moveOutQuery.data]);

  const announcementsCount = noticesQuery.data?.pages?.[0]?.total ?? 0;
  const hasUnreadMessages = (chatsUnread ?? 0) > 0;

  const needsReviewCount = leaseNoticesCount + announcementsCount;
  const showNeedsReview = needsReviewCount > 0;

  const destinations = activityDestinations('/(caretaker)/');

  if (!isDark) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="px-5 pb-3 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">Activity Hub</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Inbox, requests & operations center</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
              style={styles.settingsButton}
            >
              <Icon as={Settings} size={20} color={lightColors.textBody} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10 gap-3"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View className="mb-1 mt-1 flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Action Centers & Inbox
            </Text>
            {showNeedsReview ? (
              <View className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1" style={styles.needsReview}>
                <View className="h-1.5 w-1.5 rounded-full" style={styles.needsReviewDot} />
                <Text className="text-[11px] font-bold" style={styles.needsReviewText}>
                  {needsReviewCount > 99 ? '99+' : needsReviewCount} Needs Review
                </Text>
              </View>
            ) : null}
          </View>

          <ActivityCard
            icon={Wrench}
            iconBackgroundColor={lightColors.peach}
            iconColor={lightColors.brown}
            title="Maintenance"
            description="Open repair requests & work orders"
            badge={
              maintenanceActiveCount > 0
                ? {
                    type: 'count',
                    count: maintenanceActiveCount,
                    variant: 'amberDark',
                    bg: lightColors.peach,
                    border: lightColors.peachBorder,
                    text: lightColors.brown,
                  }
                : { type: 'none' }
            }
            cardBackgroundColor={lightColors.surface}
            cardBorderColor={lightColors.border}
            chevronColor={lightColors.textMuted}
            titleColor={lightColors.text}
            descriptionColor={lightColors.textBody}
            onPress={() => router.push(destinations.find((d) => d.kind === 'maintenance')?.href || '/(caretaker)/maintenance')}
          />

          <ActivityCard
            icon={FileMinus}
            iconBackgroundColor={lightColors.roseTile}
            iconColor={lightColors.danger}
            title="Lease Notices"
            description="Vacate alerts & expiring leases"
            badge={leaseNoticesCount > 0 ? { type: 'count', count: leaseNoticesCount, variant: 'emeraldSolid', bg: lightColors.primaryDeep, text: lightColors.primaryOn } : { type: 'none' }}
            cardBackgroundColor={lightColors.surface}
            cardBorderColor={lightColors.border}
            chevronColor={lightColors.textMuted}
            titleColor={lightColors.text}
            descriptionColor={lightColors.textBody}
            onPress={() => router.push(destinations.find((d) => d.kind === 'tenancy_notices')?.href || '/(caretaker)/tenancy')}
          />

          <ActivityCard
            icon={Megaphone}
            iconBackgroundColor={lightColors.mintTile}
            iconColor={lightColors.primaryDeep}
            title="Announcements"
            description="Broadcasts & community updates"
            badge={announcementsCount > 0 ? { type: 'count', count: announcementsCount, variant: 'emeraldSolid', bg: lightColors.primaryDeep, text: lightColors.primaryOn } : { type: 'none' }}
            cardBackgroundColor={lightColors.surface}
            cardBorderColor={lightColors.border}
            chevronColor={lightColors.textMuted}
            titleColor={lightColors.text}
            descriptionColor={lightColors.textBody}
            onPress={() => router.push(destinations.find((d) => d.kind === 'notices')?.href || '/(caretaker)/notices')}
          />

          <ActivityCard
            icon={MessageSquare}
            iconBackgroundColor={lightColors.blueTile}
            iconColor={lightColors.blueIcon}
            title="Messages"
            description="Direct tenant & property chats"
            badge={{ type: 'dot', visible: hasUnreadMessages, dotColor: lightColors.primaryDeep, dotGlow: true }}
            cardBackgroundColor={lightColors.surface}
            cardBorderColor={lightColors.border}
            chevronColor={lightColors.textMuted}
            titleColor={lightColors.text}
            descriptionColor={lightColors.textBody}
            onPress={() => router.push(destinations.find((d) => d.kind === 'chats')?.href || '/(caretaker)/chats')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={styles.darkContainer} edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold" style={styles.titleText}>
              Activity Hub
            </Text>
            <Text className="text-xs mt-0.5" style={styles.subtitleText}>
              Inbox, requests & operations center
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            className="h-10 w-10 items-center justify-center rounded-full"
            style={styles.darkSettings}
          >
            <Icon as={Settings} size={20} color={c.iconGear} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-center justify-between mb-1 mt-1">
          <Text className="text-[11px] font-medium uppercase tracking-widest" style={styles.selectorText}>
            Action Centers & Inbox
          </Text>
          {showNeedsReview ? (
            <View className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1" style={styles.darkNeedsReview}>
              <View className="h-1.5 w-1.5 rounded-full" style={styles.darkNeedsReviewDot} />
              <Text className="text-[11px] font-medium" style={styles.darkNeedsReviewText}>
                {needsReviewCount > 99 ? '99+' : needsReviewCount} Needs Review
              </Text>
            </View>
          ) : null}
        </View>

        <ActivityCard
          icon={Wrench}
          iconBackgroundColor={c.maintenance.tileBg}
          iconColor={c.maintenance.tint}
          iconBorderColor={c.maintenance.tileBorder}
          title="Maintenance"
          description="Open repair requests & work orders"
          titleColor={c.textPrimary}
          descriptionColor={c.textSecondary}
          badge={
            maintenanceActiveCount > 0
              ? { type: 'count', count: maintenanceActiveCount, variant: 'amberDark', bg: c.maintenance.badgeBg, border: c.maintenance.badgeBorder, text: c.maintenance.badgeText }
              : { type: 'none' }
          }
          chevronColor={c.chevron}
          cardBackgroundColor={c.surface}
          cardBorderColor={c.border}
          onPress={() => router.push(destinations.find((d) => d.kind === 'maintenance')?.href || '/(caretaker)/maintenance')}
        />

        <ActivityCard
          icon={FileMinus}
          iconBackgroundColor={c.lease.tileBg}
          iconColor={c.lease.tint}
          iconBorderColor={c.lease.tileBorder}
          title="Lease Notices"
          description="Vacate alerts & expiring leases"
          titleColor={c.textPrimary}
          descriptionColor={c.textSecondary}
          badge={leaseNoticesCount > 0 ? { type: 'count', count: leaseNoticesCount, variant: 'emeraldSolid', bg: c.emerald.solid, text: c.emerald.solidText } : { type: 'none' }}
          chevronColor={c.chevron}
          cardBackgroundColor={c.surface}
          cardBorderColor={c.border}
          onPress={() => router.push(destinations.find((d) => d.kind === 'tenancy_notices')?.href || '/(caretaker)/tenancy')}
        />

        <ActivityCard
          icon={Megaphone}
          iconBackgroundColor={c.announcements.tileBg}
          iconColor={c.announcements.tint}
          iconBorderColor={c.announcements.tileBorder}
          title="Announcements"
          description="Broadcasts & community updates"
          titleColor={c.textPrimary}
          descriptionColor={c.textSecondary}
          badge={announcementsCount > 0 ? { type: 'count', count: announcementsCount, variant: 'emeraldSolid', bg: c.emerald.solid, text: c.emerald.solidText } : { type: 'none' }}
          chevronColor={c.chevron}
          cardBackgroundColor={c.surface}
          cardBorderColor={c.border}
          onPress={() => router.push(destinations.find((d) => d.kind === 'notices')?.href || '/(caretaker)/notices')}
        />

        <ActivityCard
          icon={MessageSquare}
          iconBackgroundColor={c.messages.tileBg}
          iconColor={c.messages.tint}
          iconBorderColor={c.messages.tileBorder}
          title="Messages"
          description="Direct tenant & property chats"
          titleColor={c.textPrimary}
          descriptionColor={c.textSecondary}
          badge={{ type: 'dot', visible: hasUnreadMessages, dotColor: c.emerald.dot, dotGlow: true }}
          chevronColor={c.chevron}
          cardBackgroundColor={c.surface}
          cardBorderColor={c.border}
          onPress={() => router.push(destinations.find((d) => d.kind === 'chats')?.href || '/(caretaker)/chats')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
