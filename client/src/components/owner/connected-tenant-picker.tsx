import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Check, Search, UserRound, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { profileDisplayName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Tenancy, UserProfile } from '@/api/types';

/** Clamped so the surrounding Dialog footer always stays reachable. */
const MAX_LIST_HEIGHT = 200;

/**
 * The server caps nothing here, but the set of people an owner can currently
 * reach is bounded by their own occupancy, so one request is enough and keeps
 * the picker from showing a spinner on a list that has no second page.
 */
const TENANCY_LIMIT = 200;

interface ConnectedTenantPickerProps {
  /** The chosen profile, or null. */
  selected: UserProfile | null;
  onChange: (profile: UserProfile | null) => void;
  error?: string;
  /**
   * Narrows the roster to one property. Optional, and purely a convenience:
   * the server accepts a tenant who is housed anywhere under the owner, so this
   * only ever removes choices the send would have accepted anyway.
   */
  propertyId?: string;
}

/**
 * Picker over tenants the owner can actually reach.
 *
 * Deliberately reads `tenancy` rather than the user directory. The directory
 * excludes anyone who already holds an active tenancy — exactly the people a
 * notice needs to reach — so `TenantPicker` would offer the one set of profiles
 * the server rejects with a 404. Deduplication matters for the same reason: the
 * server collapses an audience to distinct tenants, and showing someone twice
 * would suggest they receive two copies.
 */
export function ConnectedTenantPicker({
  selected,
  onChange,
  error,
  propertyId,
}: ConnectedTenantPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);

  const tenanciesQuery = useTenancies({
    isActive: true,
    limit: TENANCY_LIMIT,
    ...(propertyId ? { propertyId } : {}),
  });

  const options = useMemo(() => dedupeTenancies(tenanciesQuery.data?.items), [tenanciesQuery.data?.items]);

  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return options;

    return options.filter((option) => {
      const name = profileDisplayName(option.profile).toLowerCase();
      return name.includes(term) || option.whereLabel.toLowerCase().includes(term);
    });
  }, [options, debouncedSearch]);

  const isLoading = tenanciesQuery.isPending && !tenanciesQuery.data;

  return (
    <View className="gap-2">
      <Label>Notify</Label>

      <View>
        <Icon as={Search} size={16} className="absolute left-3 top-3 text-slate-400" />
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search your tenants"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className={cn(
            'rounded-lg border-2 border-primary pl-9',
            'focus-visible:border-primary focus-visible:ring-primary/30',
            !!search && 'pr-9',
          )}
        />
        {search ? (
          <Pressable
            hitSlop={10}
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="absolute right-2 top-2 p-1">
            <Icon as={X} size={16} className="text-slate-400" />
          </Pressable>
        ) : null}
      </View>

      {/* The selected choice is held outside the list, so a search that filters
          it out must not make the form look empty. */}
      {selected ? (
        <View className="flex-row items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
            <Icon as={UserRound} size={16} className="text-teal-700" />
          </View>
          <Text className="flex-1 text-sm font-bold text-teal-900" numberOfLines={1}>
            {profileDisplayName(selected)}
          </Text>
          <Pressable
            hitSlop={10}
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
            className="p-1">
            <Icon as={X} size={16} className="text-teal-700" />
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View className="gap-2" style={{ maxHeight: MAX_LIST_HEIGHT }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </View>
      ) : visible.length === 0 ? (
        <View className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <Text className="text-center text-xs text-slate-500">
            {tenanciesQuery.data?.total === 0
              ? 'None of your tenants have an active tenancy yet.'
              : 'No tenant matches that search.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.profile.id}
          style={{ maxHeight: MAX_LIST_HEIGHT }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View className="h-1.5" />}
          renderItem={({ item }) => {
            const profile = item.profile;
            const active = selected?.id === profile.id;

            return (
              <Pressable
                onPress={() => onChange(profile)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={cn(
                  'flex-row items-center gap-3 rounded-xl border p-3 active:bg-slate-50',
                  active ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white',
                )}>
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <Icon as={UserRound} size={16} className="text-slate-600" />
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {profileDisplayName(profile)}
                  </Text>
                  <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                    {item.whereLabel}
                  </Text>
                </View>

                {active ? <Icon as={Check} size={16} className="text-teal-700" /> : null}
              </Pressable>
            );
          }}
        />
      )}

      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}

interface ConnectedTenant {
  profile: UserProfile;
  whereLabel: string;
}

/**
 * Collapses a tenant's active tenancies into one row, keeping the first address
 * for context. Mirrors the server's recipient dedupe so the picker cannot offer
 * the same person twice.
 */
function dedupeTenancies(tenancies: Tenancy[] | undefined): ConnectedTenant[] {
  if (!tenancies) return [];

  const byTenant = new Map<string, ConnectedTenant>();

  for (const tenancy of tenancies) {
    if (!tenancy.tenant || byTenant.has(tenancy.tenant.id)) continue;

    const property = tenancy.unit?.property;
    byTenant.set(tenancy.tenant.id, {
      profile: tenancy.tenant,
      whereLabel: [tenancy.unit?.unitNumber, property?.name].filter(Boolean).join(' • '),
    });
  }

  return [...byTenant.values()].sort((a, b) =>
    profileDisplayName(a.profile).localeCompare(profileDisplayName(b.profile)),
  );
}