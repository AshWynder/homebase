-- RenameEnum
-- The enum values are unchanged (RENT, WATER, GARBAGE, SERVICE_CHARGE);
-- the type now belongs to InvoiceLineItem instead of Invoice.
ALTER TYPE "InvoiceType" RENAME TO "InvoiceLineItemType";

-- AlterTable (invoice no longer carries a type)
ALTER TABLE "invoice" DROP COLUMN "type";

-- AlterTable (line items are now typed)
ALTER TABLE "invoice_line_item" ADD COLUMN     "type" "InvoiceLineItemType" NOT NULL DEFAULT 'RENT';