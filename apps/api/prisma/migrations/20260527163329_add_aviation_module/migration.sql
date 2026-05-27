-- CreateEnum
CREATE TYPE "AviationStatus" AS ENUM ('pending', 'in_progress', 'grounded', 'return_check', 'returned', 'cancelled', 'reopened');

-- CreateEnum
CREATE TYPE "AviationCategory" AS ENUM ('preventive', 'corrective', 'emergency', 'inspection', 'airworthiness');

-- CreateEnum
CREATE TYPE "AviationPriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "AviationGroundReason" AS ENUM ('awaiting_part', 'awaiting_authorization', 'awaiting_maintenance_crew', 'awaiting_operational_window');

-- CreateEnum
CREATE TYPE "AviationEvidenceType" AS ENUM ('diagnostic', 'technical_report', 'execution_evidence', 'airworthiness_release');

-- CreateEnum
CREATE TYPE "AviationEvidenceAntivirusStatus" AS ENUM ('pending', 'clean', 'flagged');

-- CreateEnum
CREATE TYPE "AviationOrigin" AS ENUM ('asset_field_team', 'aviation_technical_coordination', 'central_operations');

-- CreateTable
CREATE TABLE "AviationReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT,
    "category" "AviationCategory" NOT NULL,
    "priority" "AviationPriority" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "aircraftSystem" TEXT,
    "origin" "AviationOrigin" NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "status" "AviationStatus" NOT NULL,
    "kanbanSubstatus" TEXT,
    "groundCount" INTEGER NOT NULL DEFAULT 0,
    "groundReason" "AviationGroundReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AviationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AviationStatusTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aviationReportId" TEXT NOT NULL,
    "fromStatus" "AviationStatus",
    "toStatus" "AviationStatus" NOT NULL,
    "transitionedBy" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AviationStatusTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AviationEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aviationReportId" TEXT NOT NULL,
    "type" "AviationEvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "antivirusStatus" "AviationEvidenceAntivirusStatus" NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AviationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AviationReport_tenantId_assetId_status_idx" ON "AviationReport"("tenantId", "assetId", "status");

-- CreateIndex
CREATE INDEX "AviationReport_tenantId_openedAt_idx" ON "AviationReport"("tenantId", "openedAt");

-- CreateIndex
CREATE INDEX "AviationStatusTransition_tenantId_aviationReportId_at_idx" ON "AviationStatusTransition"("tenantId", "aviationReportId", "at");

-- CreateIndex
CREATE INDEX "AviationStatusTransition_tenantId_toStatus_at_idx" ON "AviationStatusTransition"("tenantId", "toStatus", "at");

-- CreateIndex
CREATE INDEX "AviationEvidence_tenantId_aviationReportId_type_idx" ON "AviationEvidence"("tenantId", "aviationReportId", "type");

-- CreateIndex
CREATE INDEX "AviationEvidence_tenantId_uploadedAt_idx" ON "AviationEvidence"("tenantId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "AviationStatusTransition" ADD CONSTRAINT "AviationStatusTransition_aviationReportId_fkey" FOREIGN KEY ("aviationReportId") REFERENCES "AviationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AviationEvidence" ADD CONSTRAINT "AviationEvidence_aviationReportId_fkey" FOREIGN KEY ("aviationReportId") REFERENCES "AviationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
