import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { User, Mail, Phone, Shield, Lock, CheckCircle2 } from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { useUpdateProfile } from '@/hooks/queries/use-auth';
import { useStore } from '@/stores/use-store';
import { ChangePasswordDialog } from './change-password-dialog';

export function ProfileForm() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [nationalId, setNationalId] = useState(profile?.nationalId ?? '');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPhone(profile?.phone ?? '');
    setNationalId(profile?.nationalId ?? '');
  }, [user, profile]);

  const hasChanges =
    name.trim() !== (user?.name ?? '') ||
    email.trim() !== (user?.email ?? '') ||
    phone.trim() !== (profile?.phone ?? '') ||
    nationalId.trim() !== (profile?.nationalId ?? '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name cannot be blank');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Validation', 'Email cannot be blank');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone number cannot be blank');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim() || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile');
    }
  };

  return (
    <View className="gap-5">
      {/* Personal Info Card */}
      <Card className="rounded-2xl border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Personal Information
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Update your account details and contact information.
          </CardDescription>
        </CardHeader>

        <CardContent className="gap-4">
          <View className="gap-1.5">
            <Label nativeID="name-field" className="text-xs font-semibold text-slate-700">
              Full Name
            </Label>
            <View className="relative">
              <Input
                aria-labelledby="name-field"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                className="h-11 rounded-xl bg-slate-50 pl-10"
              />
              <View className="absolute left-3.5 top-3">
                <Icon as={User} size={18} className="text-slate-400" />
              </View>
            </View>
          </View>

          <View className="gap-1.5">
            <Label nativeID="email-field" className="text-xs font-semibold text-slate-700">
              Email Address
            </Label>
            <View className="relative">
              <Input
                aria-labelledby="email-field"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                className="h-11 rounded-xl bg-slate-50 pl-10"
              />
              <View className="absolute left-3.5 top-3">
                <Icon as={Mail} size={18} className="text-slate-400" />
              </View>
            </View>
          </View>

          <View className="gap-1.5">
            <Label nativeID="phone-field" className="text-xs font-semibold text-slate-700">
              Phone Number
            </Label>
            <View className="relative">
              <Input
                aria-labelledby="phone-field"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+254 700 000 000"
                className="h-11 rounded-xl bg-slate-50 pl-10"
              />
              <View className="absolute left-3.5 top-3">
                <Icon as={Phone} size={18} className="text-slate-400" />
              </View>
            </View>
          </View>

          <View className="gap-1.5">
            <Label nativeID="natid-field" className="text-xs font-semibold text-slate-700">
              National ID / Passport (Optional)
            </Label>
            <View className="relative">
              <Input
                aria-labelledby="natid-field"
                value={nationalId}
                onChangeText={setNationalId}
                placeholder="e.g. 12345678"
                className="h-11 rounded-xl bg-slate-50 pl-10"
              />
              <View className="absolute left-3.5 top-3">
                <Icon as={Shield} size={18} className="text-slate-400" />
              </View>
            </View>
          </View>

          <Button
            className="mt-2 h-11 rounded-xl bg-teal-700 active:bg-teal-800"
            disabled={!hasChanges || updateProfile.isPending}
            onPress={handleSave}>
            {updateProfile.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="font-semibold text-white">Saving changes…</Text>
              </View>
            ) : savedSuccess ? (
              <View className="flex-row items-center gap-1.5">
                <Icon as={CheckCircle2} size={16} className="text-white" />
                <Text className="font-semibold text-white">Saved Successfully</Text>
              </View>
            ) : (
              <Text className="font-semibold text-white">Save Changes</Text>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security & Password Card */}
      <Card className="rounded-2xl border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Security & Login
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Manage your password to protect your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-slate-200 flex-row items-center justify-between px-4"
            onPress={() => setPasswordDialogOpen(true)}>
            <View className="flex-row items-center gap-2.5">
              <Icon as={Lock} size={18} className="text-slate-600" />
              <Text className="font-medium text-slate-800">Change Password</Text>
            </View>
            <Text className="text-xs font-semibold text-teal-700">Update</Text>
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </View>
  );
}
