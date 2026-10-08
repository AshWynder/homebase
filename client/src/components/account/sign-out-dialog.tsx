import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { LogOut, AlertTriangle } from 'lucide-react-native';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { useSignOut } from '@/hooks/queries/use-auth';

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const signOut = useSignOut();

  const handleConfirm = () => {
    signOut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center sm:items-center">
          <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
            <Icon as={LogOut} size={26} className="text-rose-600" />
          </View>
          <DialogTitle className="text-center text-xl font-bold text-slate-900">
            Sign out of Homebase?
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-500 mt-1">
            You will need to enter your email and password next time you sign in to access your properties, leases, and chats.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex-col gap-2.5 sm:flex-col">
          <Button
            variant="destructive"
            className="w-full h-12 rounded-xl bg-rose-600 active:bg-rose-700"
            onPress={handleConfirm}
            disabled={signOut.isPending}>
            {signOut.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="font-semibold text-white">Signing out…</Text>
              </View>
            ) : (
              <Text className="font-semibold text-white">Yes, sign out</Text>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200"
            onPress={() => onOpenChange(false)}
            disabled={signOut.isPending}>
            <Text className="font-medium text-slate-700">Cancel</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
