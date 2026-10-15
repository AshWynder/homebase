import { Building2 } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/account/profile-form';
import { ProfilePhotoPicker } from '@/components/account/profile-photo-picker';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/use-store';

interface ProfileSettingsProps {
  roleLabel: string;
  roleBadgeClassName?: string;
  roleBadgeTextClassName?: string;
  isTenant?: boolean;
  showBack?: boolean;
}

/** The tenant's active lease summary. Mounted only for tenants so the query
 *  does not run for owners or caretakers. */
function TenantLeaseCard() {
  const profile = useStore((s) => s.profile);
  const tenanciesQuery = useTenancies({ tenantId: profile?.id, isActive: true, limit: 1 });
  const activeTenancy = tenanciesQuery.data?.items?.[0];

  if (!activeTenancy) {
    return null;
  }

  const property = activeTenancy.unit?.property;

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-foreground">Your Tenancy</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Active lease at {property?.name ?? 'Property'}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <View className="flex-row items-center justify-between rounded-xl bg-muted p-3">
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon as={Building2} size={18} className="text-primary" />
            </View>
            <View>
              <Text className="text-xs font-bold text-foreground">
                Unit {activeTenancy.unit?.unitNumber}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {property?.name ?? 'Home'}
              </Text>
            </View>
          </View>

          <Badge variant="outline" className="border-primary/30 bg-primary/10">
            <Text className="text-[10px] font-bold text-primary">Active</Text>
          </Badge>
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * The Profile screen: the reusable personal-details and password form, plus the
 * avatar picker. Tenants additionally see their active lease above the form.
 */
export function ProfileSettings({
  roleLabel,
  roleBadgeClassName = 'border-primary/20 bg-primary/10',
  roleBadgeTextClassName = 'text-primary',
  isTenant = false,
  showBack = true,
}: ProfileSettingsProps) {
  const user = useStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Profile" showBack={showBack} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-[60px] gap-5"
        showsVerticalScrollIndicator={false}>
        <View className="items-center gap-1.5 rounded-2xl border border-border bg-card p-4">
          <ProfilePhotoPicker />
          <Text className="mt-1 text-lg font-bold text-foreground">
            {user?.name ?? 'User'}
          </Text>
          <Text className="text-xs text-muted-foreground">{user?.email ?? ''}</Text>
          <Badge variant="outline" className={roleBadgeClassName}>
            <Text className={cn('text-[11px] font-semibold', roleBadgeTextClassName)}>
              {roleLabel}
            </Text>
          </Badge>
        </View>

        {isTenant ? <TenantLeaseCard /> : null}

        <ProfileForm />
      </ScrollView>
    </SafeAreaView>
  );
}
