import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, ChevronRight } from 'lucide-react-native';

import { ScreenHeader } from '@/components/owner/screen-header';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { ProfilePhotoPicker } from '@/components/account/profile-photo-picker';
import { ProfileForm } from '@/components/account/profile-form';
import { SignOutDialog } from '@/components/account/sign-out-dialog';
import { useStore } from '@/stores/use-store';

export default function CaretakerAccountScreen() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Account" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 18 }}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View className="items-center bg-white rounded-2xl border border-slate-200 p-4">
          <ProfilePhotoPicker />
          <Text className="text-lg font-bold text-slate-900 mt-1">
            {user?.name ?? 'Property Caretaker'}
          </Text>
          <Text className="text-xs text-slate-500">{user?.email ?? ''}</Text>
          <Badge variant="secondary" className="mt-2 bg-indigo-50 border-indigo-200">
            <Text className="text-[11px] font-semibold text-indigo-700">Property Caretaker</Text>
          </Badge>
        </View>

        {/* Profile Details & Password Form */}
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
