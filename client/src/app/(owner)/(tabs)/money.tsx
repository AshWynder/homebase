import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoicesTab } from '@/components/owner/money/invoices-tab';
import { PaymentList } from '@/components/owner/payment-list';
import { ScreenHeader } from '@/components/owner/screen-header';
import { SegmentedControl, type SegmentedOption } from '@/components/owner/segmented-control';
import { GenerateInvoicesDialog } from '@/components/owner/generate-invoices-dialog';
import { useToast } from '@/hooks/use-toast';

type Segment = 'invoices' | 'payments';

const SEGMENTS: SegmentedOption<Segment>[] = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'payments', label: 'Payments' },
];

export default function MoneyScreen() {
  const [segment, setSegment] = useState<Segment>('invoices');
  const [generateOpen, setGenerateOpen] = useState(false);

  const { showToast } = useToast();

  return (
    <>
      {segment === 'invoices' ? (
        <SafeAreaView className="flex-1 bg-screen" edges={['top']}>
          <InvoicesTab
            onAdd={() => setGenerateOpen(true)}
            onShowPayments={() => setSegment('payments')}
          />
        </SafeAreaView>
      ) : (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          <ScreenHeader title="Money" />

          <View className="px-4 pb-3">
            <SegmentedControl value={segment} onChange={setSegment} options={SEGMENTS} />
          </View>

          <PaymentList />
        </SafeAreaView>
      )}

      <GenerateInvoicesDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onToast={showToast}
      />
    </>
  );
}
