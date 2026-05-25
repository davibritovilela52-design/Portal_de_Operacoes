-- AlterTable
ALTER TABLE "AgendaEvent" ADD COLUMN     "description" TEXT,
ADD COLUMN     "legacyMetadata" JSONB,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "legacyMetadata" JSONB,
ADD COLUMN     "legacyTicketCode" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "title" TEXT;
