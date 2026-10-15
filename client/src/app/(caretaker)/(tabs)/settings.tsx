import React from 'react';

import { SettingsHub } from '@/components/settings/settings-hub';

export default function CaretakerSettingsScreen() {
  return (
    <SettingsHub
      roleLabel="Property Caretaker"
      roleBadgeClassName="border-indigo-500/20 bg-indigo-500/10"
      roleBadgeTextClassName="text-indigo-600 dark:text-indigo-400"
      profileHref="/(caretaker)/settings/profile"
      displayHref="/(caretaker)/settings/display"
    />
  );
}
