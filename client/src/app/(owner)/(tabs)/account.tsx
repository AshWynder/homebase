import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/owner/screen-header';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSignOut } from '@/hooks/queries/use-auth';
import { useStore } from '@/stores/use-store';

export default function AccountScreen() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const signOut = useSignOut();

  const onSignOut = () => signOut.mutate();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Account" />

      <View className="gap-4 p-5">
        <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="gap-1">
            <Text className="text-sm text-slate-500">Name</Text>
            <Text className="text-base font-semibold text-slate-900">
              {user?.name ?? '—'}
            </Text>
          </View>
          <View className="gap-1">
            <Text className="text-sm text-slate-500">Email</Text>
            <Text className="text-base font-semibold text-slate-900">
              {user?.email ?? '—'}
            </Text>
          </View>
          <View className="gap-1">
            <Text className="text-sm text-slate-500">Phone</Text>
            <Text className="text-base font-semibold text-slate-900">
              {profile?.phone ?? '—'}
            </Text>
          </View>
          <View className="gap-1">
            <Text className="text-sm text-slate-500">Role</Text>
            <Text className="text-base font-semibold text-slate-900">
              {profile?.role ?? '—'}
            </Text>
          </View>
        </View>

        <Button variant="destructive" onPress={onSignOut} disabled={signOut.isPending}>
          <Text>{signOut.isPending ? 'Signing out…' : 'Sign out'}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}