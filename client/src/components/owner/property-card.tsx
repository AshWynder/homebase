import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, MapPin, UserCog } from 'lucide-react-native';

import { OccupancyBar } from '@/components/owner/occupancy-bar';
import { StatRow, type StatRowTone } from '@/components/owner/stat-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Property } from '@/api/types';

export interface PropertyCardStat {
  label: string;
  value: string;
  /** Optional prefix rendered before the value, e.g. "KES". */
  prefix?: string;
  icon: LucideIcon;
  tone: StatRowTone;
}

interface PropertyCardProps {
  property: Property;
  /** Total units on the property. */
  units: number;
  /** Units that currently have an active tenancy. */
  occupied: number;
  /** Rows rendered under the occupancy bar. */
  stats: PropertyCardStat[];
  /** Route the card and the footer button open. */
  href: Href;
  /** Trailing action menu (owner only). */
  menu?: React.ReactNode;
  /** Show the caretaker chip. */
  showCaretaker?: boolean;
  footerLabel?: string;
}

/**
 * A property card: identity, caretaker, occupancy, stats and the way into the
 * unit roster. Shared by the owner and the caretaker so both read the same.
 */
export function PropertyCard({
  property,
  units,
  occupied,
  stats,
  href,
  menu,
  showCaretaker = true,
  footerLabel = 'Manage Unit Roster',
}: PropertyCardProps) {
  const caretakerName = property.caretaker?.user?.name ?? null;

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`Property ${property.name}`}
      className="gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 active:bg-muted">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {property.name}
          </Text>
          {property.address ? (
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={13} className="text-muted-foreground" />
              <Text className="min-w-0 flex-1 text-sm text-muted-foreground" numberOfLines={1}>
                {property.address}
              </Text>
            </View>
          ) : null}
        </View>
        {menu}
      </View>

      {showCaretaker && caretakerName ? (
        <View className="flex-row items-center gap-1.5 self-start rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
          <Icon as={UserCog} size={13} className="text-primary" />
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            Caretaker •{' '}
            <Text className="font-bold text-foreground">{caretakerName}</Text>
          </Text>
        </View>
      ) : null}

      <OccupancyBar occupied={occupied} total={units} />

      <View className="gap-2">
        {stats.map((stat) => (
          <StatRow
            key={stat.label}
            label={stat.label}
            value={stat.value}
            prefix={stat.prefix}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </View>

      <Button
        variant="secondary"
        className="h-11 w-full flex-row items-center justify-center gap-1 rounded-xl"
        onPress={() => router.push(href)}>
        <Text className="text-sm font-semibold">{footerLabel}</Text>
        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
      </Button>
    </Pressable>
  );
}
