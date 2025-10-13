import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigrations() {
  try {
    console.log('🔄 Application des migrations Prisma...');
    
    // Vérifier la connexion
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');
    
    // Appliquer les migrations
    // Note: En production, utilisez `prisma migrate deploy` via CLI
    console.log('ℹ️ Utilisez la commande suivante pour appliquer les migrations:');
    console.log('npx prisma migrate deploy');
    
    // Vérifier que la table Member existe
    try {
      const memberCount = await prisma.member.count();
      console.log(`✅ Table Member existe avec ${memberCount} enregistrements`);
    } catch (error) {
      console.warn('⚠️ Table Member n\'existe pas encore');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations();