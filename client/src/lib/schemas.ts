import { z } from 'zod';

// Tenancy schema matching CreateTenancyDto from the backend
export const createTenancySchema = z.object({
  tenantId: z.string().uuid('Tenant ID must be a valid UUID'),
  unitId: z.string().uuid('Unit ID must be a valid UUID'),
  rentAmount: z
    .number({ error: 'Rent amount must be a number' })
    .positive('Rent amount must be greater than 0'),
  startDate: z.string().datetime('Start date must be a valid ISO date'),
  endDate: z.string().datetime('End date must be a valid ISO date').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export type CreateTenancyFormData = z.infer<typeof createTenancySchema>;

// Simplified form schema for the modal (without unitId since it's pre-filled)
export const assignTenantFormSchema = z.object({
  tenantId: z.string().min(1, 'Please select a tenant'),
  rentAmount: z
    .union([
      z.number().positive('Rent amount must be greater than 0'),
      z.string().transform((val) => {
        const num = Number(val);
        if (isNaN(num)) throw new Error('Rent amount must be a valid number');
        return num;
      }),
    ])
    .refine((val) => val > 0, 'Rent amount must be greater than 0'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
});

export type AssignTenantFormData = z.infer<typeof assignTenantFormSchema>;

// Meter assignment schema based on CreateMeterDto
export const assignMeterFormSchema = z.object({
  meterType: z
    .enum(['WATER', 'ELECTRICITY'], { message: 'Please select a meter type' })
    .optional()
    .or(z.literal('')),
  meterNumber: z.string().optional(),
  lastReading: z
    .union([
      z.number().int().min(0, 'Last reading cannot be negative'),
      z.string().transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        if (isNaN(num) || !Number.isInteger(num)) throw new Error('Must be a whole number');
        if (num < 0) throw new Error('Cannot be negative');
        return num;
      }),
    ])
    .optional(),
  pricePerUnit: z
    .union([
      z.number().positive('Price per unit must be greater than 0').optional(),
      z.string().transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        if (isNaN(num)) throw new Error('Price per unit must be a valid number');
        if (num <= 0) throw new Error('Price per unit must be greater than 0');
        return num;
      }),
    ])
    .optional(),
});

export type AssignMeterFormData = z.infer<typeof assignMeterFormSchema>;

// Meter reading capture, mirroring RecordReadingDto on the backend. Kept as a
// string field so the form's input and output types line up; the value is
// converted with Number() on submit. The "at least the meter's last reading"
// rule depends on a live value, so it is enforced in the dialog against the
// selected meter rather than here.
export const recordReadingFormSchema = z.object({
  currentReading: z
    .string()
    .min(1, 'Current reading is required')
    .regex(/^-?\d+$/, 'Must be a whole number')
    .refine((val) => Number(val) >= 0, 'Cannot be negative'),
  readingDate: z
    .string()
    .min(1, 'Reading date is required')
    .refine((val) => !isNaN(new Date(val).getTime()), 'Enter a valid date'),
});

export type RecordReadingFormData = z.infer<typeof recordReadingFormSchema>;
