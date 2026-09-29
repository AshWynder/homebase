import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { CreateTenancyDialog } from '@/components/owner/create-tenancy-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useProperties } from '@/hooks/queries/use-properties';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatKes, tenantName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ChevronRight, Clock, Search, X } from 'lucide-react-native';

type SelectOption = { value: string; label: string };

const ALL_PROPERTIES: SelectOption = { value: 'all', label: 'All properties' };

export default function TenanciesScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [property, setProperty] = useState<Option | undefined>(ALL_PROPERTIES);
  const [search, setSearch] = useState('');

  const properties = useProperties();
  const tenancies = useTenancies({
    isActive: true,
    propertyId:
      property && property.value !== ALL_PROPERTIES.value ? property.value : undefined,
  });
  const { visible, message, type, showToast, hideToast } = useToast();

  const propertyOptions = useMemo<SelectOption[]>(
    () => [
      ALL_PROPERTIES,
      ...(properties.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties.data],
  );

  const selectedPropertyId =
    property && property.value !== ALL_PROPERTIES.value ? property.value : undefined;

  // Client-side tenant name search over the owner's (already scoped) tenancies.
  const query = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const items = tenancies.data?.items ?? [];
    if (!query) return items;
    return items.filter((item) => tenantName(item).toLowerCase().includes(query));
  }, [tenancies.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== undefined;
  const showPropertyName = selectedPropertyId === undefined;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Active Tenancies"
        onAdd={() => setCreateOpen(true)}
        addLabel="Add tenancy"
      />

      <View className="gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <Select value={property} onValueChange={setProperty}>
          <SelectTrigger className="w-full rounded-lg border-2 border-primary">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            {propertyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <View>
          <Icon as={Search} size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search tenants by name"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className={cn(
              'rounded-lg border-2 border-primary pl-9',
              'focus-visible:border-primary focus-visible:ring-primary/30',
              search.length > 0 && 'pr-9',
            )}
          />
          {search.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setSearch('')}
              accessibilityLabel="Clear search"
              className="absolute right-2 top-2 p-1">
              <Icon as={X} size={16} className="text-slate-400" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {tenancies.isLoading ? (
        <ListSkeleton />
      ) : tenancies.isError ? (
        <ListMessage
          title="Couldn't load tenancies"
          subtitle={(tenancies.error as Error).message}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            isFiltered ? (
              <ListMessage
                title="No tenants found"
                subtitle="Try a different search or property filter."
              />
            ) : (
              <ListMessage
                title="No active tenancies"
                subtitle="Tap the + button to assign a tenant to a unit."
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/tenancy/${item.id}`)}
              className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-slate-900">{tenantName(item)}</Text>
                  <Text className="text-sm text-slate-500">
                    {showPropertyName
                      ? `${item.unit?.property?.name ?? 'Property'} • Unit ${item.unit?.unitNumber ?? '—'}`
                      : `Unit ${item.unit?.unitNumber ?? '—'}`}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1">
                    <Icon as={Clock} size={13} className="text-slate-400" />
                    <Text className="text-xs text-slate-500">Ends: {formatDate(item.endDate)}</Text>
                  </View>
                </View>
                <View className="items-end gap-2">
                  <Badge variant="secondary" className="bg-emerald-100">
                    <Text className="text-[11px] font-semibold text-emerald-800">
                      {item.isActive ? 'ACTIVE' : 'ENDED'}
                    </Text>
                  </Badge>
                  <Icon as={ChevronRight} size={18} className="text-slate-400" />
                </View>
              </View>

              <View className="border-t border-slate-100 pt-3">
                <Text className="text-lg font-bold text-slate-900">
                  {formatKes(item.rentAmount)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <CreateTenancyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onToast={showToast}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
