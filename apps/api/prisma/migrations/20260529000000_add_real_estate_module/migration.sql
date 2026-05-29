-- CreateEnum
CREATE TYPE "RealEstateStatus" AS ENUM ('pending', 'in_progress', 'blocked', 'under_review', 'resolved', 'cancelled', 'reopened');

-- CreateEnum
CREATE TYPE "RealEstateCategory" AS ENUM ('preventive', 'corrective', 'emergency', 'inspection', 'legal', 'renovation');

-- CreateEnum
CREATE TYPE "RealEstatePriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "RealEstateOrigin" AS ENUM ('asset_field_team', 'real_estate_technical_coordination', 'central_operations');

-- CreateEnum
CREATE TYPE "RealEstateBlockReason" AS ENUM ('awaiting_contractor', 'awaiting_authorization', 'awaiting_inspection', 'awaiting_legal');

-- CreateEnum
CREATE TYPE "RealEstateEvidenceAntivirusStatus" AS ENUM ('pending', 'clean', 'flagged');

-- CreateEnum
CREATE TYPE "RealEstateEvidenceType" AS ENUM ('diagnostic', 'technical_report', 'execution_evidence', 'legal_document', 'inspection_release');

-- CreateTable
CREATE TABLE "RealEstateReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT,
    "category" "RealEstateCategory" NOT NULL,
    "priority" "RealEstatePriority" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "propertySystem" TEXT,
    "origin" "RealEstateOrigin" NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "status" "RealEstateStatus" NOT NULL,
    "kanbanSubstatus" TEXT,
    "blockCount" INTEGER NOT NULL DEFAULT 0,
    "blockReason" "RealEstateBlockReason",
    "returnToServiceEta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealEstateReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealEstateStatusTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "realEstateReportId" TEXT NOT NULL,
    "fromStatus" "RealEstateStatus",
    "toStatus" "RealEstateStatus" NOT NULL,
    "transitionedBy" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealEstateStatusTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealEstateEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "realEstateReportId" TEXT NOT NULL,
    "type" "RealEstateEvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "antivirusStatus" "RealEstateEvidenceAntivirusStatus" NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealEstateEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealEstateReport_tenantId_assetId_status_idx" ON "RealEstateReport"("tenantId", "assetId", "status");

-- CreateIndex
CREATE INDEX "RealEstateReport_tenantId_openedAt_idx" ON "RealEstateReport"("tenantId", "openedAt");

-- CreateIndex
CREATE INDEX "RealEstateStatusTransition_tenantId_realEstateReportId_at_idx" ON "RealEstateStatusTransition"("tenantId", "realEstateReportId", "at");

-- CreateIndex
CREATE INDEX "RealEstateStatusTransition_tenantId_toStatus_at_idx" ON "RealEstateStatusTransition"("tenantId", "toStatus", "at");

-- CreateIndex
CREATE INDEX "RealEstateEvidence_tenantId_realEstateReportId_type_idx" ON "RealEstateEvidence"("tenantId", "realEstateReportId", "type");

-- CreateIndex
CREATE INDEX "RealEstateEvidence_tenantId_uploadedAt_idx" ON "RealEstateEvidence"("tenantId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "RealEstateStatusTransition" ADD CONSTRAINT "RealEstateStatusTransition_realEstateReportId_fkey" FOREIGN KEY ("realEstateReportId") REFERENCES "RealEstateReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateEvidence" ADD CONSTRAINT "RealEstateEvidence_realEstateReportId_fkey" FOREIGN KEY ("realEstateReportId") REFERENCES "RealEstateReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
