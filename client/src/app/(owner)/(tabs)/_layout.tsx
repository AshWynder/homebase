import { StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Bell, Building2, Settings, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useActivityNeedsReview } from '@/hooks/use-activity-badge';
import { useAppColors } from '@/theme/useAppColors';

const ICON_SIZE = 24;
const BAR_CONTENT_HEIGHT = 60;
const BAR_VERTICAL_PADDING = 4;

type TabBarColors = ReturnType<typeof useAppColors>;

function TabLabel({
  title,
  focused,
  colors,
}: {
  title: string;
  focused: boolean;
  colors: TabBarColors;
}) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.labelText,
        {
          color: focused ? colors.tabBarActive : colors.tabBarInactive,
          fontFamily: focused
            ? 'PlusJakartaSans_600SemiBold'
            : 'PlusJakartaSans_500Medium',
        },
      ]}>
      {title}
    </Text>
  );
}

function ActivityTabIcon({
  color,
  colors,
}: {
  color: ColorValue;
  colors: TabBarColors;
}) {
  const hasNeedsReview = useActivityNeedsReview();
  return (
    <View style={styles.iconWrapper}>
      <Icon as={Bell} color={color} size={ICON_SIZE} />
      {hasNeedsReview ? (
        <View
          style={[
            styles.notificationDot,
            {
              backgroundColor: colors.primary,
              borderColor: colors.tabBarBackground,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export default function OwnerTabsLayout() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          backgroundColor: colors.tabBarBackground,
          position: 'relative',
          zIndex: 20,
          elevation: 0,
          height:
            BAR_CONTENT_HEIGHT + BAR_VERTICAL_PADDING * 2 + insets.bottom,
          paddingTop: BAR_VERTICAL_PADDING,
          paddingBottom: insets.bottom + BAR_VERTICAL_PADDING,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          includeFontPadding: false,
          letterSpacing: 0,
        },
      }}>
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Portfolio" focused={focused} colors={colors} />
          ),
          tabBarIcon: ({ color }) => (
            <Icon as={Building2} color={color} size={ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Money" focused={focused} colors={colors} />
          ),
          tabBarIcon: ({ color }) => (
            <Icon as={Wallet} color={color} size={ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Activity" focused={focused} colors={colors} />
          ),
          tabBarIcon: ({ color }) => (
            <ActivityTabIcon color={color} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: ({ focused }) => (
            <TabLabel title="Settings" focused={focused} colors={colors} />
          ),
          tabBarIcon: ({ color }) => (
            <Icon as={Settings} color={color} size={ICON_SIZE} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  labelText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0,
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
    borderWidth: 2,
  },
});
