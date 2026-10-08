import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ImageOff,
  MessageSquareText,
  Wrench,
} from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import { MaintenanceStatusTracker } from '@/components/tenant/maintenance-status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useMaintenanceTicket,
  useUpdateMaintenanceTicket,
} from '@/hooks/queries/use-maintenance';
import { formatDateTime, shortId } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast';
import type { MaintenanceStatus } from '@/api/types';

/**
 * The status moves a caretaker can make from this ticket's current position.
 *
 * OPEN skips straight to RESOLVED as well: sometimes the tenant's report was
 * already fixed by the time the caretaker opens it, and forcing a detour
 * through IN_PROGRESS would just create a fake trail.
 */
function availableActions(current: MaintenanceStatus): {
  status: MaintenanceStatus;
  label: string;
  /** Button variant for the primary action. */
  tone: 'default' | 'outline';
}[] {
  switch (current) {
    case 'OPEN':
      return [
        { status: 'IN_PROGRESS', label: 'Start work', tone: 'default' },
        { status: 'RESOLVED', label: 'Mark resolved', tone: 'outline' },
      ];
    case 'IN_PROGRESS':
      return [
        { status: 'RESOLVED', label: 'Mark resolved', tone: 'default' },
        { status: 'OPEN', label: 'Reopen', tone: 'outline' },
      ];
    case 'RESOLVED':
      return [{ status: 'OPEN', label: 'Reopen', tone: 'outline' }];
  }
}

/**
 * One ticket, with the caretaker's write actions.
 *
 * The server requires remarks whenever the status moves to IN_PROGRESS or
 * RESOLVED, so the remarks box is shown whenever such an action is available
 * and validated here before the mutation fires — the request-side check exists,
 * but failing it after a round trip would feel like a bug to the caretaker.
 */
export default function CaretakerMaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketQuery = useMaintenanceTicket(String(id ?? ''));
  const updateTicket = useUpdateMaintenanceTicket();
  const { visible, message, type, showToast, hideToast } = useToast();

  const [pendingStatus, setPendingStatus] = useState<MaintenanceStatus | null>(null);
  const [remarks, setRemarks] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ticketQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [ticketQuery]);

  const ticket = ticketQuery.data;
  const actions = ticket ? availableActions(ticket.status) : [];
  const remarksRequired =
    pendingStatus === 'IN_PROGRESS' || pendingStatus === 'RESOLVED';

  const submitStatus = () => {
    if (!ticket || !pendingStatus) return;
    if (remarksRequired && !remarks.trim()) {
      showToast('Add a short remark before changing the status', 'error');
      return;
    }

    updateTicket.mutate(
      {
        id: ticket.id,
        input: {
          status: pendingStatus,
          ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setPendingStatus(null);
          setRemarks('');
          showToast('Ticket updated');
        },
        onError: (error) => showToast(error.message, 'error'),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader
        title="Ticket"
        subtitle={ticket ? shortId(ticket.id) : undefined}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
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
            <View className="items-center px-8 py-20">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
                <Icon as={Wrench} size={28} className="text-slate-400" />
              </View>
              <Text className="text-center text-base font-bold text-slate-800">
                Ticket not found
              </Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                It may have been removed, or the link may be out of date.
              </Text>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                className="mt-5 rounded-xl bg-teal-800 px-5 py-2.5">
                <Text className="text-xs font-bold text-white">Go back</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4 p-5">
              {/* Status */}
              <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <MaintenanceStatusTracker
                  status={ticket.status}
                  createdAt={ticket.createdAt}
                  resolvedAt={ticket.resolvedAt}
                />
                {ticket.status === 'RESOLVED' && ticket.resolvedAt ? (
                  <View className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5">
                    <Icon as={CheckCircle2} size={15} className="text-emerald-600" />
                    <Text className="text-xs font-semibold text-emerald-700">
                      Fixed {formatDateTime(ticket.resolvedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Reported */}
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  What was reported
                </Text>
                <Text className="text-[15px] leading-6 text-slate-800">
                  {ticket.description}
                </Text>

                {ticket.tenant?.user?.name ? (
                  <View className="flex-row items-center gap-2 border-t border-slate-100 pt-3">
                    <Text className="text-xs text-slate-500">Reported by</Text>
                    <Text className="text-xs font-semibold text-slate-700">
                      {ticket.tenant.user.name}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Remarks */}
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <View className="flex-row items-center gap-2">
                  <Icon as={MessageSquareText} size={15} className="text-slate-500" />
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Remarks
                  </Text>
                </View>
                {ticket.remarks ? (
                  <Text className="text-[15px] leading-6 text-slate-800">
                    {ticket.remarks}
                  </Text>
                ) : (
                  <Text className="text-sm text-slate-400">
                    No remarks yet. Add one when you change the status.
                  </Text>
                )}
              </View>

              {/* Photos */}
              {ticket.photoUrls.length > 0 ? (
                <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                  <Text className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Photos ({ticket.photoUrls.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}>
                    {ticket.photoUrls.map((url) => (
                      <Image
                        key={url}
                        source={{ uri: url }}
                        style={{ width: 148, height: 148 }}
                        contentFit="cover"
                        transition={200}
                        className="rounded-xl bg-slate-100"
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <Icon as={ImageOff} size={18} className="text-slate-400" />
                  <Text className="flex-1 text-xs text-slate-500">
                    No photos were attached to this ticket.
                  </Text>
                </View>
              )}

              {/* Details */}
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
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

              {/* Status actions */}
              {pendingStatus ? (
                <View className="gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
                  <Text className="text-sm font-bold text-teal-900">
                    {pendingStatus === 'OPEN'
                      ? 'Reopen this ticket?'
                      : pendingStatus === 'IN_PROGRESS'
                        ? 'Starting work'
                        : 'Marking as resolved'}
                  </Text>

                  <View>
                    <Text className="mb-1.5 text-xs font-medium text-slate-600">
                      Remark{remarksRequired ? ' (required)' : ' (optional)'}
                    </Text>
                    <MultipleLineRemarkInput value={remarks} onChange={setRemarks} />
                    {remarksRequired && !remarks.trim() ? (
                      <Text className="mt-1 text-[11px] text-rose-600">
                        The server requires a remark for this status.
                      </Text>
                    ) : null}
                  </View>

                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onPress={() => {
                        setPendingStatus(null);
                        setRemarks('');
                      }}>
                      <Text>Cancel</Text>
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={updateTicket.isPending}
                      onPress={submitStatus}>
                      {updateTicket.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text>Confirm</Text>
                      )}
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action.status}
                      variant={action.tone === 'outline' ? 'outline' : 'default'}
                      onPress={() => {
                        setRemarks('');
                        setPendingStatus(action.status);
                      }}>
                      <Text>{action.label}</Text>
                    </Button>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

function MultipleLineRemarkInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      numberOfLines={3}
      maxLength={2000}
      placeholder="e.g. Parts ordered, back on Thursday"
      placeholderTextColor="#94A3B8"
      textAlignVertical="top"
      className="min-h-[84px] rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900"
    />
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
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon as={icon} size={15} className="text-slate-600" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium text-slate-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-slate-900">{value}</Text>
      </View>
    </View>
  );
}
