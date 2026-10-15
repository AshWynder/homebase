import { Moon, Palette, Smartphone, Sun, Type } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/settings/segmented-control';
import { SettingsSection } from '@/components/settings/settings-section';
import { FontSizeLabels, ThemeModeLabels } from '@/constants/theme';
import type { FontSize, ThemeMode } from '@/stores/slices/preferences-slice';
import { useStore } from '@/stores/use-store';

const THEME_OPTIONS: SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: ThemeModeLabels.system, icon: Smartphone },
  { value: 'light', label: ThemeModeLabels.light, icon: Sun },
  { value: 'dark', label: ThemeModeLabels.dark, icon: Moon },
];

const FONT_SIZE_OPTIONS: SegmentedOption<FontSize>[] = [
  { value: 'small', label: FontSizeLabels.small },
  { value: 'default', label: FontSizeLabels.default },
  { value: 'large', label: FontSizeLabels.large },
  { value: 'largest', label: FontSizeLabels.largest },
];

/**
 * Display preferences: palette and text size. Both write straight to the store;
 * `useDisplayPreferences` (mounted at the app root) reacts and pushes the choice
 * into NativeWind, so changing a segment here repaints the whole app live.
 */
export function DisplaySettings() {
  const themeMode = useStore((s) => s.themeMode);
  const fontSize = useStore((s) => s.fontSize);
  const setThemeMode = useStore((s) => s.setThemeMode);
  const setFontSize = useStore((s) => s.setFontSize);

  return (
    <View className="gap-6">
      <SettingsSection
        title="Appearance"
        description="System follows your device's light or dark setting automatically.">
        <View className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Icon as={Palette} size={16} className="text-primary" />
            </View>
            <Text className="text-sm font-semibold text-foreground">Theme</Text>
          </View>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={themeMode}
            onValueChange={setThemeMode}
          />
        </View>
      </SettingsSection>

      <SettingsSection
        title="Text size"
        description="Scales text throughout the app to make it easier to read.">
        <View className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Icon as={Type} size={16} className="text-primary" />
            </View>
            <Text className="text-sm font-semibold text-foreground">Text size</Text>
          </View>
          <SegmentedControl
            options={FONT_SIZE_OPTIONS}
            value={fontSize}
            onValueChange={setFontSize}
          />
        </View>
      </SettingsSection>

      <View className="gap-2">
        <Text className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Preview
        </Text>
        <View className="gap-1 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4">
          <Text className="text-base font-bold text-foreground">The quick brown fox</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Jumps over the lazy dog. Adjust the text size until this feels comfortable to read.
          </Text>
        </View>
      </View>
    </View>
  );
}
