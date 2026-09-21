import {api, unwrap} from '@/lib/axios';

import type {
    GenerateInvoicesInput,
    Invoice,
    InvoiceStatus,
    Paginated,
} from './types';

export interface QueryInvoicesInput {
    unitId?: string;
    tenancyId?: string;
    propertyId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
}

export interface GenerateInvoicesResult {
    items: Invoice[];
    total: number;
    skipped: number;
}

export const invoicesApi = {
    list: (params: QueryInvoicesInput = {}) =>
        unwrap<Paginated<Invoice>>(api.get('/invoices', {params})),
    get: (id: string) => unwrap<Invoice>(api.get(`/invoices/${id}`)),
    generate: (input: GenerateInvoicesInput = {}) =>
        unwrap<GenerateInvoicesResult>(api.post('/invoices/generate', input)),
    refresh: (id: string) => unwrap<Invoice>(api.post(`/invoices/${id}/refresh`)),
    update: (id: string, input: { dueDate?: string }) =>
        unwrap<Invoice>(api.patch(`/invoices/${id}`, input)),
};