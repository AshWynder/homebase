import React, { useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!activeTenancy && !submitted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-row items-center gap-3 px-5 py-4 border-b border-slate-200 bg-white">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Icon as={ArrowLeft} size={20} className="text-slate-700" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">Notice to Vacate</Text>
        </View>

        <View className="flex-1 items-center justify-center p-6 gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Icon as={Home} size={28} className="text-slate-400" />
          </View>
          <Text className="text-base font-bold text-slate-800">No Active Lease Found</Text>
          <Text className="text-center text-xs text-slate-500 max-w-xs">
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
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6" edges={['top']}>
        <View className="items-center max-w-sm gap-4 text-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
            <Icon as={CheckCircle2} size={40} className="text-emerald-600" />
          </View>

          <Text className="text-2xl font-bold text-slate-900 text-center">
            Notice Submitted
          </Text>

          <Text className="text-sm text-slate-600 text-center leading-relaxed">
            Your move-out notice for <Text className="font-semibold">{activeTenancy?.unit?.property?.name ?? 'your home'}</Text>, Unit <Text className="font-semibold">{activeTenancy?.unit?.unitNumber}</Text> has been submitted. The property owner and caretaker have been notified.
          </Text>

          <View className="w-full rounded-2xl bg-slate-50 border border-slate-100 p-4 gap-2 mt-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">Effective Move-Out Date</Text>
              <Text className="text-xs font-bold text-slate-800">
                {moveOutDate ? formatDateLong(moveOutDate) : '—'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">Reason</Text>
              <Text className="text-xs font-semibold text-slate-800">{selectedReason}</Text>
            </View>
          </View>

          <Button
            className="w-full h-12 rounded-xl bg-teal-700 mt-4"
            onPress={() => router.replace('/(tenant)/(tabs)/home')}>
            <Text className="font-semibold text-white">Return to Home</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-lg font-bold text-slate-900">Notice to Vacate</Text>
          <Text className="text-xs text-slate-500">Terminate tenancy & schedule handover</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 18 }}
        showsVerticalScrollIndicator={false}>
        {/* Current Tenancy Summary Card */}
        <Card className="rounded-2xl border-slate-200 bg-white">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                <Icon as={Building2} size={18} className="text-teal-700" />
              </View>
              <View>
                <CardTitle className="text-base font-bold text-slate-900">
                  {property?.name ?? 'Property'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Unit {activeTenancy?.unit?.unitNumber}
                </CardDescription>
              </View>
            </View>
            <Badge variant="secondary" className="bg-teal-50 border-teal-200">
              <Text className="text-[11px] font-bold text-teal-700">Active Lease</Text>
            </Badge>
          </CardHeader>

          <CardContent className="gap-2 pt-1 border-t border-slate-100">
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-slate-500">Rent Amount</Text>
              <Text className="text-xs font-semibold text-slate-800">
                {formatKes(Number(activeTenancy?.rentAmount || 0))} / mo
              </Text>
            </View>
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-slate-500">Lease Started</Text>
              <Text className="text-xs font-semibold text-slate-800">
                {activeTenancy?.startDate ? formatDateLong(activeTenancy.startDate) : '—'}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Notice Details Form */}
        <Card className="rounded-2xl border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Notice Details
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Specify your intended move-out date and handover preferences.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            {/* Move-out Date */}
            <View className="gap-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Intended Move-Out Date
              </Label>
              <DatePicker
                value={moveOutDate}
                onChange={setMoveOutDate}
                minimumDate={new Date()}
                className="h-11 rounded-xl bg-slate-50"
              />
              <Text className="text-[11px] text-slate-500">
                Standard notice periods are typically 30 days prior to end of month.
              </Text>
            </View>

            {/* Reason */}
            <View className="gap-2">
              <Label className="text-xs font-semibold text-slate-700">
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
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}>
                      <Text
                        className={`text-xs ${
                          isSelected ? 'font-bold text-teal-800' : 'font-medium text-slate-700'
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
              <Label className="text-xs font-semibold text-slate-700">
                Forwarding & Handover Notes (Optional)
              </Label>
              <Input
                multiline
                numberOfLines={3}
                placeholder="e.g. Preferred key handover time, forwarding address, deposit refund M-Pesa number"
                value={notes}
                onChangeText={setNotes}
                className="min-h-[80px] rounded-xl bg-slate-50 p-3 text-sm"
                style={{ textAlignVertical: 'top' }}
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
              ? 'border-teal-200 bg-teal-50/60'
              : 'border-slate-200 bg-white'
          }`}>
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
              agreed
                ? 'border-teal-700 bg-teal-700'
                : 'border-slate-300 bg-white'
            }`}>
            {agreed && <Icon as={CheckCircle2} size={14} className="text-white" />}
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-900 leading-tight">
              I confirm my intention to vacate the unit
            </Text>
            <Text className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              I agree to clear all outstanding utility balances, leave the premises in good condition, and schedule an exit inspection before departure.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <Button
          className="h-12 rounded-xl bg-rose-600 active:bg-rose-700"
          onPress={handleOpenConfirm}>
          <Text className="font-semibold text-white">Submit Notice to Vacate</Text>
        </Button>
      </ScrollView>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
              <Icon as={ShieldAlert} size={24} className="text-amber-600" />
            </View>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Confirm Tenancy Termination
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Are you sure you want to terminate your contract for Unit{' '}
              <Text className="font-semibold text-slate-800">
                {activeTenancy?.unit?.unitNumber}
              </Text>{' '}
              effective{' '}
              <Text className="font-semibold text-slate-800">
                {moveOutDate ? formatDateLong(moveOutDate) : ''}
              </Text>
              ? This action will alert your landlord.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-11 rounded-xl bg-rose-600 active:bg-rose-700"
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
              className="w-full h-11 rounded-xl border-slate-200"
              disabled={terminateTenancy.isPending}
              onPress={() => setConfirmModalOpen(false)}>
              <Text className="font-medium text-slate-700">Cancel</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}
