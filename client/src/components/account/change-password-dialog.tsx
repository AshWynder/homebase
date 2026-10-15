import React, { useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { KeyRound, Lock, Check } from 'lucide-react-native';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { useChangePassword } from '@/hooks/queries/use-auth';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        handleOpenChange(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Icon as={KeyRound} size={22} className="text-primary" />
          </View>
          <DialogTitle className="text-xl font-bold text-foreground">
            Change Password
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter your current password and choose a secure new one.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <View className="items-center justify-center py-6 gap-2">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Icon as={Check} size={24} className="text-primary" />
            </View>
            <Text className="text-base font-semibold text-foreground">
              Password Changed!
            </Text>
            <Text className="text-xs text-muted-foreground">
              Your password has been successfully updated.
            </Text>
          </View>
        ) : (
          <View className="gap-3.5 py-2">
            {error ? (
              <View className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <Text className="text-xs font-medium text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="gap-1.5">
              <Label nativeID="curr-pass" className="text-xs font-semibold text-foreground">
                Current Password
              </Label>
              <Input
                aria-labelledby="curr-pass"
                secureTextEntry
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                className="h-11 rounded-xl bg-muted"
              />
            </View>

            <View className="gap-1.5">
              <Label nativeID="new-pass" className="text-xs font-semibold text-foreground">
                New Password
              </Label>
              <Input
                aria-labelledby="new-pass"
                secureTextEntry
                placeholder="At least 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                className="h-11 rounded-xl bg-muted"
              />
            </View>

            <View className="gap-1.5">
              <Label nativeID="confirm-pass" className="text-xs font-semibold text-foreground">
                Confirm New Password
              </Label>
              <Input
                aria-labelledby="confirm-pass"
                secureTextEntry
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="h-11 rounded-xl bg-muted"
              />
            </View>
          </View>
        )}

        {!success && (
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11 rounded-xl"
              onPress={handleSubmit}
              disabled={changePassword.isPending}>
              {changePassword.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="font-semibold text-primary-foreground">Updating…</Text>
                </View>
              ) : (
                <Text className="font-semibold text-primary-foreground">Update Password</Text>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onPress={() => handleOpenChange(false)}
              disabled={changePassword.isPending}>
              <Text className="font-medium text-foreground">Cancel</Text>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
