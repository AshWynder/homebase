import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl, type SegmentedOption } from '@/components/owner/segmented-control';
import { ScreenHeader } from '@/components/owner/screen-header';
import { CreatePropertyDialog } from '@/components/owner/create-property-dialog';
import { CreateTenancyDialog } from '@/components/owner/create-tenancy-dialog';
import { PropertyList } from '@/components/owner/property-list';
import { TenancyList } from '@/components/owner/tenancy-list';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/stores/use-store';

type Segment = 'units' | 'tenants';

const SEGMENTS: SegmentedOption<Segment>[] = [
  { value: 'units', label: 'Units' },
  { value: 'tenants', label: 'Tenants' },
];

export default function PortfolioScreen() {
  const [segment, setSegment] = useState<Segment>('units');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [tenancyOpen, setTenancyOpen] = useState(false);

  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const { showToast } = useToast();

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';
  const title = firstName ? `Hello ${firstName} 👋` : 'Portfolio';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title={title}
        onAdd={segment === 'units' ? () => setPropertyOpen(true) : () => setTenancyOpen(true)}
        addLabel={segment === 'units' ? 'Add property' : 'Add tenancy'}
      />

      <View className="border-b border-slate-200 bg-white px-5 pb-3">
        <SegmentedControl value={segment} onChange={setSegment} options={SEGMENTS} />
      </View>

      {segment === 'units' ? <PropertyList /> : <TenancyList />}

      <CreatePropertyDialog
        open={propertyOpen}
        onOpenChange={setPropertyOpen}
        ownerId={profile?.id ?? ''}
        onToast={showToast}
      />
      <CreateTenancyDialog
        open={tenancyOpen}
        onOpenChange={setTenancyOpen}
        onToast={showToast}
      />
    </SafeAreaView>
  );
}
