import { Tabs } from 'expo-router';
import { Bell, Building2, Settings, Wallet } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useTabBarColors } from '@/hooks/use-tab-bar-colors';

export default function OwnerTabsLayout() {
  const tabColors = useTabBarColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabColors.active,
        tabBarInactiveTintColor: tabColors.inactive,
        tabBarStyle: {
          borderTopColor: tabColors.border,
          backgroundColor: tabColors.background,
          position: 'relative',
          zIndex: 20,
          elevation: 20,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => <Icon as={Building2} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => <Icon as={Wallet} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Icon as={Bell} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Icon as={Settings} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
