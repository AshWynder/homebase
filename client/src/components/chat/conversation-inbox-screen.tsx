import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { MessageSquarePlus, Search } from 'lucide-react-native';

import { NewConversationDialog } from '@/components/chat/new-conversation-dialog';
import { DetailHeader } from '@/components/common/detail-header';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '@/hooks/queries/use-chat';
import type { ConversationSummary } from '@/api/types';

interface ConversationInboxScreenProps {
  /**
   * Which stack this screen was pushed into, so the back button and the row href
   * agree. Typed as `Href` because the router validates every push at compile
   * time and an interpolated string is not a route it can check.
   */
  basePath: '/chats' | '/(tenant)/chats' | '/(caretaker)/chats';
  /**
   * Safe-area edges to inset.
   *
   * A prop because this screen lives in two navigators that disagree about the
   * bottom: as a tenant tab the tab bar already owns it and padding again would
   * float the list above the bar, while as an owner stack screen nothing else
   * insets and the FAB would sit under the navigation bar or home indicator.
   * Defaulted to `['top']`, which is the tab arrangement, so a route that forgets
   * to pass this degrades to no stray bottom padding rather than a double gap.
   */
  edges?: Edge[];
}

/**
 * The chat inbox, shared by the owner and tenant stacks.
 *
 * One component rather than two because the row, the search and the empty state
 * are identical for both roles — the server already scopes the list by session, so
 * there is nothing role-specific left to branch on.
 */
export function ConversationInboxScreen({
  basePath,
  edges = ['top'],
}: ConversationInboxScreenProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  // Debounced because every keystroke would otherwise be a request: the server
  // matches against both thread names and participant names, which is not cheap
  // enough to run per character.
  const debounced = useDebouncedValue(search);
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    isFetchingNextPage,
    hasNextPage: hasMore,
    fetchNextPage,
  } = useConversations(debounced);

  const threads = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={edges}>
      <DetailHeader title="Chats" />

      <View className="bg-white px-5 pb-3">
        <View>
          <Icon as={Search} size={16} className="absolute left-3 top-3 z-10 text-slate-400" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            /* Matches the server's `QueryConversationsDto` limit, so a long search
               never turns into a 400 in the list. */
            maxLength={80}
            className="rounded-lg border-2 border-slate-200 pl-9"
          />
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ListMessage
          title="Could not load your chats"
          subtitle="Check your connection and try again."
        />
      ) : threads.length === 0 ? (
        <ListMessage
          title={debounced ? `No chats matching "${debounced}"` : 'No conversations'}
          subtitle={
            debounced
              ? 'Try a different name.'
              : 'Chats with your tenants and caretaker will appear here.'
          }
        />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(thread) => thread.id}
          renderItem={({ item }) => (
            <ConversationRow
              thread={item}
              onPress={() => router.push(`${basePath}/${item.id}` as Href)}
            />
          )}
          onEndReached={() => {
            if (hasMore && !isFetchingNextPage) fetchNextPage();
          }}
          refreshing={isRefetching}
          onRefresh={refetch}
          /* Lifts the last row clear of the FAB, which floats over the bottom of
             the list — otherwise the newest thread sits under it. */
          contentContainerStyle={{ paddingBottom: 96 }}
        />
      )}

      {/* The only way to start a conversation from the inbox, and both roles get
          the same one: who may be messaged is a server question, and the sheet
          asks it rather than deriving it. */}
      <Pressable
        onPress={() => setComposeOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Start a new conversation"
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/20 active:bg-primary/90">
        <Icon as={MessageSquarePlus} size={24} className="text-white" />
      </Pressable>

      <NewConversationDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onToast={showToast}
      />

      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}

interface ConversationRowProps {
  thread: ConversationSummary;
  onPress: () => void;
}

function ConversationRow({ thread, onPress }: ConversationRowProps) {
  const preview = thread.lastMessage?.content ?? 'No messages yet';
  const senderPrefix =
    thread.type === 'GROUP' && thread.lastMessage
      ? `${thread.lastMessage.sender.name}: `
      : '';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-5 py-4 active:bg-slate-50">
      <AvatarFor thread={thread} />

      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            className="flex-1 text-sm font-semibold text-slate-900"
            numberOfLines={1}>
            {thread.name}
          </Text>

          {thread.unreadCount > 0 ? (
            <View className="min-w-5 items-center rounded-full bg-primary px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-white">
                {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          className="mt-0.5 text-xs text-slate-500"
          numberOfLines={thread.unreadCount > 0 ? 2 : 1}>
          {senderPrefix}
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Initials for a thread.
 *
 * A group is not a person, so it gets a building glyph instead of two letters
 * that would mean nothing.
 */
function AvatarFor({ thread }: { thread: ConversationSummary }) {
  const isGroup = thread.type === 'GROUP';

  return (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
      <Text
        className="text-sm font-bold text-primary"
        numberOfLines={1}>
        {isGroup
          ? '🏢'
          : (thread.counterpart?.name ?? '?')
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('')}
      </Text>
    </View>
  );
}