-- Ajouter les champs de connexion au modèle Member
ALTER TABLE "Member" ADD COLUMN "matricule" TEXT;
ALTER TABLE "Member" ADD COLUMN "loginEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "temporaryPassword" TEXT;
ALTER TABLE "Member" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Member" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Créer un index unique sur le matricule
CREATE UNIQUE INDEX "Member_matricule_key" ON "Member"("matricule");