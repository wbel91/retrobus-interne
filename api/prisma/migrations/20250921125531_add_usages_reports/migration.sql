-- CreateTable
CREATE TABLE "Usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parc" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "conducteur" TEXT,
    "participants" TEXT,
    "note" TEXT,
    "relatedTo" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parc" TEXT NOT NULL,
    "usageId" INTEGER,
    "description" TEXT,
    "filesMeta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
