-- CreateTable
CREATE TABLE "ProjectSheetImport" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sheetUrl" TEXT NOT NULL,
    "sheetGid" TEXT,
    "headerRowIndex" INTEGER NOT NULL,
    "mapping" JSONB NOT NULL,
    "ownerMap" JSONB NOT NULL DEFAULT '{}',
    "lastSyncedAt" TIMESTAMP(3),
    "lastRowCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSheetImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSheetImport_projectId_key" ON "ProjectSheetImport"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectSheetImport" ADD CONSTRAINT "ProjectSheetImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
