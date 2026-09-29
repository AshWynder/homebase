import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { Building2, FileText, UserCircle, Users, Wallet } from 'lucide-react-native';

export default function OwnerTabsLayout() {
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
          tabBarIcon: ({ color, size }) => (
            <Icon as={Building2} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tenancies"
        options={{
          title: 'Tenancies',
          tabBarIcon: ({ color, size }) => <Icon as={Users} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => <Icon as={FileText} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => <Icon as={Wallet} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Icon as={UserCircle} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
