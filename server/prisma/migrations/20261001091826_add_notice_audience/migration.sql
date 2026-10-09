/*
  Warnings:

  - Added the required column `author_id` to the `notice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `notice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NoticeAudience" AS ENUM ('ALL_PROPERTIES', 'PROPERTY', 'TENANT');

-- AlterTable
ALTER TABLE "notice" ADD COLUMN     "audience" "NoticeAudience" NOT NULL DEFAULT 'ALL_PROPERTIES',
ADD COLUMN     "author_id" TEXT NOT NULL,
ADD COLUMN     "property_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "notice_recipient" ADD COLUMN     "read_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notice_author_id_idx" ON "notice"("author_id");

-- CreateIndex
CREATE INDEX "notice_property_id_idx" ON "notice"("property_id");

-- CreateIndex
CREATE INDEX "notice_recipient_tenant_id_idx" ON "notice_recipient"("tenant_id");

-- CreateIndex
CREATE INDEX "notice_recipient_notice_id_idx" ON "notice_recipient"("notice_id");

-- AddForeignKey
ALTER TABLE "notice" ADD CONSTRAINT "notice_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice" ADD CONSTRAINT "notice_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
