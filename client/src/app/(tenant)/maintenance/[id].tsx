import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Building2, CalendarClock, CheckCircle2, ImageOff, Wrench } from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import {
  MaintenanceStatusTracker,
} from '@/components/tenant/maintenance-status';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMaintenanceTicket } from '@/hooks/queries/use-maintenance';
import { formatDateTime, shortId } from '@/lib/format';
import { runRefresh } from '@/lib/refresh';

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so an inline literal re-dispatches from inside the render phase and hangs the app.
const styles = StyleSheet.create({
  photo: { width: 148, height: 148 },
});

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketQuery = useMaintenanceTicket(String(id ?? ''));

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    () => runRefresh([ticketQuery.refetch()], setRefreshing),
    [ticketQuery],
  );

  const ticket = ticketQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <DetailHeader
        title="Request"
        subtitle={ticket ? shortId(ticket.id) : undefined}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {ticketQuery.isPending ? (
          <View className="gap-3 p-5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </View>
        ) : ticketQuery.isError || !ticket ? (
          // A ticket the caller may not see is reported as 404 rather than 403,
          // so this covers both "gone" and "not yours" in one honest message.
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
              <Icon as={Wrench} size={28} className="text-muted-foreground" />
            </View>
            <Text className="text-center text-base font-bold text-foreground">
              Request not found
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-muted-foreground">
              It may have been removed, or the link may be out of date.
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              className="mt-5 rounded-xl bg-primary px-5 py-2.5">
              <Text className="text-xs font-bold text-primary-foreground">Go back</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4 p-5">
            {/* Status */}
            <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <MaintenanceStatusTracker
                status={ticket.status}
                createdAt={ticket.createdAt}
                resolvedAt={ticket.resolvedAt}
              />
              {ticket.status === 'RESOLVED' && ticket.resolvedAt ? (
                <View className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5">
                  <Icon as={CheckCircle2} size={15} className="text-success" />
                  <Text className="text-xs font-semibold text-success">
                    Fixed {formatDateTime(ticket.resolvedAt)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* What was reported */}
            <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground">
                What you reported
              </Text>
              <Text className="text-[15px] leading-6 text-foreground">{ticket.description}</Text>
            </View>

            {/* Photos */}
            {ticket.photoUrls.length > 0 ? (
              <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
                <Text className="mb-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Photos ({ticket.photoUrls.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2.5">
                  {ticket.photoUrls.map((url) => (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={styles.photo}
                      contentFit="cover"
                      transition={200}
                      className="rounded-xl bg-muted"
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View className="flex-row items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4">
                <Icon as={ImageOff} size={18} className="text-muted-foreground" />
                <Text className="flex-1 text-xs text-muted-foreground">
                  No photos were attached to this request.
                </Text>
              </View>
            )}

            {/* Details */}
            <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <MetaRow
                icon={CalendarClock}
                label="Reported"
                value={formatDateTime(ticket.createdAt)}
              />
              {ticket.unit ? (
                <MetaRow
                  icon={Building2}
                  label="Unit"
                  value={[
                    ticket.unit.unitNumber,
                    ticket.unit.property?.name,
                    ticket.unit.property?.address,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                />
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon as={icon} size={15} className="text-muted-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium text-muted-foreground">{label}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}
