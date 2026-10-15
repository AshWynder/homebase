import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Droplets,
  Home,
  Plus,
  Receipt,
  TrendingUp,
  User,
  UserPlus,
  Zap,
} from 'lucide-react-native';

import { AssignMeterModal } from '@/components/owner/assign-meter-modal';
import { AssignTenantModal } from '@/components/owner/assign-tenant-modal';
import { ListMessage } from '@/components/owner/list-state';
import { TenantContactActions } from '@/components/owner/tenant-contact-actions';
import { RecordReadingDialog } from '@/components/owner/record-reading-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { useDeferredChange } from '@/hooks/use-deferred-change';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useMeterReadings, useMeters } from '@/hooks/queries/use-meters';
import { useUnit } from '@/hooks/queries/use-units';
import {
  formatDateLong,
  formatDateTime,
  formatKes,
  tenantName,
} from '@/lib/format';
import type { InvoiceStatus, MeterType, UtilityMeter } from '@/api/types';

type InvoiceFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

const INVOICE_FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

const INVOICE_STATUS: Record<
  InvoiceStatus,
  { bg: string; text: string; label: string }
> = {
  UNPAID: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-warning/10', text: 'text-warning', label: 'PARTIAL' },
  PAID: { bg: 'bg-success/10', text: 'text-success', label: 'PAID' },
  OVERDUE: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'OVERDUE' },
};

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  chipActive: { backgroundColor: '#0D9488' },
  chipInactive: { backgroundColor: '#F1F5F9' },
});

const METER_TYPE_CONFIG: Record<
  MeterType,
  { icon: any; label: string; color: string }
> = {
  WATER: { icon: Droplets, label: 'Water', color: 'text-info' },
  ELECTRICITY: { icon: Zap, label: 'Electricity', color: 'text-warning' },
};

