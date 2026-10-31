import { useMemo, useState } from 'react';
import { StatusBar, View } from 'react-native';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors } from '@/theme/colors';

type Segment = 'units' | 'tenants';

export default function PortfolioScreen() {
  const [segment, setSegment] = useState<Segment>('units');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [tenancyOpen, setTenancyOpen] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const { showToast } = useToast();

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
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? darkColors.background : '#F8FAFF'}
        translucent={false}
      />
      <SafeAreaView
        className="flex-1 bg-background dark:bg-[#0B0F17]"
        style={{ backgroundColor: isDark ? darkColors.background : '#F8FAFF' }}
        edges={['top']}>
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
    </>
  );
}
