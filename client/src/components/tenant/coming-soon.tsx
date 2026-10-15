import { router } from 'expo-router';
import { ArrowLeft, Clock, Construction, LogOut } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useSignOut } from '@/hooks/queries/use-auth';

interface ComingSoonProps {
  title: string;
  subtitle: string;
  icon?: any;
}

export function ComingSoonScreen({
  title,
  subtitle,
  icon = Construction,
}: ComingSoonProps) {
  const signOut = useSignOut();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-border bg-background px-5 py-4">
        <Text className="text-xl font-bold text-foreground">{title}</Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => signOut.mutate()}
          disabled={signOut.isPending}>
          <Icon as={LogOut} size={18} className="text-muted-foreground" />
        </Button>
      </View>

      <View className="flex-1 items-center justify-center p-6 text-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-sm border border-primary/20 mb-5">
          <Icon as={icon} size={36} className="text-primary" />
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">{title}</Text>
        <Text className="text-base text-muted-foreground text-center max-w-xs mb-6">
          {subtitle}
        </Text>
        <View className="flex-row items-center gap-2 rounded-full bg-primary/10 px-4 py-2 border border-primary/20">
          <Icon as={Clock} size={14} className="text-primary" />
          <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
            Coming in next release
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
