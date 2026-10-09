import type { Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/owner/screen-header';
import { TenancyList } from '@/components/owner/tenancy-list';

export default function CaretakerTenanciesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Move-Out & Leases" showBack />
      <TenancyList
        isActive={false}
        showTerminationDetails
        emptyTitle="No move-out notices"
        emptySubtitle="Move-out notices for properties assigned to you will appear here."
        rowHref={(tenancy) =>
          tenancy.unitId ? (`/(caretaker)/unit/${tenancy.unitId}` as Href) : null
        }
      />
    </SafeAreaView>
  );
}
