-- AlterTable
-- Store the M-Pesa receipt number (MpesaReceiptNumber from the STK callback
-- metadata / STK query result) as a first-class column on successful payments.
ALTER TABLE "payment" ADD COLUMN "mpesa_receipt_number" TEXT;