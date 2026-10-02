import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, Globe2, UserRound } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useProperties } from '@/hooks/queries/use-properties';
import { useSendNotice } from '@/hooks/queries/use-notices';
import { sendNoticeFormSchema, type SendNoticeFormData } from '@/lib/schemas';
import { profileDisplayName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NOTICE_LIMITS } from '@/api/notices';
import type { NoticeAudience, UserProfile } from '@/api/types';

import { ConnectedTenantPicker } from './connected-tenant-picker';

interface SendNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects a property when the owner came from one property's context. */
  initialPropertyId?: string | null;
  /** Called after a successful send so the caller can navigate to the notice. */
  onSent?: (id: string) => void;
}

const AUDIENCE_OPTIONS: readonly {
  value: NoticeAudience;
  label: string;
  hint: string;
  icon: typeof Globe2;
}[] = [
  {
    value: 'ALL_PROPERTIES',
    label: 'All properties',
    hint: 'Every tenant you house',
    icon: Globe2,
  },
  {
    value: 'PROPERTY',
    label: 'One property',
    hint: 'Everyone in a single property',
    icon: Building2,
  },
  {
    value: 'TENANT',
    label: 'One tenant',
    hint: 'A single person',
    icon: UserRound,
  },
];

/**
 * Composes and sends a notice.
 *
 * The audience is chosen before anything is typed, because it decides which
 * target control appears — asking for a title first and then revealing a
 * property picker underneath feels like the form is changing shape under the
 * user. Targets are cleared when the audience changes rather than hidden, so a
 * stale property or tenant can never ride along in the payload.
 */
