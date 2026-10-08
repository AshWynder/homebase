import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserCheck, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  useAssignCaretaker,
  useProperties,
} from '@/hooks/queries/use-properties';
import {
  assignCaretakerFormSchema,
  type AssignCaretakerFormData,
} from '@/lib/schemas';
import type { Property, UserProfile } from '@/api/types';

interface AssignCaretakerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
}

/** Profile rows never carry `name` — it lives on the related User. */
function displayName(profile: UserProfile): string {
  return profile.user?.name ?? 'Caretaker';
}

function contactLine(profile: UserProfile): string {
  return profile.user?.email ?? profile.phone;
}

/**
 * Assigning a caretaker, in one dialog with two paths.
 *
 * The default is a create form: the owner hired somebody and wants them on the
 * building now, and a searchable directory would trade that for a wall of
 * names. The secondary section only ever lists caretakers *this owner already
 * has* — derived from their own property rows, so it is a handful of names at
 * most and never needs search. Its absence is the point: no properties with
 * caretakers, no section.
 */
export function AssignCaretakerDialog({
  open,
  onOpenChange,
  property,
}: AssignCaretakerDialogProps) {
  const assignCaretaker = useAssignCaretaker();
  const properties = useProperties();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignCaretakerFormData>({
    resolver: zodResolver(assignCaretakerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const currentCaretaker = property?.caretaker ?? null;

  const existingCaretakers = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    for (const row of properties.data ?? []) {
      const caretaker = row.caretaker;
      if (caretaker && caretaker.id !== currentCaretaker?.id) {
        byId.set(caretaker.id, caretaker);
      }
    }
    return [...byId.values()];
  }, [properties.data, currentCaretaker?.id]);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onCreate = (data: AssignCaretakerFormData) => {
    if (!property) return;
    assignCaretaker.mutate(
      {
        id: property.id,
        input: {
          mode: 'create',
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          password: data.password,
        },
      },
      {
        onSuccess: (updated) => {
          toast.success(
            `${displayName(updated.caretaker!)} assigned to ${property.name}`,
          );
          reset();
          onOpenChange(false);
        },
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  const onAssignExisting = (profile: UserProfile) => {
    if (!property) return;
    assignCaretaker.mutate(
      { id: property.id, input: { mode: 'existing', profileId: profile.id } },
      {
        onSuccess: () => {
          toast.success(
            `${displayName(profile)} assigned to ${property.name}`,
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  const isReplacing = !!currentCaretaker;
  const isPending = assignCaretaker.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReplacing ? 'Change Caretaker' : 'Assign Caretaker'}
          </DialogTitle>
          <DialogDescription>
            {property
              ? `Creates their login and assigns them to ${property.name} in one step. Share the email and password with them — they can change it later.`
              : 'Creates their login and assigns them in one step.'}
          </DialogDescription>
        </DialogHeader>

        {currentCaretaker ? (
          <View className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
            <Icon as={UserCheck} size={14} className="text-slate-500" />
            <Text className="text-xs text-slate-600">
              Currently assigned:{' '}
              <Text className="font-semibold text-slate-800">
                {displayName(currentCaretaker)}
              </Text>
            </Text>
          </View>
        ) : null}

        <ScrollView
          className="max-h-[420px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View className="gap-4">
            <View className="gap-2">
              <Label>Full name</Label>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Jane Smith"
                    autoCapitalize="words"
                  />
                )}
              />
              {errors.name && (
                <Text className="text-xs text-red-600">{errors.name.message}</Text>
              )}
            </View>

            <View className="gap-2">
              <Label>Email</Label>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="jane@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.email && (
                <Text className="text-xs text-red-600">{errors.email.message}</Text>
              )}
            </View>

            <View className="gap-2">
              <Label>Phone</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="0712345678"
                    keyboardType="phone-pad"
                  />
                )}
              />
              {errors.phone && (
                <Text className="text-xs text-red-600">{errors.phone.message}</Text>
              )}
            </View>

            <View className="gap-2">
              <Label>Password</Label>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="At least 8 characters"
                    secureTextEntry
                  />
                )}
              />
              {errors.password && (
                <Text className="text-xs text-red-600">{errors.password.message}</Text>
              )}
            </View>

            <View className="gap-2">
              <Label>Confirm password</Label>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Repeat the password"
                    secureTextEntry
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="text-xs text-red-600">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Secondary path: only this owner's own caretakers, so the list
                stays a few names and never becomes something to search. */}
            {existingCaretakers.length > 0 ? (
              <View className="gap-2 border-t border-slate-200 pt-4">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Or assign someone you already added
                </Text>
                {existingCaretakers.map((profile) => (
                  <Button
                    key={profile.id}
                    variant="outline"
                    disabled={isPending}
                    onPress={() => onAssignExisting(profile)}
                    className="justify-start gap-3">
                    <Icon as={UserCheck} size={15} className="text-teal-700" />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">
                        {displayName(profile)}
                      </Text>
                      <Text className="text-[11px] text-slate-500">
                        {contactLine(profile)}
                      </Text>
                    </View>
                  </Button>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <DialogFooter>
          <Button variant="outline" onPress={handleClose}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit(onCreate)} disabled={isPending}>
            <Icon as={UserPlus} size={14} className="text-white" />
            <Text>{isPending ? 'Assigning…' : isReplacing ? 'Replace' : 'Assign'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
