import type { ReactElement } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Text } from '@/components/ui/text';

export type InvoiceSortKey = 'dueDate' | 'amount' | 'tenantName';

export const INVOICE_SORT_OPTIONS: { value: InvoiceSortKey; label: string }[] = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'tenantName', label: 'Tenant name' },
];

interface SortSheetProps {
  value: InvoiceSortKey;
  onChange: (value: InvoiceSortKey) => void;
  children: ReactElement;
}

/** Shared sort menu for the filter button and the list-header sort label. */
export function SortSheet({ value, onChange, children }: SortSheetProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as InvoiceSortKey)}>
          {INVOICE_SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <Text className="text-[13px]">{option.label}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
