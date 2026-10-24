-- Add owner-recorded payment methods for manual invoice settlement.
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK';
ALTER TYPE "PaymentMethod" ADD VALUE 'MPESA';

-- Manual records are not provider callbacks, so keep their source explicit.
ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';
