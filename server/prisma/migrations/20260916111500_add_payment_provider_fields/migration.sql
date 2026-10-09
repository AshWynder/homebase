-- Provider split: Daraja (M-Pesa) vs Paystack (Cards)
CREATE TYPE "PaymentProvider" AS ENUM ('DARAJA', 'PAYSTACK');

ALTER TABLE "payment" ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'DARAJA',
ADD COLUMN     "authorization_url" TEXT,
ADD COLUMN     "checkout_request_id" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "merchant_request_id" TEXT,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "raw_payload" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "payment_checkout_request_id_key" ON "payment"("checkout_request_id");

CREATE INDEX "payment_invoice_id_idx" ON "payment"("invoice_id");

CREATE INDEX "payment_status_idx" ON "payment"("status");