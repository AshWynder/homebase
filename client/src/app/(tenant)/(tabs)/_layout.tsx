import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, Megaphone, MessageSquare, Wrench } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUnreadTotal } from '@/hooks/queries/use-chat';

export default function TenantTabsLayout() {
  // Read here rather than in `chats.tsx` so the badge survives the tab being
  // unmounted: an unread message still has to show on a tab that is not the
  // current screen, and a badge owned by an unmounted screen is always zero.
  const unread = useUnreadTotal();

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
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon as={Home} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <Icon as={Wallet} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ color, size }) => (
            <Icon as={Wrench} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          tabBarIcon: ({ color, size }) => (
            <Icon as={Megaphone} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon as={MessageSquare} color={color} size={size} />
              {/* Rendered outside the icon slot's tint, so the count stays legible
                  whichever tab is active. */}
              {unread > 0 ? (
                <View className="absolute -right-2.5 -top-1.5 min-w-4 items-center justify-center rounded-full bg-red-600 px-1">
                  <Text className="text-[9px] font-bold leading-4 text-white">
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
