import { Tabs } from 'expo-router';
import { Bell, ClipboardList, Gauge, UserCircle } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';

export default function CaretakerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F766E',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          borderTopColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
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
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Icon as={UserCircle} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
