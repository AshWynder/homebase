import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/owner/screen-header';
import { TenancyList } from '@/components/owner/tenancy-list';

export default function OwnerTenanciesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Move-Out & Leases" showBack />
      <TenancyList
        isActive={false}
        showTerminationDetails
        emptyTitle="No move-out notices"
        emptySubtitle="Tenant move-out notices will appear here after they submit one."
      />
    </SafeAreaView>
  );
}
