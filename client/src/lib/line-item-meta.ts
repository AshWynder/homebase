import { Droplet, Home, Receipt, Trash2, type LucideIcon, Wrench } from 'lucide-react-native';

export interface LineItemMeta {
  icon: LucideIcon;
  tile: string;
  accent: string;
  label: string;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getLineItemMeta(type: string): LineItemMeta {
  const normalized = String(type ?? '').trim().toUpperCase();

  switch (normalized) {
    case 'RENT':
      return { icon: Home, tile: '#dcfce7', accent: '#16a34a', label: 'Rent' };
    case 'WATER':
      return { icon: Droplet, tile: '#dbeafe', accent: '#2563eb', label: 'Water' };
    case 'GARBAGE':
      return { icon: Trash2, tile: '#fef3c7', accent: '#d97706', label: 'Garbage' };
    case 'SERVICE_CHARGE':
      return { icon: Wrench, tile: '#ede9fe', accent: '#7c3aed', label: 'Service Charge' };
    default:
      return {
        icon: Receipt,
        tile: '#f1f5f9',
        accent: '#64748b',
        label: titleCase(normalized || 'Item'),
      };
  }
}
