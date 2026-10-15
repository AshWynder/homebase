import { Tabs } from 'expo-router';
import { Bell, ClipboardList, Gauge, Settings } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useTabBarColors } from '@/hooks/use-tab-bar-colors';

export default function CaretakerTabsLayout() {
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
        name="properties"
        options={{
          title: 'Properties',
          tabBarIcon: ({ color, size }) => <Icon as={ClipboardList} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="meters"
        options={{
          title: 'Meters',
          tabBarIcon: ({ color, size }) => <Icon as={Gauge} color={color} size={size} />,
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
