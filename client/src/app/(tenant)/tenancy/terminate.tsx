import React, { useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Home,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStore } from '@/stores/use-store';
import { useTenancies, useTerminateTenancy } from '@/hooks/queries/use-tenancies';
import { formatDateLong, formatKes } from '@/lib/format';

const REASONS = [
  'Relocating for work / study',
  'Purchased a home',
  'Upsizing to a larger unit',
  'Downsizing to a smaller unit',
  'End of lease agreement',
  'Financial / budget reasons',
  'Other personal reasons',
];

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so an inline literal re-dispatches from inside the render phase and hangs the app.
const styles = StyleSheet.create({
  multilineTopAlign: { textAlignVertical: 'top' },
});

export default function TerminateTenancyScreen() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);

  const tenanciesQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });

  const activeTenancy = tenanciesQuery.data?.items?.[0];
  const terminateTenancy = useTerminateTenancy();

  // Default notice date: 30 days ahead
  const defaultNoticeDate = new Date();
  defaultNoticeDate.setDate(defaultNoticeDate.getDate() + 30);

  const [moveOutDate, setMoveOutDate] = useState<Date | undefined>(defaultNoticeDate);
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOpenConfirm = () => {
    if (!moveOutDate) {
      Alert.alert('Move-out Date Required', 'Please choose your intended move-out date.');
      return;
    }
    if (!agreed) {
      Alert.alert(
        'Acknowledgment Required',
        'Please confirm that you understand the notice terms before submitting.',
      );
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!activeTenancy) return;

    try {
      await terminateTenancy.mutateAsync({
        id: activeTenancy.id,
        input: {
          endDate: moveOutDate?.toISOString(),
          reason: selectedReason,
          notes: notes.trim() || undefined,
        },
      });
      setConfirmModalOpen(false);
      setSubmitted(true);
    } catch (err: any) {
      setConfirmModalOpen(false);
      Alert.alert('Error', err.message || 'Could not submit move-out notice');
    }
  };

  if (tenanciesQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!activeTenancy && !submitted) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center gap-3 px-5 py-4 border-b border-border bg-background">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Notice to Vacate</Text>
        </View>

        <View className="flex-1 items-center justify-center p-6 gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon as={Home} size={28} className="text-muted-foreground" />
          </View>
          <Text className="text-base font-bold text-foreground">No Active Lease Found</Text>
          <Text className="text-center text-xs text-muted-foreground max-w-xs">
            You do not currently have an active tenancy contract to terminate.
          </Text>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onPress={() => router.back()}>
            <Text>Return to Account</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6" edges={['top']}>
        <View className="items-center max-w-sm gap-4 text-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-success/10 border border-success/20">
            <Icon as={CheckCircle2} size={40} className="text-success" />
          </View>

          <Text className="text-2xl font-bold text-foreground text-center">
            Notice Submitted
          </Text>

          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            Your move-out notice for <Text className="font-semibold">{activeTenancy?.unit?.property?.name ?? 'your home'}</Text>, Unit <Text className="font-semibold">{activeTenancy?.unit?.unitNumber}</Text> has been submitted. The property owner and caretaker have been notified.
          </Text>

          <View className="w-full rounded-2xl bg-muted border border-border p-4 gap-2 mt-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Effective Move-Out Date</Text>
              <Text className="text-xs font-bold text-foreground">
                {moveOutDate ? formatDateLong(moveOutDate) : '—'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Reason</Text>
              <Text className="text-xs font-semibold text-foreground">{selectedReason}</Text>
            </View>
          </View>

          <Button
            className="w-full h-12 rounded-xl bg-primary mt-4"
            onPress={() => router.replace('/(tenant)/(tabs)/home')}>
            <Text className="font-semibold text-primary-foreground">Return to Home</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const property = activeTenancy?.unit?.property;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-3.5 border-b border-border bg-background">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon as={ArrowLeft} size={20} className="text-foreground" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-bold text-foreground">Notice to Vacate</Text>
          <Text className="text-xs text-muted-foreground">Terminate tenancy & schedule handover</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-[50px] gap-[18px]"
        showsVerticalScrollIndicator={false}>
        {/* Current Tenancy Summary Card */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon as={Building2} size={18} className="text-primary" />
              </View>
              <View>
                <CardTitle className="text-base font-bold text-foreground">
                  {property?.name ?? 'Property'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Unit {activeTenancy?.unit?.unitNumber}
                </CardDescription>
              </View>
            </View>
            <Badge variant="secondary" className="bg-primary/10 border-primary/20">
              <Text className="text-[11px] font-bold text-primary">Active Lease</Text>
            </Badge>
          </CardHeader>

          <CardContent className="gap-2 pt-1 border-t border-border">
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-muted-foreground">Rent Amount</Text>
              <Text className="text-xs font-semibold text-foreground">
                {formatKes(Number(activeTenancy?.rentAmount || 0))} / mo
              </Text>
            </View>
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-muted-foreground">Lease Started</Text>
              <Text className="text-xs font-semibold text-foreground">
                {activeTenancy?.startDate ? formatDateLong(activeTenancy.startDate) : '—'}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Notice Details Form */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">
              Notice Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Specify your intended move-out date and handover preferences.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            {/* Move-out Date */}
            <View className="gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Intended Move-Out Date
              </Label>
              <DatePicker
                value={moveOutDate}
                onChange={setMoveOutDate}
                minimumDate={new Date()}
                className="h-11 rounded-xl bg-muted"
              />
              <Text className="text-[11px] text-muted-foreground">
                Standard notice periods are typically 30 days prior to end of month.
              </Text>
            </View>

            {/* Reason */}
            <View className="gap-2">
              <Label className="text-xs font-semibold text-foreground">
                Primary Reason for Leaving
              </Label>
              <View className="flex-row flex-wrap gap-2">
                {REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      activeOpacity={0.7}
                      onPress={() => setSelectedReason(reason)}
                      className={`rounded-xl px-3 py-2 border ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted'
                      }`}>
                      <Text
                        className={`text-xs ${
                          isSelected ? 'font-bold text-primary' : 'font-medium text-foreground'
                        }`}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Handover & Forwarding Notes */}
            <View className="gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Forwarding & Handover Notes (Optional)
              </Label>
              <Input
                multiline
                numberOfLines={3}
                placeholder="e.g. Preferred key handover time, forwarding address, deposit refund M-Pesa number"
                value={notes}
                onChangeText={setNotes}
                className="min-h-[80px] rounded-xl bg-muted p-3 text-sm"
                style={styles.multilineTopAlign}
              />
            </View>
          </CardContent>
        </Card>

        {/* Notice Terms Acknowledgment */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAgreed(!agreed)}
          className={`flex-row items-start gap-3 rounded-2xl border p-4 ${
            agreed
              ? 'border-primary/20 bg-primary/10'
              : 'border-border bg-card'
          }`}>
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
              agreed
                ? 'border-primary bg-primary'
                : 'border-border bg-card'
            }`}>
            {agreed && <Icon as={CheckCircle2} size={14} className="text-primary-foreground" />}
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-foreground leading-tight">
              I confirm my intention to vacate the unit
            </Text>
            <Text className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              I agree to clear all outstanding utility balances, leave the premises in good condition, and schedule an exit inspection before departure.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <Button
          className="h-12 rounded-xl bg-destructive active:bg-destructive/90"
          onPress={handleOpenConfirm}>
          <Text className="font-semibold text-white">Submit Notice to Vacate</Text>
        </Button>
      </ScrollView>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 border border-warning/20">
              <Icon as={ShieldAlert} size={24} className="text-warning" />
            </View>
            <DialogTitle className="text-xl font-bold text-foreground">
              Confirm Tenancy Termination
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to terminate your contract for Unit{' '}
              <Text className="font-semibold text-foreground">
                {activeTenancy?.unit?.unitNumber}
              </Text>{' '}
              effective{' '}
              <Text className="font-semibold text-foreground">
                {moveOutDate ? formatDateLong(moveOutDate) : ''}
              </Text>
              ? This action will alert your landlord.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11 rounded-xl bg-destructive active:bg-destructive/90"
              disabled={terminateTenancy.isPending}
              onPress={handleConfirmSubmit}>
              {terminateTenancy.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="font-semibold text-white">Submitting…</Text>
                </View>
              ) : (
                <Text className="font-semibold text-white">Confirm Termination</Text>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-border"
              disabled={terminateTenancy.isPending}
              onPress={() => setConfirmModalOpen(false)}>
              <Text className="font-medium text-foreground">Cancel</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}
