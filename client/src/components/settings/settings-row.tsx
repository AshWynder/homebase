import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'destructive';

interface SettingsRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const iconContainerTone: Record<Tone, string> = {
  default: 'bg-muted',
  primary: 'bg-primary/10',
  destructive: 'bg-destructive/10',
};

const iconTone: Record<Tone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  destructive: 'text-destructive',
};

const titleTone: Record<Tone, string> = {
  default: 'text-foreground',
  primary: 'text-foreground',
  destructive: 'text-destructive',
};

/** A single tappable row in a settings list, styled with the semantic palette. */
export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  tone = 'default',
  className,
}: SettingsRowProps) {
  const content = (
    <>
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-xl',
          iconContainerTone[tone]
        )}>
        <Icon as={icon} size={19} className={iconTone[tone]} />
      </View>

      <View className="flex-1">
        <Text className={cn('text-sm font-semibold', titleTone[tone])}>{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>

      {right ?? <Icon as={ChevronRight} size={18} className="text-muted-foreground" />}
    </>
  );

  if (!onPress) {
    return (
      <View className={cn('flex-row items-center gap-3 px-4 py-3.5', className)}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-accent/60', className)}>
      {content}
    </Pressable>
  );
}
