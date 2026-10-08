import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Building2, MessageSquare, Users } from 'lucide-react-native';

import type { MessageableGroup, MessageablePerson, Role } from '@/api/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  useMessageableGroups,
  useMessageablePeople,
} from '@/hooks/queries/use-chat';
import { useStartDirectChat, useStartGroupChat } from '@/hooks/queries/use-start-chat';
import { cn } from '@/lib/utils';

type Target = 'group' | 'direct';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Where a failed start is reported.
   *
   * A toast rather than text inside the sheet, and the reason is timing: choosing a
   * row closes this dialog first, so a 403 raised a moment later would be written
   * into a component nobody is looking at. The toast outlives the dismissal, and
   * the sheet is closed by then so it renders in front rather than behind a modal.
   */
  onToast: (message: string) => void;
}

/**
 * The "start a conversation" sheet, opened by the inbox FAB.
 *
 * Two tabs because these are two different acts, not one list to be scanned: a
 * property group is chosen from a place, a person from a name. Group is the
 * default tab — for every role the group list is the shorter one (a tenant has
 * exactly one home, an owner usually a handful of buildings), and it is the
 * conversation with the most people in it, so opening on People would put the
 * rarer case first.
 *
 * Both lists come from the server rather than from anything the client can derive.
 * The client cannot compute "who may I message" — it has no tenancy graph — and
 * guessing from roles alone would offer a tenant every other tenant in the
 * building, which the server would then refuse with a 403.
 */
export function NewConversationDialog({
  open,
  onOpenChange,
  onToast,
}: NewConversationDialogProps) {
  /* Reset on close, so reopening always lands on the group tab rather than
     wherever the user left off. A picker that remembers its last filter reads as
     a filter the user forgot to clear. */
  const [target, setTarget] = useState<Target>('group');

  const startGroup = useStartGroupChat({ onError: onToast });
  const startDirect = useStartDirectChat({ onError: onToast });

  function close() {
    // The dialog unmounts nothing — `target` would survive dismissal — so it is
    // reset here to keep the comment above honest: every open starts on Group
    // rather than wherever the last session left off.
    setTarget('group');
    onOpenChange(false);
  }

  function choose(run: () => Promise<void>) {
    // Close first: the sheet would otherwise stay mounted over the thread the
    // push just navigated to, and `useOpenChat` navigates asynchronously so the
    // close cannot wait on it.
    close();
    void run();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[85%] gap-3 p-0">
        {/* `pr-12` clears the close button `DialogContent` renders at right-4,
            which would otherwise sit on the title. */}
        <DialogHeader className="px-5 pt-5 pr-12">
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Pick a property group, or message someone directly.
          </DialogDescription>
        </DialogHeader>

        <View className="flex-row gap-2 px-5">
          <TargetTab
            label="Group chat"
            icon={Building2}
            active={target === 'group'}
            onPress={() => setTarget('group')}
          />
          <TargetTab
            label="Direct message"
            icon={Users}
            active={target === 'direct'}
            onPress={() => setTarget('direct')}
          />
        </View>

        <ScrollView
          className="max-h-[420px]"
          contentContainerStyle={{ paddingBottom: 8 }}>
          {target === 'group' ? (
            <GroupChoices
              onPick={(propertyId) => choose(() => startGroup.start(propertyId))}
            />
          ) : (
            <PeopleChoices
              onPick={(profileId) => choose(() => startDirect.start(profileId))}
            />
          )}
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

function TargetTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: typeof Building2;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={cn(
        'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5',
        active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white'
      )}>
      <Icon
        as={icon}
        size={15}
        className={active ? 'text-primary' : 'text-slate-400'}
      />
      <Text
        className={cn(
          'text-xs font-semibold',
          active ? 'text-primary' : 'text-slate-500'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}

function GroupChoices({ onPick }: { onPick: (propertyId: string) => void }) {
  // Only fetched while the tab is on screen, and enabled from the dialog's open
  // state by the parent: a mounted-but-closed dialog would otherwise warm the
  // cache for nobody.
  const { data, isLoading, isError, refetch } = useMessageableGroups();

  if (isLoading) return <PickerLoading />;

  if (isError) {
    return (
      <PickerRetry
        message="Could not load your properties."
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <PickerEmpty
        icon={Building2}
        title="No property groups"
        subtitle="You are not part of any property group yet."
      />
    );
  }

  return (
    <View>
      {data.map((group) => (
        <ChoiceRow
          key={group.id}
          glyph={Building2}
          title={group.name}
          subtitle={groupSubtitle(group)}
          onPress={() => onPick(group.id)}
        />
      ))}
    </View>
  );
}

function groupSubtitle(group: MessageableGroup): string | null {
  if (group.address) return group.address;
  return group.memberCount === 1 ? '1 unit' : `${group.memberCount} units`;
}

function PeopleChoices({ onPick }: { onPick: (profileId: string) => void }) {
  const { data, isLoading, isError, refetch } = useMessageablePeople();

  if (isLoading) return <PickerLoading />;

  if (isError) {
    return (
      <PickerRetry
        message="Could not load the people you can message."
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <PickerEmpty
        icon={Users}
        title="Nobody to message yet"
        subtitle="People appear here once you share a property."
      />
    );
  }

  return (
    <View>
      {data.map((person) => (
        <ChoiceRow
          key={person.id}
          glyph={MessageSquare}
          title={person.name ?? 'Unknown'}
          subtitle={roleLabel(person.role)}
          initials={initials(person)}
          onPress={() => onPick(person.id)}
        />
      ))}
    </View>
  );
}

function roleLabel(role: Role): string {
  switch (role) {
    case 'OWNER':
      return 'Landlord';
    case 'CARETAKER':
      return 'Caretaker';
    default:
      return 'Tenant';
  }
}

/**
 * Two letters, because a person's name is the one thing in this picker the user
 * has to recognise on sight — a grey building glyph next to "Jane Smith" would say
 * nothing. Groups keep the glyph, since a property has no initials.
 */
function initials(person: MessageablePerson): string {
  const name = person.name ?? '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0][0] ?? ''}${parts[parts.length > 1 ? parts.length - 1 : 0][0] ?? ''}`.toUpperCase();
}

function ChoiceRow({
  glyph,
  initials: rowInitials,
  title,
  subtitle,
  onPress,
}: {
  glyph: typeof Building2;
  initials?: string;
  title: string;
  subtitle: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-slate-100 px-5 py-3.5 active:bg-slate-50">
      {rowInitials ? (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-bold text-primary">{rowInitials}</Text>
        </View>
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon as={glyph} size={18} className="text-primary" />
        </View>
      )}

      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function PickerLoading() {
  return (
    <View className="items-center justify-center gap-2 py-10">
      <ActivityIndicator color="#2563eb" />
      <Text className="text-xs text-slate-500">Loading…</Text>
    </View>
  );
}

function PickerEmpty({
  icon,
  title,
  subtitle,
}: {
  icon: typeof Building2;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="items-center gap-1 px-8 py-10">
      <Icon as={icon} size={22} className="mb-1 text-slate-300" />
      <Text className="text-sm font-semibold text-slate-700">{title}</Text>
      <Text className="text-center text-xs text-slate-500">{subtitle}</Text>
    </View>
  );
}

function PickerRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center gap-2 px-8 py-8">
      <Text className="text-center text-xs text-slate-600">{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="rounded-lg border-2 border-primary px-4 py-2 active:bg-primary/10">
        <Text className="text-xs font-semibold text-primary">Try again</Text>
      </Pressable>
    </View>
  );
}