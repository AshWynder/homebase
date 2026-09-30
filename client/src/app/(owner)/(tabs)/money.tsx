import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoiceList } from '@/components/owner/invoice-list';
import { InvoiceSummaryTiles } from '@/components/owner/invoice-summary-tiles';
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Money"
        addLabel="Generate invoices"
        onAdd={segment === 'invoices' ? () => setGenerateOpen(true) : undefined}
      />

      <View className="border-b border-slate-200 bg-white px-5 pb-3">
        <SegmentedControl value={segment} onChange={setSegment} options={SEGMENTS} />
      </View>

      {segment === 'invoices' ? (
        <>
          <View className="border-b border-slate-200 bg-white px-5 pb-4">
            <InvoiceSummaryTiles />
          </View>
          <InvoiceList />
        </>
      ) : (
        <PaymentList />
      )}

      <GenerateInvoicesDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onToast={showToast}
      />
    </SafeAreaView>
  );
}