function MeterReadingsList({ meterId }: { meterId: string }) {
  const readingsQuery = useMeterReadings(meterId, { limit: 10 });
  const readings = readingsQuery.data?.items ?? [];

  if (readingsQuery.isLoading) {
    return (
      <View className="mt-3 gap-2 border-t border-border pt-3">
        <View className="flex-row items-center gap-2">
          <Icon as={TrendingUp} size={14} className="text-muted-foreground" />
          <Text className="text-xs font-semibold text-muted-foreground">
            Historical Readings
          </Text>
        </View>
        <View className="py-2">
          <Text className="text-center text-xs text-muted-foreground">
            Loading readings...
          </Text>
        </View>
      </View>
    );
  }

  if (readings.length === 0) {
    return (
      <View className="mt-3 gap-2 border-t border-border pt-3">
        <View className="flex-row items-center gap-2">
          <Icon as={TrendingUp} size={14} className="text-muted-foreground" />
          <Text className="text-xs font-semibold text-muted-foreground">
            Historical Readings
          </Text>
        </View>
        <View className="py-2">
          <Text className="text-center text-xs text-muted-foreground">
            No readings recorded yet
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-3 gap-2 border-t border-border pt-3">
      <View className="flex-row items-center gap-2">
        <Icon as={TrendingUp} size={14} className="text-muted-foreground" />
        <Text className="text-xs font-semibold text-muted-foreground">
          Historical Readings
        </Text>
      </View>
      <View className="gap-2">
        {readings.map((reading) => (
          <View
            key={reading.id}
            className="rounded-lg bg-card p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 gap-1">
                <Text className="text-xs text-muted-foreground">
                  {formatDateTime(reading.readingDate)}
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  Reading: {reading.currentReading}
                </Text>
              </View>
              <View className="flex-1 gap-1 text-right">
                <Text className="text-xs text-muted-foreground">
                  Consumed: {reading.unitsConsumed} units
                </Text>
                <Text className="text-sm font-bold text-foreground">
                  {formatKes(reading.consumptionCost)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 py-2">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon as={Icon} size={16} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-sm font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unitId = typeof id === 'string' ? id : id?.[0] ?? '';
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const onInvoiceFilterChange = useDeferredChange(invoiceFilter, setInvoiceFilter);
  const [expandedMeterId, setExpandedMeterId] = useState<string | null>(null);
  const [assignTenantModalOpen, setAssignTenantModalOpen] = useState(false);
  const [addMeterModalOpen, setAddMeterModalOpen] = useState(false);
  const [readingMeter, setReadingMeter] = useState<UtilityMeter | null>(null);

  const unitQuery = useUnit(unitId);
  const unit = unitQuery.data;

  const tenancyQuery = useTenancies({ unitId, isActive: true, limit: 1 });
  const activeTenancy = tenancyQuery.data?.items?.[0];

  const metersQuery = useMeters({ unitId, limit: 10 });
  const meters = metersQuery.data?.items ?? [];

  const invoicesQuery = useInvoices({ unitId, limit: 50 });
  const allInvoices = invoicesQuery.data?.items ?? [];

  // Filter invoices based on selected filter
  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'all') return allInvoices;
    return allInvoices.filter((inv) => {
      if (invoiceFilter === 'unpaid') return inv.status === 'UNPAID';
      if (invoiceFilter === 'paid') return inv.status === 'PAID';
      if (invoiceFilter === 'overdue') return inv.status === 'OVERDUE';
      return true;
    });
  }, [allInvoices, invoiceFilter]);

  const loading = unitQuery.isLoading || tenancyQuery.isLoading || metersQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-muted active:bg-border">
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-foreground">
          Unit Details
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F766E" />
        </View>
      ) : unitQuery.isError ? (
        <ListMessage
          title="Couldn't load unit"
          subtitle={(unitQuery.error as Error).message}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-10 gap-4"
          showsVerticalScrollIndicator={false}>
          {/* Unit Information Card */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-bold text-foreground">
              Unit Information
            </Text>
            <View className="gap-1">
              <InfoRow
                icon={Home}
                label="Unit Number"
                value={`Unit ${unit?.unitNumber || '\u2014'}`}
              />
              {unit?.blockName && (
                <InfoRow
                  icon={Home}
                  label="Block"
                  value={unit.blockName}
                />
              )}
              <InfoRow
                icon={Home}
                label="Property"
                value={unit?.property?.name || '\u2014'}
              />
              {unit?.property?.address && (
                <InfoRow
                  icon={Home}
                  label="Address"
                  value={unit.property.address}
                />
              )}
            </View>
          </View>

          {/* Active Tenant Section */}
          {activeTenancy ? (
            <View className="gap-4 rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">
                  Active Tenant
                </Text>
                <Badge className="bg-success/10">
                  <Text className="text-[10px] font-semibold text-success">
                    ACTIVE
                  </Text>
                </Badge>
              </View>
              <View className="gap-1">
              <InfoRow
                icon={User}
                label="Tenant Name"
                value={tenantName(activeTenancy)}
              />
              <TenantContactActions
                phone={activeTenancy.tenant?.phone}
                email={activeTenancy.tenant?.user?.email}
                name={tenantName(activeTenancy)}
                profileId={activeTenancy.tenant?.id}
              />
                <InfoRow
                  icon={Receipt}
                  label="Rent Amount"
                  value={formatKes(activeTenancy.rentAmount)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Lease Start"
                  value={formatDateLong(activeTenancy.startDate)}
                />
                {activeTenancy.endDate && (
                  <InfoRow
                    icon={Calendar}
                    label="Lease End"
                    value={formatDateLong(activeTenancy.endDate)}
                  />
                )}
              </View>
            </View>
          ) : (
            <View className="gap-4 rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <View className="gap-2">
                  <Text className="text-base font-bold text-foreground">
                    Tenant Status
                  </Text>
                  <Badge variant="secondary" className="bg-muted">
                    <Text className="text-[10px] font-semibold text-muted-foreground">
                      VACANT
                    </Text>
                  </Badge>
                </View>
                <Button
                  onPress={() => setAssignTenantModalOpen(true)}
                  className="gap-2">
                  <Icon as={UserPlus} size={16} className="text-primary-foreground" />
                  <Text>Assign Tenant</Text>
                </Button>
              </View>
            </View>
          )}

          {/* Utility Meters Section */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-bold text-foreground">
              Utility Meters
            </Text>
            {meters.length === 0 ? (
              <View className="items-center py-4 gap-3">
                <Text className="text-center text-sm text-muted-foreground">
                  No utility meters installed
                </Text>
                <Button
                  onPress={() => setAddMeterModalOpen(true)}
                  className="gap-2">
                  <Icon as={Plus} size={16} className="text-primary-foreground" />
                  <Text>Add Meter</Text>
                </Button>
              </View>
            ) : (
              <View className="gap-3">
                {meters.map((meter) => {
                  const config = METER_TYPE_CONFIG[meter.meterType];
                  const isExpanded = expandedMeterId === meter.id;
                  return (
                    <View
                      key={meter.id}
                      className="gap-3 rounded-xl border border-border bg-muted p-3">
                      <Pressable
                        onPress={() =>
                          setExpandedMeterId(isExpanded ? null : meter.id)
                        }
                        className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-8 w-8 items-center justify-center rounded-lg bg-card">
                            <Icon
                              as={config.icon}
                              size={16}
                              className={config.color}
                            />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-foreground">
                              {config.label}
                            </Text>
                            {meter.meterNumber && (
                              <Text className="text-xs text-muted-foreground">
                                #{meter.meterNumber}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Badge variant="secondary" className="bg-card">
                            <Text className="text-[10px] font-semibold text-muted-foreground">
                              {meter._count?.readings || 0} readings
                            </Text>
                          </Badge>
                          <Icon
                            as={isExpanded ? ChevronUp : ChevronDown}
                            size={16}
                            className="text-muted-foreground"
                          />
                        </View>
                      </Pressable>
                      <View className="flex-row items-center gap-4">
                        <View className="flex-1">
                          <Text className="text-xs text-muted-foreground">
                            Current Reading
                          </Text>
                          <Text className="text-lg font-bold text-foreground">
                            {meter.lastReading}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-muted-foreground">
                            Price per Unit
                          </Text>
                          <Text className="text-lg font-bold text-foreground">
                            {formatKes(meter.pricePerUnit)}
                          </Text>
                        </View>
                      </View>
                      <Button
                        variant="outline"
                        onPress={() => setReadingMeter(meter)}
                        className="flex-row items-center justify-center gap-2">
                        <Icon as={Plus} size={14} className="text-foreground" />
                        <Text>Add Reading</Text>
                      </Button>
                      {isExpanded && (
                        <MeterReadingsList meterId={meter.id} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Invoices Section */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                Invoices
              </Text>
              <View className="flex-row gap-2">
                {INVOICE_FILTERS.map((filter) => (
                  <Pressable
                    key={filter.key}
                    onPress={() => onInvoiceFilterChange(filter.key)}
                    className="rounded-full px-3 py-1"
                    style={
                      invoiceFilter === filter.key ? styles.chipActive : styles.chipInactive
                    }>
                    <Text
                      className={`text-[10px] font-semibold ${
                        invoiceFilter === filter.key
                          ? 'text-white'
                          : 'text-muted-foreground'
                      }`}>
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {filteredInvoices.length === 0 ? (
              <View className="py-4">
                <Text className="text-center text-sm text-muted-foreground">
                  {invoiceFilter === 'all'
                    ? 'No invoices yet'
                    : `No ${invoiceFilter} invoices`}
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredInvoices.map((invoice) => (
                  <Pressable
                    key={invoice.id}
                    onPress={() => router.push(`/invoice/${invoice.id}`)}
                    className="gap-3 rounded-xl border border-border bg-muted p-3 active:bg-border">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-foreground">
                            {formatKes(invoice.amount)}
                          </Text>
                          <Badge
                            variant="secondary"
                            className={INVOICE_STATUS[invoice.status].bg}>
                            <Text
                              className={`text-[10px] font-semibold ${
                                INVOICE_STATUS[invoice.status].text
                              }`}>
                              {INVOICE_STATUS[invoice.status].label}
                            </Text>
                          </Badge>
                        </View>
                        <Text className="text-xs text-muted-foreground">
                          Due: {formatDateLong(invoice.dueDate)}
                        </Text>
                      </View>
                      <Icon as={Receipt} size={16} className="text-muted-foreground" />
                    </View>
                    {invoice.balanceDue !== '0' && (
                      <View className="flex-row items-center justify-between pt-2 border-t border-border">
                        <Text className="text-xs text-muted-foreground">Balance Due</Text>
                        <Text className="text-sm font-bold text-foreground">
                          {formatKes(invoice.balanceDue)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <AssignTenantModal
        open={assignTenantModalOpen}
        onOpenChange={setAssignTenantModalOpen}
        unitId={unitId}
      />

      <AssignMeterModal
        open={addMeterModalOpen}
        onOpenChange={setAddMeterModalOpen}
        unitId={unitId}
      />

      <RecordReadingDialog
        open={!!readingMeter}
        onOpenChange={(next) => {
          if (!next) setReadingMeter(null);
        }}
        meter={readingMeter}
      />
    </SafeAreaView>
  );
}
