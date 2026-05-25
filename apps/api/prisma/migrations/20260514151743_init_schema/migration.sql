-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('pending', 'in_progress', 'frozen', 'payment', 'completed', 'cancelled', 'reopened');

-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('preventive', 'corrective', 'emergency', 'improvement', 'inspection');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "MaintenanceOrigin" AS ENUM ('asset_field_team', 'yachts_technical_coordination', 'central_operations');

-- CreateEnum
CREATE TYPE "FrozenReason" AS ENUM ('awaiting_fiscal_document', 'awaiting_supplier_response', 'awaiting_central_operations_decision', 'awaiting_critical_part', 'awaiting_safe_operational_window');

-- CreateEnum
CREATE TYPE "MaintenanceEvidenceType" AS ENUM ('diagnostic', 'financial_document', 'execution_evidence', 'quality_release');

-- CreateEnum
CREATE TYPE "MaintenanceEvidenceAntivirusStatus" AS ENUM ('pending', 'clean', 'flagged');

-- CreateEnum
CREATE TYPE "AgendaEventType" AS ENUM ('utilization', 'planned_maintenance', 'emergency_maintenance', 'operational_block', 'crew_rest');

-- CreateEnum
CREATE TYPE "AssetModality" AS ENUM ('yachts', 'aviation', 'real_estate', 'cars');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" "MaintenanceCategory" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL,
    "description" TEXT NOT NULL,
    "origin" "MaintenanceOrigin" NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "status" "MaintenanceStatus" NOT NULL,
    "freezeCount" INTEGER NOT NULL DEFAULT 0,
    "frozenReason" "FrozenReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maintenanceTicketId" TEXT NOT NULL,
    "type" "MaintenanceEvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "antivirusStatus" "MaintenanceEvidenceAntivirusStatus" NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "AgendaEventType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "safeMinimumBreached" BOOLEAN NOT NULL DEFAULT false,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRegistryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "modality" "AssetModality" NOT NULL,
    "legacyAssetId" TEXT,
    "timezone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRegistryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "rootCause" TEXT,
    "impactSummary" TEXT,
    "followUpActions" JSONB,
    "centralValidatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentMaintenanceTicket" (
    "incidentId" TEXT NOT NULL,
    "maintenanceTicketId" TEXT NOT NULL,

    CONSTRAINT "IncidentMaintenanceTicket_pkey" PRIMARY KEY ("incidentId","maintenanceTicketId")
);

-- CreateTable
CREATE TABLE "AuditRectification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "targetVersion" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRectification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditDecisionMemo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "assetId" TEXT,
    "context" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "alternativesConsidered" JSONB NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditDecisionMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceTicket_tenantId_assetId_status_idx" ON "MaintenanceTicket"("tenantId", "assetId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_tenantId_openedAt_idx" ON "MaintenanceTicket"("tenantId", "openedAt");

-- CreateIndex
CREATE INDEX "MaintenanceEvidence_tenantId_maintenanceTicketId_type_idx" ON "MaintenanceEvidence"("tenantId", "maintenanceTicketId", "type");

-- CreateIndex
CREATE INDEX "MaintenanceEvidence_tenantId_uploadedAt_idx" ON "MaintenanceEvidence"("tenantId", "uploadedAt");

-- CreateIndex
CREATE INDEX "AgendaEvent_tenantId_assetId_startsAt_endsAt_idx" ON "AgendaEvent"("tenantId", "assetId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AssetRegistryItem_tenantId_modality_active_idx" ON "AssetRegistryItem"("tenantId", "modality", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRegistryItem_tenantId_assetId_key" ON "AssetRegistryItem"("tenantId", "assetId");

-- CreateIndex
CREATE INDEX "AccessAssignment_tenantId_role_revokedAt_idx" ON "AccessAssignment"("tenantId", "role", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessAssignment_tenantId_userId_role_key" ON "AccessAssignment"("tenantId", "userId", "role");

-- CreateIndex
CREATE INDEX "Incident_tenantId_assetId_severity_idx" ON "Incident"("tenantId", "assetId", "severity");

-- CreateIndex
CREATE INDEX "AuditRectification_tenantId_recordId_targetVersion_idx" ON "AuditRectification"("tenantId", "recordId", "targetVersion");

-- CreateIndex
CREATE INDEX "AuditDecisionMemo_tenantId_aggregateType_aggregateId_idx" ON "AuditDecisionMemo"("tenantId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "AuditDecisionMemo_tenantId_action_createdAt_idx" ON "AuditDecisionMemo"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_processedAt_idx" ON "OutboxEvent"("tenantId", "processedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "MaintenanceEvidence" ADD CONSTRAINT "MaintenanceEvidence_maintenanceTicketId_fkey" FOREIGN KEY ("maintenanceTicketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMaintenanceTicket" ADD CONSTRAINT "IncidentMaintenanceTicket_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMaintenanceTicket" ADD CONSTRAINT "IncidentMaintenanceTicket_maintenanceTicketId_fkey" FOREIGN KEY ("maintenanceTicketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
