import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';

/** Renders skeleton cards while a list is loading. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3 px-5 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </View>
  );
}

/** Renders an empty or error message centered in the list area. */
export function ListMessage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="items-center justify-center gap-1 px-8 py-16">
      <Text className="text-center text-base font-semibold text-slate-700">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-sm text-slate-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}