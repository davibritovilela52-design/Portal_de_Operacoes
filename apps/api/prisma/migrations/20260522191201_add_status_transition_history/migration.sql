-- CreateTable
CREATE TABLE "MaintenanceStatusTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maintenanceTicketId" TEXT NOT NULL,
    "fromStatus" "MaintenanceStatus",
    "toStatus" "MaintenanceStatus" NOT NULL,
    "transitionedBy" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceStatusTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceStatusTransition_tenantId_maintenanceTicketId_at_idx" ON "MaintenanceStatusTransition"("tenantId", "maintenanceTicketId", "at");

-- CreateIndex
CREATE INDEX "MaintenanceStatusTransition_tenantId_toStatus_at_idx" ON "MaintenanceStatusTransition"("tenantId", "toStatus", "at");

-- AddForeignKey
ALTER TABLE "MaintenanceStatusTransition" ADD CONSTRAINT "MaintenanceStatusTransition_maintenanceTicketId_fkey" FOREIGN KEY ("maintenanceTicketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
