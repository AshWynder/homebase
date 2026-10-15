import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/owner/screen-header';
import { DisplaySettings } from '@/components/settings/display-settings';

interface DisplaySettingsScreenProps {
  showBack?: boolean;
}

/** Screen chrome around the shared {@link DisplaySettings} controls. */
export function DisplaySettingsScreen({ showBack = true }: DisplaySettingsScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Display" showBack={showBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-[60px]"
        showsVerticalScrollIndicator={false}>
        <DisplaySettings />
      </ScrollView>
    </SafeAreaView>
  );
}
