/*
  Warnings:

  - You are about to drop the column `photo_url` on the `maintenance_ticket` table. All the data in the column will be lost.
  - Added the required column `tenant_id` to the `maintenance_ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "maintenance_ticket" DROP COLUMN "photo_url",
ADD COLUMN     "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment" ALTER COLUMN "provider" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "maintenance_ticket_unit_id_idx" ON "maintenance_ticket"("unit_id");

-- CreateIndex
CREATE INDEX "maintenance_ticket_tenant_id_idx" ON "maintenance_ticket"("tenant_id");

-- CreateIndex
CREATE INDEX "maintenance_ticket_status_idx" ON "maintenance_ticket"("status");

-- AddForeignKey
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
