/*
  Warnings:

  - You are about to drop the `chat_message` table. If the table is not empty, all the data it contains will be lost.

  Note: the drop is deliberate. `chat_message` was `sender_id`/`receiver_id` —
  pairwise only, so it cannot represent a property group — and it carried no
  indexes. Verified empty (0 rows) before this migration was written, and nothing
  in the application referenced it yet.
*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_sender_id_fkey";

-- DropTable
DROP TABLE "chat_message";

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "property_id" TEXT,
    "direct_key" TEXT,
    "name" TEXT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_property_id_key" ON "conversation"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_direct_key_key" ON "conversation"("direct_key");

-- CreateIndex
CREATE INDEX "conversation_last_message_at_idx" ON "conversation"("last_message_at");

-- CreateIndex
CREATE INDEX "conversation_type_idx" ON "conversation"("type");

-- CreateIndex
CREATE INDEX "conversation_participant_profile_id_idx" ON "conversation_participant"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participant_conversation_id_profile_id_key" ON "conversation_participant"("conversation_id", "profile_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_id_idx" ON "message"("conversation_id", "id");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
