import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Settings } from 'lucide-react-native';
import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors } from '@/theme/colors';

interface PortfolioHeaderProps {
  name?: string | null;
  onAdd?: () => void;
  addLabel?: string;
}

export function PortfolioHeader({
  name,
  onAdd,
  addLabel = 'Add property',
}: PortfolioHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const firstName = name?.trim().split(/\s+/)[0] ?? '';
  const initial = firstName.charAt(0).toUpperCase();

  if (!isDark) {
    return (
      <View className="flex-row items-center gap-3 px-4 pb-1 pt-3">
        <View className="relative">
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: '#059669' }}>
            <Text className="text-base font-bold" style={{ color: '#FFFFFF' }}>
              {initial}
            </Text>
          </View>
          <View
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: '#6EE7B7', borderWidth: 2, borderColor: '#FFFFFF' }}
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold" style={{ color: '#0F172A' }} numberOfLines={1}>
            {firstName ? `Hello ${firstName} 👋` : 'Portfolio'}
          </Text>
          <Text className="text-xs" style={{ color: '#64748B' }} numberOfLines={1}>
            Your portfolio at a glance
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {onAdd ? (
            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel={addLabel}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-90"
              style={{ backgroundColor: '#006241' }}>
              <Icon as={Plus} size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push('/(owner)/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-90"
            style={{
              backgroundColor: '#EAF1FF',
              borderWidth: 1,
              borderColor: '#D9E5FB',
            }}>
            <Icon as={Settings} size={20} color="#334155" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 px-4 pb-1 pt-3">
      {/* Avatar: Rounded square (radius ~14) with emerald fill, dark initial, and status dot */}
      <View className="relative">
        <View
          style={[
            styles.avatarDark,
            { backgroundColor: darkColors.emerald },
          ]}>
          <Text
            style={[
              styles.avatarTextDark,
              { color: darkColors.emeraldOn },
            ]}>
            {initial}
          </Text>
        </View>
        <View
          style={[
            styles.onlineDotDark,
            {
              backgroundColor: darkColors.emeraldLight,
              borderColor: darkColors.background,
            },
          ]}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="text-base font-bold"
          style={{ color: darkColors.text }}
          numberOfLines={1}>
          {firstName ? `Hello ${firstName} 👋` : 'Portfolio'}
        </Text>
        <Text
          className="text-xs"
          style={{ color: darkColors.textMuted }}
          numberOfLines={1}>
          Your portfolio at a glance
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            style={[
              styles.iconButtonDark,
              { backgroundColor: darkColors.emerald },
            ]}>
            <Icon as={Plus} size={20} color={darkColors.emeraldOn} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push('/(owner)/(tabs)/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={[
            styles.iconButtonDark,
            {
              backgroundColor: darkColors.surface,
              borderColor: darkColors.border,
              borderWidth: 1,
            },
          ]}>
          <Icon as={Settings} size={20} color={darkColors.textSlateLight} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextDark: {
    fontSize: 16,
    fontWeight: '700',
  },
  onlineDotDark: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  iconButtonDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
