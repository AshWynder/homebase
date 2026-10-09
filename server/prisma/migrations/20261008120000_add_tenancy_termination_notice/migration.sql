ALTER TABLE "tenancy"
  ADD COLUMN "termination_reason" TEXT,
  ADD COLUMN "termination_notes" TEXT,
  ADD COLUMN "termination_requested_at" TIMESTAMP(3);
