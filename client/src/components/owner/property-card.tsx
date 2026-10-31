import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, MapPin, UserCog } from 'lucide-react-native';

import { OccupancyBar } from '@/components/owner/occupancy-bar';
import { StatRow, type StatRowTone } from '@/components/owner/stat-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors } from '@/theme/colors';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const caretakerName = property.caretaker?.user?.name ?? null;

  if (!isDark) {
    return (
      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={`Property ${property.name}`}
        style={{
          gap: 12,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: 16,
          shadowColor: 'rgba(15,23,42,0.06)',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 1,
        }}
        className="active:opacity-95">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
              {property.name}
            </Text>
            {property.address ? (
              <View className="flex-row items-center gap-1">
                <Icon as={MapPin} size={13} color="#006241" />
                <Text className="min-w-0 flex-1 text-sm" style={{ color: '#64748B' }} numberOfLines={1}>
                  {property.address}
                </Text>
              </View>
            ) : null}
          </View>
          {menu}
        </View>

        {showCaretaker && caretakerName ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#D9E5FB',
              backgroundColor: '#EAF1FF',
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}>
            <Icon as={UserCog} size={13} color="#059669" />
            <Text style={{ color: '#64748B', fontSize: 12 }} numberOfLines={1}>
              Caretaker
            </Text>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#059669' }} />
            <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 12 }} numberOfLines={1}>
              {caretakerName}
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

        <Pressable
          onPress={() => router.push(href)}
          accessibilityRole="button"
          accessibilityLabel={footerLabel}
          style={{
            height: 44,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: 12,
            backgroundColor: '#006241',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
            {footerLabel}
          </Text>
          <Icon as={ChevronRight} size={16} color="#FFFFFF" />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`Property ${property.name}`}
      style={{
        backgroundColor: darkColors.surface,
        borderColor: darkColors.border,
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
        gap: 12,
      }}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className="text-base font-bold"
            style={{ color: darkColors.text }}
            numberOfLines={1}>
            {property.name}
          </Text>
          {property.address ? (
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={13} color={darkColors.textMuted} />
              <Text
                className="min-w-0 flex-1 text-sm"
                style={{ color: darkColors.textMuted }}
                numberOfLines={1}>
                {property.address}
              </Text>
            </View>
          ) : null}
        </View>
        {menu}
      </View>

      {showCaretaker && caretakerName ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1.5,
            alignSelf: 'flex-start',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: darkColors.emeraldTintBorder,
            backgroundColor: darkColors.emeraldTintBg,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
          <Icon as={UserCog} size={13} color={darkColors.teal} />
          <Text
            className="text-xs text-muted-foreground"
            numberOfLines={1}>
            Caretaker
          </Text>
          <View style={styles.caretakerDot} />
          <Text
            style={{ fontWeight: '700', color: darkColors.text }}
            numberOfLines={1}>
            {caretakerName}
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

      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={footerLabel}
        style={{
          height: 44,
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          borderRadius: 12,
          backgroundColor: darkColors.emerald,
        }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: darkColors.emeraldOn,
          }}>
          {footerLabel}
        </Text>
        <Icon as={ChevronRight} size={16} color={darkColors.emeraldOn} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caretakerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: darkColors.textDim,
    marginLeft: 2,
  },
});
