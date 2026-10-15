import React, { Children } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Groups related {@link SettingsRow}s inside a rounded card and draws the
 * hairline dividers between them. Rows are inset so the divider starts after the
 * leading icon, matching the platform settings convention.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View className="gap-2">
      {title ? (
        <Text className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <View className="ml-16 h-px bg-border" /> : null}
            {row}
          </View>
        ))}
      </View>

      {description ? (
        <Text className="px-1 text-xs leading-4 text-muted-foreground">{description}</Text>
      ) : null}
    </View>
  );
}
