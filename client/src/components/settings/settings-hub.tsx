import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { LogOut, Palette, UserRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { ScreenHeader } from '@/components/owner/screen-header';
import { SignOutDialog } from '@/components/account/sign-out-dialog';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { TenantTerminateRow } from '@/components/settings/tenant-terminate-row';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/use-store';

interface SettingsHubProps {
  /** Shown as a badge under the name, e.g. "Property Owner". */
  roleLabel: string;
  /** Palette classes for the role badge, allowing each role its own accent. */
  roleBadgeClassName?: string;
  roleBadgeTextClassName?: string;
  profileHref: Href;
  displayHref: Href;
  /** Pushed screen (true) vs. a tab root (false). */
  showBack?: boolean;
  /** Tenants also get the lease-termination entry point. */
  isTenant?: boolean;
}

/**
 * The Settings landing screen shared by every role. It is a hub: the Account
 * section links to the Profile and Display screens, and (for tenants) the Lease
 * section exposes tenancy termination. Sign out lives here so it is one tap from
 * anywhere in the app.
 */
export function SettingsHub({
  roleLabel,
  roleBadgeClassName = 'border-primary/20 bg-primary/10',
  roleBadgeTextClassName = 'text-primary',
  profileHref,
  displayHref,
  showBack = false,
  isTenant = false,
}: SettingsHubProps) {
  const user = useStore((s) => s.user);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  const displayName = user?.name?.trim() || 'User';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Settings" showBack={showBack} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-[60px] gap-6"
        showsVerticalScrollIndicator={false}>
        <View className="items-center gap-1.5 rounded-2xl border border-border bg-card p-5">
          <Avatar size="xl" className="border border-border">
            {user?.image ? (
              <AvatarImage source={{ uri: user.image }} />
            ) : (
              <AvatarFallback className="bg-primary">
                <Text className="text-2xl font-bold text-primary-foreground">{initials}</Text>
              </AvatarFallback>
            )}
          </Avatar>
          <Text className="mt-1 text-lg font-bold text-foreground">{displayName}</Text>
          <Text className="text-xs text-muted-foreground">{user?.email ?? ''}</Text>
          <Badge variant="outline" className={roleBadgeClassName}>
            <Text className={cn('text-[11px] font-semibold', roleBadgeTextClassName)}>
              {roleLabel}
            </Text>
          </Badge>
        </View>

        <SettingsSection title="Account">
          <SettingsRow
            icon={UserRound}
            tone="primary"
            title="Profile"
            subtitle="Name, contact details and password"
            onPress={() => router.push(profileHref)}
          />
          <SettingsRow
            icon={Palette}
            tone="primary"
            title="Display"
            subtitle="Theme and text size"
            onPress={() => router.push(displayHref)}
          />
        </SettingsSection>

        {isTenant ? (
          <SettingsSection title="Lease">
            <TenantTerminateRow showToast={showToast} />
          </SettingsSection>
        ) : null}

        <SettingsSection>
          <SettingsRow
            icon={LogOut}
            tone="destructive"
            title="Sign out"
            subtitle="Log out of your account"
            right={<View />}
            onPress={() => setSignOutOpen(true)}
          />
        </SettingsSection>
      </ScrollView>

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
