import React from 'react';

import { SettingsHub } from '@/components/settings/settings-hub';

export default function TenantSettingsScreen() {
  return (
    <SettingsHub
      roleLabel="Resident / Tenant"
      profileHref="/(tenant)/settings/profile"
      displayHref="/(tenant)/settings/display"
      showBack
      isTenant
    />
  );
}
