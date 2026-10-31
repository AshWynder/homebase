import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { lightColors } from '@/theme/colors';
import type { LucideIcon } from 'lucide-react-native';

export type ActivityBadgeConfig =
  | { type: 'none' }
  | {
      type: 'count';
      count: number;
      variant: 'amber' | 'green' | 'amberDark' | 'emeraldSolid';
      bg?: string;
      border?: string;
      text?: string;
    }
  | { type: 'dot'; visible: boolean; dotColor?: string; dotGlow?: boolean };

export interface ActivityCardProps {
  icon: LucideIcon;
  iconBackgroundColor: string;
  iconColor: string;
  iconBorderColor?: string;
  title: string;
  description: string;
  badge: ActivityBadgeConfig;
  onPress: () => void;
  accessibilityLabel?: string;
  titleColor?: string;
  descriptionColor?: string;
  chevronColor?: string;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  badgePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgePillDark: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    flexShrink: 0,
    borderWidth: 1,
  },
  badgeNumber: {
    minHeight: 24,
    minWidth: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    minWidth: 0,
  },
  amberBadgeText: {
    color: lightColors.brown,
  },
  darkBadgeText: {
    color: lightColors.brown,
  },
  solidBadgeText: {
    color: lightColors.primaryOn,
  },
  cardTitle: {
    color: lightColors.text,
  },
  cardDescription: {
    color: lightColors.textBody,
  },
});

export function ActivityCard({
  icon,
  iconBackgroundColor,
  iconColor,
  iconBorderColor,
  title,
  description,
  badge,
  onPress,
  accessibilityLabel,
  titleColor,
  descriptionColor,
  chevronColor,
  cardBackgroundColor,
  cardBorderColor,
}: ActivityCardProps) {
  const badgeStyle = useMemo(() => ({
    badgeText: {
      color: lightColors.brown,
    },
    descriptionText: {
      color: descriptionColor ?? lightColors.textBody,
    },
    titleText: {
      color: titleColor ?? lightColors.text,
    },
  }), [descriptionColor, titleColor]);

  const renderBadge = () => {
    if (badge.type === 'none') {
      return null;
    }

    if (badge.type === 'dot') {
      if (!badge.visible) {
        return null;
      }
      const dotColor = badge.dotColor ?? lightColors.primaryDeep;
      return (
        <View
          style={[
            styles.badgeDot,
            {
              backgroundColor: dotColor,
              shadowColor: badge.dotGlow ? dotColor : undefined,
              shadowOpacity: badge.dotGlow ? 0.4 : 0,
              shadowRadius: badge.dotGlow ? 4 : 0,
            },
          ]}
        />
      );
    }

    if (badge.type === 'count') {
      if (badge.count <= 0) {
        return null;
      }
      const displayCount = badge.count > 99 ? '99+' : badge.count.toString();

      if (badge.variant === 'amber') {
        return (
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: lightColors.warningBg,
                borderWidth: 1,
                borderColor: lightColors.warning,
              },
            ]}
          >
            <Text
              className="text-[11px] font-bold"
              style={badgeStyle.badgeText}
              numberOfLines={1}
              ellipsizeMode="tail">
              {displayCount} active
            </Text>
          </View>
        );
      }

      if (badge.variant === 'amberDark') {
        return (
          <View
            style={[
              styles.badgePillDark,
              {
                backgroundColor: badge.bg ?? lightColors.peach,
                borderColor: badge.border ?? lightColors.peachBorder,
              },
            ]}
          >
            <Text
              className="text-[11px] font-bold"
              style={[styles.darkBadgeText, { color: badge.text ?? lightColors.brown }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {displayCount} active
            </Text>
          </View>
        );
      }

      if (badge.variant === 'emeraldSolid') {
        return (
          <View
            style={[
              styles.badgeNumber,
              { backgroundColor: badge.bg ?? lightColors.primaryDeep },
            ]}
          >
            <Text
              className="text-xs font-bold"
              style={[styles.solidBadgeText, { color: badge.text ?? lightColors.primaryOn }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {displayCount}
            </Text>
          </View>
        );
      }

      return (
        <View style={[styles.badgeNumber, { backgroundColor: lightColors.primary }]}> 
          <Text className="text-xs font-bold text-white" ellipsizeMode="tail">
            {displayCount}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}. ${description}`}
      className="flex-row items-center gap-3.5 rounded-[20px] border p-4 active:opacity-90"
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor ?? lightColors.surface,
          borderWidth: 1,
          borderColor: cardBorderColor ?? lightColors.border,
        },
      ]}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-[14px]"
        style={[
          styles.iconTile,
          {
            backgroundColor: iconBackgroundColor,
            borderWidth: iconBorderColor ? 1 : 0,
            borderColor: iconBorderColor ?? 'transparent',
          },
        ]}
      >
        <Icon as={icon} size={24} color={iconColor} />
      </View>

      <View style={styles.textContent}>
        <Text className="text-base font-bold" style={badgeStyle.titleText}>
          {title}
        </Text>
        <Text className="text-xs" style={badgeStyle.descriptionText}>
          {description}
        </Text>
      </View>

      <View style={styles.badgeLayout}>
        {renderBadge()}
        <Icon as={ChevronRight} size={18} color={chevronColor ?? lightColors.textMuted} />
      </View>
    </Pressable>
  );
}
