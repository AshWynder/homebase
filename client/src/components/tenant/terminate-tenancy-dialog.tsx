import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CalendarClock, FileMinus, MessageSquareText } from 'lucide-react-native';

import type { Tenancy } from '@/api/types';
import {
  terminateTenancyFormSchema,
  type TerminateTenancyFormData,
} from '@/lib/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useTerminateTenancy } from '@/hooks/queries/use-tenancies';
import { formatDateLong } from '@/lib/format';
import { cn } from '@/lib/utils';

const REASONS = [
  'Relocating for work or school',
  'Moving to a bigger home',
  'Moving to a smaller home',
  'End of lease',
  'Budget reasons',
  'Maintenance concerns',
  'Personal reasons',
] as const;

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so an inline literal re-dispatches from inside the render phase and hangs the app.
const styles = StyleSheet.create({
  multilineTopAlign: { textAlignVertical: 'top' },
});

interface TerminateTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenancy: Tenancy;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function defaultMoveOutDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

export function TerminateTenancyDialog({
  open,
  onOpenChange,
  tenancy,
  onSuccess,
  onError,
}: TerminateTenancyDialogProps) {
  const terminateTenancy = useTerminateTenancy();
  const form = useForm<TerminateTenancyFormData>({
    resolver: zodResolver(terminateTenancyFormSchema),
    defaultValues: {
      moveOutDate: defaultMoveOutDate(),
      reason: REASONS[0],
      notes: '',
    },
  });

  const moveOutDate = form.watch('moveOutDate');
  const selectedReason = form.watch('reason');
  const propertyName = tenancy.unit?.property?.name ?? 'your home';
  const unitNumber = tenancy.unit?.unitNumber ?? 'the unit';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({
        moveOutDate: defaultMoveOutDate(),
        reason: REASONS[0],
        notes: '',
      });
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: TerminateTenancyFormData) => {
    try {
      await terminateTenancy.mutateAsync({
        id: tenancy.id,
        input: {
          endDate: values.moveOutDate.toISOString(),
          reason: values.reason,
          notes: values.notes?.trim() || undefined,
        },
      });
      handleOpenChange(false);
      onSuccess('Move-out notice submitted. Your landlord has been notified.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not submit move-out notice.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92%] sm:max-w-lg">
        <DialogHeader>
          <View className="mb-1 h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <Icon as={FileMinus} size={22} className="text-destructive" />
          </View>
          <DialogTitle className="text-xl font-bold text-foreground">
            Terminate tenancy
          </DialogTitle>
          <DialogDescription className="text-sm leading-5 text-muted-foreground">
            Send your move-out date and reason to the property team for Unit {unitNumber} at{' '}
            {propertyName}.
          </DialogDescription>
        </DialogHeader>

        <ScrollView
          className="max-h-[520px]"
          contentContainerClassName="gap-3.5 py-1"
          showsVerticalScrollIndicator={false}>
          <View className="rounded-2xl border border-border bg-muted p-3">
            <View className="flex-row items-center gap-2">
              <Icon as={CalendarClock} size={16} className="text-muted-foreground" />
              <Text className="text-xs font-bold text-foreground">
                Current move-out date
              </Text>
            </View>
            <Text className="mt-1 text-xs text-muted-foreground">
              {moveOutDate ? formatDateLong(moveOutDate) : 'Choose a date'}
            </Text>
          </View>

          <View className="gap-1.5">
            <Label nativeID="move-out-date" className="text-xs font-semibold text-foreground">
              Move-out date
            </Label>
            <Controller
              control={form.control}
              name="moveOutDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minimumDate={new Date()}
                  placeholder="Choose move-out date"
                  className="h-11 rounded-xl bg-muted"
                />
              )}
            />
            {form.formState.errors.moveOutDate ? (
              <Text className="text-[11px] font-medium text-destructive">
                {form.formState.errors.moveOutDate.message}
              </Text>
            ) : null}
          </View>

          <View className="gap-2">
            <Label className="text-xs font-semibold text-foreground">
              Reason for moving out
            </Label>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <View className="flex-row flex-wrap gap-2">
                  {REASONS.map((reason) => {
                    const active = selectedReason === reason;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => field.onChange(reason)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        className={cn(
                          'rounded-xl border px-3 py-2',
                          active
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card active:bg-accent',
                        )}>
                        <Text
                          className={cn(
                            'text-xs',
                            active ? 'font-bold text-primary' : 'font-medium text-foreground',
                          )}>
                          {reason}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
            {form.formState.errors.reason ? (
              <Text className="text-[11px] font-medium text-destructive">
                {form.formState.errors.reason.message}
              </Text>
            ) : null}
          </View>

          <View className="gap-1.5">
            <Label nativeID="move-out-notes" className="text-xs font-semibold text-foreground">
              Remarks
            </Label>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <View className="relative">
                  <Input
                    aria-labelledby="move-out-notes"
                    multiline
                    numberOfLines={4}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    placeholder="Share anything helpful: inspection timing, handover plans, or concerns."
                    className="min-h-24 rounded-xl bg-muted p-3 pr-10 text-sm"
                    style={styles.multilineTopAlign}
                  />
                  <View className="absolute right-3 top-3">
                    <Icon as={MessageSquareText} size={16} className="text-muted-foreground" />
                  </View>
                </View>
              )}
            />
            {form.formState.errors.notes ? (
              <Text className="text-[11px] font-medium text-destructive">
                {form.formState.errors.notes.message}
              </Text>
            ) : (
              <Text className="text-[11px] text-muted-foreground">
                This will be visible to the owner and caretaker in Activity Hub.
              </Text>
            )}
          </View>
        </ScrollView>

        <DialogFooter className="mt-1 flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            className="h-12 w-full rounded-xl"
            disabled={terminateTenancy.isPending}
            onPress={form.handleSubmit(onSubmit)}>
            {terminateTenancy.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="font-semibold text-white">Submitting...</Text>
              </View>
            ) : (
              <Text className="font-semibold text-white">Submit move-out notice</Text>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            disabled={terminateTenancy.isPending}
            onPress={() => handleOpenChange(false)}>
            <Text className="font-medium text-foreground">Cancel</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
