import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  LogOut,
  FileMinus,
  HelpCircle,
  Shield,
} from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { ProfilePhotoPicker } from '@/components/account/profile-photo-picker';
import { ProfileForm } from '@/components/account/profile-form';
import { SignOutDialog } from '@/components/account/sign-out-dialog';
import { useStore } from '@/stores/use-store';
import { useTenancies } from '@/hooks/queries/use-tenancies';

export default function TenantAccountScreen() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const tenanciesQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });

  const activeTenancy = tenanciesQuery.data?.items?.[0];
  const property = activeTenancy?.unit?.property;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-white">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Icon as={ArrowLeft} size={20} className="text-slate-700" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-bold text-slate-900">Profile & Settings</Text>
          <Text className="text-xs text-slate-500">Manage account, lease & security</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 18 }}
        showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Header */}
        <View className="items-center bg-white rounded-2xl border border-slate-200 p-4">
          <ProfilePhotoPicker />
          <Text className="text-lg font-bold text-slate-900 mt-1">
            {user?.name ?? 'Resident'}
          </Text>
          <Text className="text-xs text-slate-500">{user?.email ?? ''}</Text>
          <Badge variant="secondary" className="mt-2 bg-teal-50 border-teal-200">
            <Text className="text-[11px] font-semibold text-teal-700">Resident / Tenant</Text>
          </Badge>
        </View>

        {/* Tenancy & Lease Section */}
        {activeTenancy ? (
          <Card className="rounded-2xl border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Your Tenancy
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Active lease at {property?.name ?? 'Property'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row items-center justify-between rounded-xl bg-slate-50 p-3">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
                    <Icon as={Building2} size={18} className="text-teal-800" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-900">
                      Unit {activeTenancy.unit?.unitNumber}
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      {property?.name ?? 'Home'}
                    </Text>
                  </View>
                </View>

                <Badge variant="outline" className="border-teal-300 bg-teal-50">
                  <Text className="text-[10px] font-bold text-teal-800">Active</Text>
                </Badge>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tenant)/tenancy/terminate')}
                className="flex-row items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                    <Icon as={FileMinus} size={16} className="text-rose-700" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-rose-900">
                      Terminate Tenancy / Vacate
                    </Text>
                    <Text className="text-[11px] text-rose-700">
                      Submit move-out notice to landlord
                    </Text>
                  </View>
                </View>
                <Icon as={ChevronRight} size={18} className="text-rose-400" />
              </TouchableOpacity>
            </CardContent>
          </Card>
        ) : null}

        {/* Profile Information & Security Forms */}
        <ProfileForm />

        {/* Session / Sign Out Card */}
        <Card className="rounded-2xl border-slate-200 bg-white">
          <CardContent className="p-4">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSignOutOpen(true)}
              className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                  <Icon as={LogOut} size={18} className="text-rose-600" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-rose-600">Sign Out</Text>
                  <Text className="text-xs text-slate-400">Log out of your account</Text>
                </View>
              </View>
              <Icon as={ChevronRight} size={18} className="text-slate-300" />
            </TouchableOpacity>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </SafeAreaView>
  );
}
