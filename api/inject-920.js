import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function injectVehicle920() {
  try {
    // Lire le fichier payload920.json
    const rawData = fs.readFileSync('./payload920.json', 'utf8');
    const vehicleData = JSON.parse(rawData);

    // Convertir les données pour Prisma (avec JSON stringifié)
    const data = {
      parc: vehicleData.parc,
      type: vehicleData.type,
      modele: vehicleData.modele,
      marque: vehicleData.marque,
      subtitle: vehicleData.subtitle,
      immat: vehicleData.immat,
      etat: vehicleData.etat,
      energie: vehicleData.energie,
      miseEnCirculation: vehicleData.miseEnCirculation ? new Date(vehicleData.miseEnCirculation) : null,
      description: vehicleData.description,
      history: vehicleData.history,
      caracteristiques: JSON.stringify(vehicleData.caracteristiques),
      gallery: JSON.stringify(vehicleData.gallery)
    };

    // Vérifier si le véhicule existe déjà
    const existing = await prisma.vehicle.findUnique({
      where: { parc: vehicleData.parc }
    });

    if (existing) {
      console.log(`✅ Véhicule ${vehicleData.parc} existe déjà, mise à jour...`);
      const updated = await prisma.vehicle.update({
        where: { parc: vehicleData.parc },
        data
      });
      console.log(`✅ Véhicule ${updated.parc} mis à jour avec succès !`);
    } else {
      console.log(`🚀 Création du véhicule ${vehicleData.parc}...`);
      const created = await prisma.vehicle.create({ data });
      console.log(`✅ Véhicule ${created.parc} créé avec succès !`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'injection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
injectVehicle920();