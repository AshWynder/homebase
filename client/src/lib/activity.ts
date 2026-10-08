import type { Href } from 'expo-router';
import { FileMinus, Megaphone, MessageSquare, Wrench, type LucideIcon } from 'lucide-react-native';

export type ActivityKind = 'maintenance' | 'tenancy_notices' | 'notices' | 'chats';

/** Which role group's routes the destinations should point into. */
export type ActivityGroup = '/' | '/(caretaker)/';

export interface ActivityDestination {
  kind: ActivityKind;
  href: Href;
  title: string;
  category: string;
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
 * The prioritized categories a manager of property handles in the Activity hub.
 */
export const ACTIVITY_DESTINATIONS: readonly ActivityDestination[] = [
  {
    kind: 'maintenance',
    href: '/maintenance',
    category: 'Repairs',
    title: 'Maintenance Requests',
    description: 'Repairs and issues reported by your tenants',
    icon: Wrench,
    emptyTitle: 'No maintenance requests',
    emptyBody: 'Repairs your tenants report will be listed here.',
  },
  {
    kind: 'tenancy_notices',
    href: '/portfolio',
    category: 'Tenancy',
    title: 'Move-Out & Leases',
    description: 'Vacate notices, ending leases & occupancy changes',
    icon: FileMinus,
    emptyTitle: 'No tenancy notices',
    emptyBody: 'Tenant lease termination notices and status will appear here.',
  },
  {
    kind: 'notices',
    href: '/notices',
    category: 'Broadcasts',
    title: 'Property Announcements',
    description: 'Broadcast notices sent to your tenants',
    icon: Megaphone,
    emptyTitle: 'No notices sent',
    emptyBody: 'Announcements you send to your tenants will be listed here.',
  },
  {
    kind: 'chats',
    href: '/chats',
    category: 'Messages',
    title: 'Chats & Conversations',
    description: 'Direct tenant messages and property group threads',
    icon: MessageSquare,
    emptyTitle: 'No conversations',
    emptyBody: 'Chats between you and your tenants will be listed here.',
  },
] as const;

/**
 * The destinations with every href rebased onto `group`. `'/'` returns the
 * owner paths unchanged; `'/(caretaker)/'` produces `/(caretaker)/maintenance`
 * and friends.
 */
export function activityDestinations(group: ActivityGroup): ActivityDestination[] {
  if (group === '/') return [...ACTIVITY_DESTINATIONS];
  return ACTIVITY_DESTINATIONS.map((entry) => {
    const path =
      typeof entry.href === 'string' ? entry.href : entry.href.pathname;
    return { ...entry, href: `${group}${path.slice(1)}` as Href };
  });
}

export function activityByKind(kind: ActivityKind): ActivityDestination {
  const found = ACTIVITY_DESTINATIONS.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`Unknown activity kind "${kind}"`);
  return found;
}
