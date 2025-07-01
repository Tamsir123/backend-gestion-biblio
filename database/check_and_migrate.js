const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function checkAndMigrate() {
  try {
    console.log('🔍 Vérification de la structure de la base de données...');
    
    // Vérifier si la colonne student_id existe
    const columns = await executeQuery("SHOW COLUMNS FROM users LIKE 'student_id'");
    
    if (columns.length === 0) {
      console.log('📦 Migration nécessaire, exécution de la migration...');
      
      // Lire et exécuter le fichier de migration
      const migrationPath = path.join(__dirname, 'user_profile_migration.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Diviser le SQL en statements individuels
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await executeQuery(statement);
            console.log('✅ Statement exécuté:', statement.substring(0, 50) + '...');
          } catch (error) {
            if (!error.message.includes('Duplicate column') && !error.message.includes('already exists')) {
              throw error;
            }
            console.log('⚠️  Statement ignoré (déjà exécuté):', statement.substring(0, 50) + '...');
          }
        }
      }
      
      console.log('✅ Migration terminée avec succès !');
    } else {
      console.log('✅ Base de données déjà à jour !');
    }
    
    // Afficher la structure finale
    const finalColumns = await executeQuery('DESCRIBE users');
    console.log('\n📊 Structure finale de la table users:');
    console.table(finalColumns.map(c => ({
      Field: c.Field,
      Type: c.Type,
      Null: c.Null,
      Key: c.Key,
      Default: c.Default
    })));
    
    // Vérifier les tables de préférences
    const preferences = await executeQuery("SHOW TABLES LIKE 'user_preferences'");
    if (preferences.length > 0) {
      console.log('✅ Table user_preferences existe');
    } else {
      console.log('❌ Table user_preferences manquante');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

checkAndMigrate();
