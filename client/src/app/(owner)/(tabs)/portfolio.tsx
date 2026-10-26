import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PortfolioHeader } from '@/components/owner/portfolio-header';
import { SegmentedControl, type SegmentedOption } from '@/components/owner/segmented-control';
import { CreatePropertyDialog } from '@/components/owner/create-property-dialog';
import { CreateTenancyDialog } from '@/components/owner/create-tenancy-dialog';
import { PropertyList } from '@/components/owner/property-list';
import { TenancyList } from '@/components/owner/tenancy-list';
import { useToast } from '@/hooks/use-toast';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useUnits } from '@/hooks/queries/use-units';
import { useStore } from '@/stores/use-store';

type Segment = 'units' | 'tenants';

/**
 * Owner overview. The two segments are peer lists rather than separate routes,
 * so they share one screen and one tab strip.
 *
 * The surface is the muted backdrop from the design (`#f1f5f4`) rather than a
 * theme token, so the rest of the app's palette stays untouched.
 */
export default function PortfolioScreen() {
  const [segment, setSegment] = useState<Segment>('units');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [tenancyOpen, setTenancyOpen] = useState(false);

  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const { showToast } = useToast();

  // The same queries the lists below already run, so the tab counts read the
  // shared cache instead of firing requests of their own.
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();

  const unitsCount = useMemo(() => {
    const items = units.data?.items ?? [];
    if (!selectedPropertyId) return units.data?.total ?? items.length;
    return items.filter((unit) => unit.propertyId === selectedPropertyId).length;
  }, [units.data, selectedPropertyId]);

  const tenantsCount = useMemo(() => {
    const items = tenancies.data?.items ?? [];
    if (!selectedPropertyId) return tenancies.data?.total ?? items.length;
    return items.filter(
      (tenancy) => tenancy.unit?.property?.id === selectedPropertyId,
    ).length;
  }, [tenancies.data, selectedPropertyId]);

  const segments: SegmentedOption<Segment>[] = useMemo(
    () => [
      { value: 'units', label: 'Units', count: unitsCount },
      { value: 'tenants', label: 'Tenants', count: tenantsCount },
    ],
    [unitsCount, tenantsCount],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f1f5f4]" edges={['top']}>
      <PortfolioHeader
        name={user?.name}
        onAdd={
          segment === 'units' ? () => setPropertyOpen(true) : () => setTenancyOpen(true)
        }
        addLabel={segment === 'units' ? 'Add property' : 'Add tenancy'}
      />

      <View className="px-4 pb-3 pt-2">
        <SegmentedControl value={segment} onChange={setSegment} options={segments} />
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
