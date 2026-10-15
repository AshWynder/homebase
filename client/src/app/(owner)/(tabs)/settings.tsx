import React from 'react';

import { SettingsHub } from '@/components/settings/settings-hub';

export default function OwnerSettingsScreen() {
  return (
    <SettingsHub
      roleLabel="Property Owner"
      profileHref="/(owner)/settings/profile"
      displayHref="/(owner)/settings/display"
    />
  );
}
