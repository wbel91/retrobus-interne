/*
  Warnings:

  - You are about to drop the column `imgArriere` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `imgAvant` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `imgInterieur` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `imgProfilD` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `imgProfilG` on the `Vehicle` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parc" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immat" TEXT,
    "etat" TEXT NOT NULL,
    "miseEnCirculation" DATETIME,
    "energie" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vehicle" ("createdAt", "energie", "etat", "id", "immat", "miseEnCirculation", "modele", "parc", "type", "updatedAt") SELECT "createdAt", "energie", "etat", "id", "immat", "miseEnCirculation", "modele", "parc", "type", "updatedAt" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE UNIQUE INDEX "Vehicle_parc_key" ON "Vehicle"("parc");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
