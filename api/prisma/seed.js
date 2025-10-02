import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.vehicle.count();
  if (count > 0) {
    console.log(`Seed ignoré: ${count} véhicules déjà présents.`);
    return;
  }

  await prisma.vehicle.create({
    data: {
      parc: '920',
      type: 'Bus',
      modele: 'Citaro',
      marque: 'Mercedes-Benz',
      subtitle: 'Citaro 1 | € II | ❄️ | ♿',
      immat: 'FG-920-RE',
      etat: 'Préservé',
      energie: 'Diesel',
      miseEnCirculation: new Date('2001-07-01'),
      description: 'Premier Citaro de la collection, ex-réseau urbain.',
      history: 'Mis en service en 2001, réformé en 2023 puis préservé par l\'association.',
      caracteristiques: JSON.stringify({
        anneeConstruction: '2001',
        constructeurCarrosserie: 'EvoBus',
        numeroFlotte: '920',
        ancienNumero: '3920',
        longueur: '12m',
        largeur: '2,55m',
        hauteur: '3,07m',
        nombrePlaces: '109',
        placesAssises: '43',
        motorisation: 'Mercedes OM906hLA',
        puissance: '260 Ch',
        normeEuro: 'Euro II',
        boiteVitesses: 'ZF',
        equipementsSpeciaux: 'Climatisation, Accès PMR'
      })
    }
  });

  console.log('Seed terminé: véhicule 920 créé.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());