import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface StatPillProps {
  label: string;
  value: string;
  tone?: 'teal' | 'blue' | 'amber';
}

const TONES: Record<NonNullable<StatPillProps['tone']>, { bg: string; value: string }> = {
  teal: { bg: 'bg-teal-100', value: 'text-teal-900' },
  blue: { bg: 'bg-sky-100', value: 'text-sky-900' },
  amber: { bg: 'bg-amber-100', value: 'text-amber-900' },
};

/** A compact colored stat tile used inside property cards. */
export function StatPill({ label, value, tone = 'teal' }: StatPillProps) {
  const t = TONES[tone];
  return (
    <View className={`flex-1 gap-1 rounded-lg ${t.bg} px-3 py-2`}>
      <Text className="text-[11px] font-medium text-slate-600">{label}</Text>
      <Text className={`text-base font-bold ${t.value}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}