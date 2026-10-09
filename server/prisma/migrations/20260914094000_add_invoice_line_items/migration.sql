-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "period_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "period_start" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "tenancy_id" TEXT NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'RENT';

-- CreateTable
CREATE TABLE "invoice_line_item" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "meter_reading_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_item_meter_reading_id_key" ON "invoice_line_item"("meter_reading_id");

-- CreateIndex
CREATE INDEX "invoice_unit_id_idx" ON "invoice"("unit_id");

-- CreateIndex
CREATE INDEX "invoice_status_idx" ON "invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_tenancy_id_period_start_key" ON "invoice"("tenancy_id", "period_start");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_meter_reading_id_fkey" FOREIGN KEY ("meter_reading_id") REFERENCES "meter_reading"("id") ON DELETE SET NULL ON UPDATE CASCADE;