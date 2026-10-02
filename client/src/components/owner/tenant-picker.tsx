import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Search, User, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useUsers } from '@/hooks/queries/use-auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { profileDisplayName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/api/types';

/**
 * The list scrolls, but not without a bound.
 *
 * The Dialog sizes itself to its content and caps at `maxWidth: 420`, so an
 * unbounded list would push the Cancel/Submit footer off the bottom of a phone
 * screen. Clamping here keeps the footer reachable no matter how many
 * unassigned tenants exist.
 */
const MAX_LIST_HEIGHT = 200;

interface TenantPickerProps {
  /** The chosen profile, or null. Carries the object, not just the id, so the
   *  selection can still be rendered after a search narrows it out of the list. */
  selected: UserProfile | null;
  onChange: (profile: UserProfile | null) => void;
  error?: string;
  label?: string;
}

/**
 * Searchable picker over the user directory for assigning a tenant to a unit.
 *
 * Reads `userProfile`, not tenancies, so it can find someone who has never been
 * housed. The server restricts the result to profiles with no *active* tenancy,
 * which is what makes the choice safe: a tenant already living in another unit
 * simply is not offered.
 *
 * Search is server-side and debounced — the directory is unbounded, so filtering
 * a prefetched page locally would mean re-downloading it on every keystroke.
 */
export function TenantPicker({
  selected,
  onChange,
  error,
  label = 'Tenant',
}: TenantPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const query = debouncedSearch.trim();

  const usersQuery = useUsers({ role: 'TENANT', search: query || undefined });

  const profiles = usersQuery.data?.items ?? [];
  const trimmed = search.trim();

  // True in the window between a keystroke and its debounced value landing, so
  // the stale result set for the previous term is replaced by skeletons instead
  // of briefly showing rows that no longer match what is in the box.
  const isSearching = query !== '' && query !== trimmed;

  const pick = (profile: UserProfile) => {
    onChange(profile);
    setSearch('');
  };

  if (selected) {
    return (
      <View className="gap-2">
        <Label>{label}</Label>
        <View className="flex-row items-center justify-between gap-3 rounded-xl border-2 border-primary bg-white p-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-slate-900">
              {profileDisplayName(selected)}
            </Text>
            <Text className="text-sm text-slate-500">
              {[selected.user?.email, selected.phone].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel="Change selected tenant"
            className="rounded-lg border border-slate-200 px-3 py-1.5 active:bg-slate-50">
            <Text className="text-xs font-semibold text-primary">Change</Text>
          </Pressable>
        </View>
        {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Label>{label}</Label>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View>
          <Icon
            as={Search}
            size={16}
            className="absolute left-3 top-3 z-10 text-slate-400"
          />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone or email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className={cn(
              'rounded-lg border-2 border-primary pl-9',
              'focus-visible:border-primary focus-visible:ring-primary/30',
              search && 'pr-9',
            )}
          />
          {search ? (
            <Pressable
              hitSlop={10}
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              className="absolute right-2 top-2 z-10 p-1">
              <Icon as={X} size={16} className="text-slate-400" />
            </Pressable>
          ) : null}
        </View>

        <View style={{ maxHeight: MAX_LIST_HEIGHT }} className="mt-2">
          {usersQuery.isError ? (
            <PickerMessage
              title="Could not load tenants"
              subtitle={usersQuery.error instanceof Error ? usersQuery.error.message : undefined}
            />
          ) : usersQuery.isPending || isSearching ? (
            <View className="gap-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </View>
          ) : (
            <FlatList
              data={profiles}
              keyExtractor={(item) => item.id}
              // Without this the first tap on a row only dismisses the keyboard
              // instead of selecting, which makes the picker feel broken. Same
              // prop the sign-in screen and maintenance form already use.
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={profiles.length ? { gap: 8 } : undefined}
              ListEmptyComponent={
                <PickerMessage
                  title={query ? 'No tenant matches your search' : 'No unassigned tenants'}
                  subtitle={
                    query
                      ? 'Try a different name, phone number or email.'
                      : 'Everyone registered has a tenancy already. New tenants appear here once they sign up.'
                  }
                />
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => pick(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${profileDisplayName(item)}`}
                  className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <Icon as={User} size={16} className="text-slate-500" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-bold text-slate-900">
                      {profileDisplayName(item)}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {[item.user?.email, item.phone].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>

        {!usersQuery.isPending && !usersQuery.isError && profiles.length > 0 ? (
          <Text className="mt-1 text-xs text-slate-400">
            Only tenants without an active tenancy are listed.
          </Text>
        ) : null}
      </KeyboardAvoidingView>

      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}

/** Centered empty/error state, sized for a picker rather than a full screen. */
function PickerMessage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="items-center gap-1 px-4 py-6">
      <Text className="text-sm font-semibold text-slate-700">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-xs text-slate-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}
