import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Bell, Building2, CircleDollarSign, Settings } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActivityNeedsReview } from '@/hooks/use-activity-badge';
import { darkColors } from '@/theme/colors';

function TabLabel({
  title,
  focused,
  isDark,
}: {
  title: string;
  focused: boolean;
  isDark: boolean;
}) {
  if (!isDark) {
    const color = focused ? '#006241' : '#64748B';
    return (
      <View style={styles.labelWrapper}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.labelText,
            {
              color,
              fontFamily: 'PlusJakartaSans_600SemiBold',
            },
          ]}>
          {title}
        </Text>
        {focused ? <View style={[styles.activeDot, { backgroundColor: '#006241' }]} /> : <View style={styles.dotPlaceholder} />}
      </View>
    );
  }

  const color = focused ? darkColors.emeraldLight : darkColors.textDim;
  return (
    <View style={styles.labelWrapper}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.labelText, { color }]}>
        {title}
      </Text>
      {focused ? (
        <View style={styles.activeDot} />
      ) : (
        <View style={styles.dotPlaceholder} />
      )}
    </View>
  );
}

function ActivityTabIcon({
  color,
  size,
  isDark,
}: {
  color: string;
  size: number;
  isDark: boolean;
}) {
  const hasNeedsReview = useActivityNeedsReview();
  return (
    <View style={styles.iconWrapper}>
      <Icon as={Bell} color={color} size={size} />
      {hasNeedsReview ? (
        <View
          style={[
            styles.notificationDot,
            {
              backgroundColor: '#059669',
              borderColor: isDark ? darkColors.background : '#FFFFFF',
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export default function OwnerTabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? ('#34D399' as any) : '#006241',
        tabBarInactiveTintColor: isDark ? ('#64748B' as any) : '#64748B',
        tabBarStyle: {
          borderTopColor: isDark ? darkColors.border : '#E2E8F0',
          borderTopWidth: 1,
          backgroundColor: isDark ? darkColors.background : '#FFFFFF',
          position: 'relative',
          zIndex: 20,
          elevation: 20,
          paddingTop: 4,
          paddingBottom: 4,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          includeFontPadding: false,
          letterSpacing: 0,
        },
      }}>
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Portfolio" focused={focused} isDark={isDark} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Icon as={Building2} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Money" focused={focused} isDark={isDark} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Icon as={CircleDollarSign} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Activity" focused={focused} isDark={isDark} />
          ),
          tabBarIcon: ({ color, size }) => (
            <ActivityTabIcon color={color} size={size} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Settings" focused={focused} isDark={isDark} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Icon as={Settings} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  labelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: 0,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34D399',
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
  iconWrapper: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    borderWidth: 2,
  },
});
