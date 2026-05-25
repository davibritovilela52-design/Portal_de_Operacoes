-- CreateEnum
CREATE TYPE "MaintenanceUrgency" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterEnum
ALTER TYPE "MaintenanceCategory" ADD VALUE 'warranty';

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "kanbanSubstatus" TEXT,
ADD COLUMN     "supplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "urgency" "MaintenanceUrgency" NOT NULL DEFAULT 'medium';

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maintenanceTicketId" TEXT NOT NULL,
    "supplierId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_tenantId_active_idx" ON "Supplier"("tenantId", "active");

-- CreateIndex
CREATE INDEX "MaintenanceCost_tenantId_maintenanceTicketId_idx" ON "MaintenanceCost"("tenantId", "maintenanceTicketId");

-- CreateIndex
CREATE INDEX "MaintenanceCost_tenantId_registeredAt_idx" ON "MaintenanceCost"("tenantId", "registeredAt");

-- AddForeignKey
ALTER TABLE "MaintenanceCost" ADD CONSTRAINT "MaintenanceCost_maintenanceTicketId_fkey" FOREIGN KEY ("maintenanceTicketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceCost" ADD CONSTRAINT "MaintenanceCost_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
