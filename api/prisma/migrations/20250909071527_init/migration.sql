-- CreateTable
CREATE TABLE "Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parc" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immat" TEXT,
    "etat" TEXT NOT NULL,
    "miseEnCirculation" DATETIME,
    "energie" TEXT,
    "imgAvant" TEXT,
    "imgArriere" TEXT,
    "imgProfilD" TEXT,
    "imgProfilG" TEXT,
    "imgInterieur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_parc_key" ON "Vehicle"("parc");
