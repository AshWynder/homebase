import { CheckCircle2, CircleDashed, Clock, Wrench } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { MaintenanceStatus } from '@/api/types';

interface StatusStyle {
  label: string;
  /** Container classes for the pill. */
  chip: string;
  /** Label colour, so status is never communicated by colour alone. */
  text: string;
  dot: string;
  icon: typeof Clock;
}

export const MAINTENANCE_STATUS_STYLES: Record<MaintenanceStatus, StatusStyle> = {
  OPEN: {
    label: 'Open',
    chip: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    icon: CircleDashed,
  },
  IN_PROGRESS: {
    label: 'In progress',
    chip: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    icon: Clock,
  },
  RESOLVED: {
    label: 'Resolved',
    chip: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
};

export function MaintenanceStatusPill({ status }: { status: MaintenanceStatus }) {
  const style = MAINTENANCE_STATUS_STYLES[status];

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${style.chip}`}>
      <View className={`h-2 w-2 rounded-full ${style.dot}`} />
      <Text className={`text-[11px] font-bold ${style.text}`}>{style.label}</Text>
    </View>
  );
}

/** The ordered stages a ticket moves through, for the detail tracker. */
const STAGES: readonly { status: MaintenanceStatus; caption: string }[] = [
  { status: 'OPEN', caption: 'Reported' },
  { status: 'IN_PROGRESS', caption: 'Being fixed' },
  { status: 'RESOLVED', caption: 'Resolved' },
];

/**
 * A read-only progress indicator.
 *
 * It shows only where the ticket currently sits. The API records `createdAt` and
 * `resolvedAt` but no per-stage history, so this deliberately does not draw
 * timestamps on the earlier steps — inventing them would be a lie the tenant
 * could catch by asking the landlord.
 *
 * Owners can move a ticket backwards as well as forwards, so this is a position
 * indicator, not a forward-only progress bar.
 */
export function MaintenanceStatusTracker({
  status,
  createdAt,
  resolvedAt,
}: {
  status: MaintenanceStatus;
  createdAt?: string;
  resolvedAt?: string | null;
}) {
  const currentIndex = STAGES.findIndex((stage) => stage.status === status);

  return (
    <View>
      <View className="flex-row items-start">
        {STAGES.map((stage, index) => {
          const reached = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const style = MAINTENANCE_STATUS_STYLES[stage.status];

          return (
            <View key={stage.status} className="flex-1 items-center">
              <View className="flex-row w-full items-center">
                {/* Connector to the left, omitted on the first step. */}
                <View
                  className={`h-0.5 flex-1 ${index === 0 ? 'opacity-0' : reached ? 'bg-teal-500' : 'bg-slate-200'}`}
                />
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                    reached
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-slate-200 bg-white'
                  }`}>
                  {reached ? (
                    <Icon
                      as={isCurrent ? style.icon : CheckCircle2}
                      size={15}
                      className="text-white"
                    />
                  ) : (
                    <Text className="text-xs font-bold text-slate-400">{index + 1}</Text>
                  )}
                </View>
                <View
                  className={`h-0.5 flex-1 ${index === STAGES.length - 1 ? 'opacity-0' : index < currentIndex ? 'bg-teal-500' : 'bg-slate-200'}`}
                />
              </View>

              <Text
                className={`mt-2 text-center text-[11px] font-bold ${reached ? 'text-teal-800' : 'text-slate-400'}`}>
                {stage.caption}
              </Text>
              <Text className="mt-0.5 text-center text-[10px] font-medium text-slate-500">
                {isCurrent && stage.status === 'OPEN' && createdAt
                  ? new Date(createdAt).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : isCurrent && stage.status === 'RESOLVED' && resolvedAt
                    ? new Date(resolvedAt).toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ' '}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Thumbnail slot for a ticket with no photos. */
export function TicketPlaceholderTile({ size = 56 }: { size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-xl bg-teal-50 border border-teal-100"
      style={{ width: size, height: size }}>
      <Icon as={Wrench} size={size * 0.38} className="text-teal-600" />
    </View>
  );
}
