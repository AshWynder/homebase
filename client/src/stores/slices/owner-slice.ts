import type { StateCreator } from 'zustand';

import type { InvoiceStatus } from '@/api/types';

export type OwnerModal = 'createProperty' | 'createTenancy' | 'generateInvoices' | null;

export interface OwnerSlice {
  selectedPropertyId: string | null;
  invoiceStatusFilter: InvoiceStatus | 'ALL';
  activeModal: OwnerModal;
  setSelectedPropertyId: (id: string | null) => void;
  setInvoiceStatusFilter: (status: InvoiceStatus | 'ALL') => void;
  openModal: (modal: Exclude<OwnerModal, null>) => void;
  closeModal: () => void;
  resetOwnerState: () => void;
}

const initialOwnerState = {
  selectedPropertyId: null as string | null,
  invoiceStatusFilter: 'ALL' as InvoiceStatus | 'ALL',
  activeModal: null as OwnerModal,
};

export const createOwnerSlice: StateCreator<OwnerSlice, [], [], OwnerSlice> = (set) => ({
  ...initialOwnerState,
  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
  setInvoiceStatusFilter: (status) => set({ invoiceStatusFilter: status }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  resetOwnerState: () => set(initialOwnerState),
});