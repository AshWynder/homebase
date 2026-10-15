import React from 'react';

import { ProfileSettings } from '@/components/settings/profile-settings';

export default function CaretakerProfileScreen() {
  return (
    <ProfileSettings
      roleLabel="Property Caretaker"
      roleBadgeClassName="border-indigo-500/20 bg-indigo-500/10"
      roleBadgeTextClassName="text-indigo-600 dark:text-indigo-400"
    />
  );
}
