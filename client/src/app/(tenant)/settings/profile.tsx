import React from 'react';

import { ProfileSettings } from '@/components/settings/profile-settings';

export default function TenantProfileScreen() {
  return <ProfileSettings roleLabel="Resident / Tenant" isTenant />;
}
