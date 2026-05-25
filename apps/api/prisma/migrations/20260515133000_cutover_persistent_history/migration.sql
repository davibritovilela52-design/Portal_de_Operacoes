-- CreateEnum
CREATE TYPE "CutoverRunStatus" AS ENUM ('draft', 'approved', 'blocked', 'completed');

-- CreateEnum
CREATE TYPE "CutoverDecision" AS ENUM ('go', 'no_go');

-- CreateEnum
CREATE TYPE "CutoverCheckpointStatus" AS ENUM ('pending', 'completed', 'blocked');

-- CreateTable
CREATE TABLE "CutoverRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "CutoverRunStatus" NOT NULL DEFAULT 'draft',
    "goLiveDecision" "CutoverDecision",
    "decisionAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "futureAgendaDaysMigrated" INTEGER NOT NULL,
    "finalFreezeApplied" BOOLEAN NOT NULL,
    "invalidCriticalAttachmentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "approvalsJson" JSONB NOT NULL,
    "lastEvaluationApproved" BOOLEAN,
    "lastEvaluationBlockers" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutoverRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutoverEntityReconciliation" (
    "id" TEXT NOT NULL,
    "cutoverRunId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "sourceCount" INTEGER NOT NULL,
    "migratedCount" INTEGER NOT NULL,

    CONSTRAINT "CutoverEntityReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutoverEvidence" (
    "id" TEXT NOT NULL,
    "cutoverRunId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutoverEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutoverCheckpoint" (
    "id" TEXT NOT NULL,
    "cutoverRunId" TEXT NOT NULL,
    "checkpoint" TEXT NOT NULL,
    "status" "CutoverCheckpointStatus" NOT NULL,
    "notes" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutoverCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CutoverRun_tenantId_status_updatedAt_idx" ON "CutoverRun"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CutoverRun_tenantId_decisionAt_idx" ON "CutoverRun"("tenantId", "decisionAt");

-- CreateIndex
CREATE INDEX "CutoverEntityReconciliation_cutoverRunId_idx" ON "CutoverEntityReconciliation"("cutoverRunId");

-- CreateIndex
CREATE INDEX "CutoverEvidence_cutoverRunId_createdAt_idx" ON "CutoverEvidence"("cutoverRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CutoverCheckpoint_cutoverRunId_checkpoint_key" ON "CutoverCheckpoint"("cutoverRunId", "checkpoint");

-- CreateIndex
CREATE INDEX "CutoverCheckpoint_cutoverRunId_recordedAt_idx" ON "CutoverCheckpoint"("cutoverRunId", "recordedAt");

-- AddForeignKey
ALTER TABLE "CutoverEntityReconciliation" ADD CONSTRAINT "CutoverEntityReconciliation_cutoverRunId_fkey" FOREIGN KEY ("cutoverRunId") REFERENCES "CutoverRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutoverEvidence" ADD CONSTRAINT "CutoverEvidence_cutoverRunId_fkey" FOREIGN KEY ("cutoverRunId") REFERENCES "CutoverRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutoverCheckpoint" ADD CONSTRAINT "CutoverCheckpoint_cutoverRunId_fkey" FOREIGN KEY ("cutoverRunId") REFERENCES "CutoverRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
