-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('WATER', 'ELECTRICITY');

-- AlterTable
ALTER TABLE "meter_reading" DROP COLUMN "current_value",
ADD COLUMN     "consumption_cost" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_reading" INTEGER NOT NULL,
ADD COLUMN     "price_per_unit" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tenancy" ALTER COLUMN "rent_amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "utility_meter" ADD COLUMN     "price_per_unit" DECIMAL(10,2) NOT NULL DEFAULT 150.00,
DROP COLUMN "meter_type",
ADD COLUMN     "meter_type" "MeterType" NOT NULL DEFAULT 'WATER',
ALTER COLUMN "last_reading" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "utility_meter_meter_number_key" ON "utility_meter"("meter_number");

-- CreateIndex
CREATE UNIQUE INDEX "utility_meter_unit_id_meter_type_key" ON "utility_meter"("unit_id", "meter_type");

