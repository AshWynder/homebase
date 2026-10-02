import type { Href } from 'expo-router';
import { Megaphone, MessageSquare, Wrench, type LucideIcon } from 'lucide-react-native';

export type ActivityKind = 'maintenance' | 'notices' | 'chats';

export interface ActivityDestination {
  kind: ActivityKind;
  href: Href;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * Static badge count, used only where the live number is not available at the
   * hub's single query budget. Omitted rather than defaulted to 0 so the hub row
   * hides its badge instead of asserting "nothing" it has not checked.
   */
  count?: number;
  emptyTitle: string;
  emptyBody: string;
}

/**
 * The three things an owner is interrupted by. They are folded into a single
 * Activity tab rather than taking a bottom-navigation slot each — an owner's
 * question is "what needs me right now", not "which of three inboxes is it in".
 * This array is the single source of truth for that hub, the pushed list screen
 * and the detail shell, so all three can never drift apart.
 */
export const ACTIVITY_DESTINATIONS: readonly ActivityDestination[] = [
  {
    kind: 'maintenance',
    href: '/maintenance',
    title: 'Maintenance',
    description: 'Repairs reported by your tenants',
    icon: Wrench,
    emptyTitle: 'No maintenance requests',
    emptyBody: 'Repairs your tenants report will be listed here.',
  },
  {
    kind: 'notices',
    href: '/notices',
    title: 'Notices',
    description: 'Announcements you have sent',
    icon: Megaphone,
    emptyTitle: 'No notices sent',
    emptyBody: 'Announcements you send to your tenants will be listed here.',
  },
  {
    kind: 'chats',
    href: '/chats',
    title: 'Chats',
    description: 'Conversations with your tenants',
    icon: MessageSquare,
    emptyTitle: 'No conversations',
    emptyBody: 'Chats between you and your tenants will be listed here.',
  },
] as const;

export function activityByKind(kind: ActivityKind): ActivityDestination {
  const found = ACTIVITY_DESTINATIONS.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`Unknown activity kind "${kind}"`);
  return found;
}