export function SendNoticeDialog({
  open,
  onOpenChange,
  initialPropertyId,
  onSent,
}: SendNoticeDialogProps) {
  const sendNotice = useSendNotice();
  const properties = useProperties();
  const [selectedTenant, setSelectedTenant] = useState<UserProfile | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<SendNoticeFormData>({
    resolver: zodResolver(sendNoticeFormSchema),
    defaultValues: {
      audience: 'ALL_PROPERTIES',
      title: '',
      message: '',
      propertyId: initialPropertyId ?? undefined,
      tenantId: undefined,
    },
  });

  const audience = watch('audience');
  const title = watch('title') ?? '';
  const message = watch('message') ?? '';
  const propertyId = watch('propertyId');

  const onSubmit = (data: SendNoticeFormData) => {
    // Built from the audience rather than spread, so a target belonging to a
    // different audience can never be sent even if state drifted.
    const payload =
      data.audience === 'PROPERTY'
        ? {
            title: data.title,
            message: data.message,
            audience: data.audience,
            propertyId: data.propertyId,
          }
        : data.audience === 'TENANT'
          ? {
              title: data.title,
              message: data.message,
              audience: data.audience,
              tenantId: data.tenantId,
            }
          : {
              title: data.title,
              message: data.message,
              audience: data.audience,
            };

    sendNotice.mutate(payload, {
      onSuccess: (notice) => {
        toast.success(
          data.audience === 'ALL_PROPERTIES'
            ? 'Notice sent to all tenants'
            : 'Notice sent',
        );
        reset();
        setSelectedTenant(null);
        onOpenChange(false);
        onSent?.(notice.id);
      },
      onError: (error) => {
        toast.error((error as Error).message);
      },
    });
  };

  const chooseAudience = (next: NoticeAudience) => {
    setValue('audience', next);
    clearErrors(['propertyId', 'tenantId']);

    // Clearing both is the whole point: whichever target survives would
    // otherwise be silently ignored by the payload builder, and the form would
    // still show it as chosen.
    setValue('propertyId', undefined);
    setValue('tenantId', undefined);
    setSelectedTenant(null);
  };

  const close = () => {
    reset();
    setSelectedTenant(null);
    onOpenChange(false);
  };

  const selectedProperty = properties.data?.find((p) => p.id === propertyId);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notice</DialogTitle>
          <DialogDescription>
            Tenants see this in their Notices tab and on their home bell.
          </DialogDescription>
        </DialogHeader>

        <ScrollView
          className="max-h-[440px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            {/* Who it reaches */}
            <View className="gap-2">
              <Label>Who should receive this?</Label>
              {AUDIENCE_OPTIONS.map((option) => {
                const active = audience === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => chooseAudience(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    className={cn(
                      'flex-row items-center gap-3 rounded-xl border-2 p-3',
                      active ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white',
                    )}>
                    <View
                      className={cn(
                        'h-9 w-9 items-center justify-center rounded-lg',
                        active ? 'bg-teal-100' : 'bg-slate-100',
                      )}>
                      <Icon
                        as={option.icon}
                        size={16}
                        className={active ? 'text-teal-700' : 'text-slate-500'}
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className={cn(
                          'text-sm font-bold',
                          active ? 'text-teal-900' : 'text-slate-900',
                        )}>
                        {option.label}
                      </Text>
                      <Text
                        className={cn(
                          'text-[11px]',
                          active ? 'text-teal-700' : 'text-slate-500',
                        )}>
                        {option.hint}
                      </Text>
                    </View>

                    {/* Radio dot, so the choice reads as exclusive at a glance. */}
                    <View
                      className={cn(
                        'h-5 w-5 items-center justify-center rounded-full border-2',
                        active ? 'border-teal-600' : 'border-slate-300',
                      )}>
                      {active ? (
                        <View className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* The target the audience implies */}
            {audience === 'PROPERTY' ? (
              <View className="gap-2">
                <Label>Property</Label>
                <Controller
                  control={control}
                  name="propertyId"
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={
                        selectedProperty
                          ? { value: selectedProperty.id, label: selectedProperty.name }
                          : undefined
                      }
                      onValueChange={(option) => onChange(option?.value)}>
                      <SelectTrigger className="w-full rounded-lg border-2 border-primary">
                        <SelectValue placeholder="Choose a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.data?.map((property) => (
                          <SelectItem
                            key={property.id}
                            value={property.id}
                            label={property.name}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyId ? (
                  <Text className="text-xs text-red-600">{errors.propertyId.message}</Text>
                ) : null}
              </View>
            ) : null}

            {audience === 'TENANT' ? (
              <Controller
                control={control}
                name="tenantId"
                render={({ field: { onChange } }) => (
                  <ConnectedTenantPicker
                    selected={selectedTenant}
                    propertyId={propertyId}
                    onChange={(profile) => {
                      setSelectedTenant(profile);
                      onChange(profile?.id ?? undefined);
                    }}
                    error={errors.tenantId?.message}
                  />
                )}
              />
            ) : null}

            {/* Title */}
            <View className="gap-2">
              <Label>Title</Label>
              <Controller
                control={control}
                name="title"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Water shutdown on Saturday"
                    maxLength={NOTICE_LIMITS.maxTitleLength}
                    className="rounded-lg border-2 border-primary"
                  />
                )}
              />
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-xs text-red-600">{errors.title?.message ?? ' '}</Text>
                <Text className="text-[11px] font-semibold text-slate-400">
                  {title.length}/{NOTICE_LIMITS.maxTitleLength}
                </Text>
              </View>
            </View>

            {/* Body */}
            <View className="gap-2">
              <Label>Message</Label>
              <Controller
                control={control}
                name="message"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Water will be off from 9am to 1pm on Saturday for pipe repairs. Please store what you need in advance."
                    placeholderTextColor="#94A3B8"
                    multiline
                    textAlignVertical="top"
                    // Hard-capped at the server limit, so an over-long body is
                    // impossible to send rather than merely flagged.
                    maxLength={NOTICE_LIMITS.maxMessageLength}
                    className={cn(
                      'rounded-2xl border-2 bg-white p-4 text-slate-900',
                      errors.message ? 'border-rose-300' : 'border-primary',
                    )}
                    style={{ minHeight: 140, fontSize: 15, lineHeight: 22 }}
                  />
                )}
              />
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-xs text-red-600">
                  {errors.message?.message ?? ' '}
                </Text>
                <Text
                  className={cn(
                    'text-[11px] font-semibold',
                    message.length > NOTICE_LIMITS.maxMessageLength * 0.9
                      ? 'text-amber-600'
                      : 'text-slate-400',
                  )}>
                  {message.length}/{NOTICE_LIMITS.maxMessageLength}
                </Text>
              </View>
            </View>

            {/* Recipient summary, so "send" never happens to an imagined audience */}
            <View className="flex-row items-start gap-2.5 rounded-xl bg-slate-50 p-3">
              <Icon as={AUDIENCE_OPTIONS[0].icon} size={14} className="mt-0.5 text-slate-400" />
              <Text className="flex-1 text-[11px] leading-4 text-slate-600">
                {describeReach(audience, selectedProperty?.name, selectedTenant)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <DialogFooter>
          <Button variant="outline" onPress={close}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit(onSubmit)} disabled={sendNotice.isPending}>
            <Text>{sendNotice.isPending ? 'Sending…' : 'Send notice'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Spells out the audience in the owner's own terms, before they commit. */
function describeReach(
  audience: NoticeAudience,
  propertyName?: string,
  tenant?: UserProfile | null,
): string {
  if (audience === 'PROPERTY') {
    return propertyName
      ? `Goes to every active tenant in ${propertyName}.`
      : 'Choose a property to see who receives this.';
  }
  if (audience === 'TENANT') {
    return tenant
      ? `Goes only to ${profileDisplayName(tenant)}.`
      : 'Choose a tenant to see who receives this.';
  }
  return 'Goes to every active tenant across all your properties. Tenants who move in later will not see it.';
}