const { executeQuery } = require('../config/database');
const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    console.log('🔍 Création d\'un utilisateur de test...');
    
    // Vérifier si l'utilisateur test existe déjà
    const existingUser = await executeQuery("SELECT * FROM users WHERE email = 'test@2ie.edu'");
    
    if (existingUser.length > 0) {
      console.log('✅ L\'utilisateur test existe déjà!');
      console.log('Email: test@2ie.edu');
      console.log('Mot de passe: password123');
      return;
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Insérer l'utilisateur test
    const insertUser = `
      INSERT INTO users (
        name, email, password, role, student_id, phone, address, 
        date_of_birth, department, level, country, city,
        emergency_contact_name, emergency_contact_phone, bio
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(insertUser, [
      'Amadou Test OUEDRAOGO',
      'test@2ie.edu',
      hashedPassword,
      'student',
      '2IE20240001',
      '+226 70 12 34 56',
      '123 Avenue Kwame Nkrumah, Ouagadougou',
      '2000-05-15',
      'Informatique',
      'M1',
      'Burkina Faso',
      'Ouagadougou',
      'Marie OUEDRAOGO',
      '+226 70 98 76 54',
      'Étudiant passionné par le développement web et les nouvelles technologies. Intéressé par l\'intelligence artificielle et la blockchain.'
    ]);
    
    const userId = result.insertId;
    
    // Insérer les préférences par défaut
    const insertPreferences = `
      INSERT INTO user_preferences (user_id, notification_email, notification_sms, language, theme, privacy_profile, receive_recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(insertPreferences, [
      userId,
      true,
      false,
      'fr',
      'light',
      'public',
      true
    ]);
    
    console.log('✅ Utilisateur test créé avec succès!');
    console.log('📧 Email: test@2ie.edu');
    console.log('🔑 Mot de passe: password123');
    console.log('👤 Nom: Amadou Test OUEDRAOGO');
    console.log('🎓 Niveau: M1 - Informatique');
    console.log('🆔 ID Étudiant: 2IE20240001');
    
    // Créer quelques emprunts fictifs pour les statistiques
    console.log('📚 Création d\'emprunts fictifs...');
    
    // Supposons qu'il y a au moins 3 livres dans la base
    const books = await executeQuery('SELECT id FROM books LIMIT 3');
    
    if (books.length > 0) {
      for (let i = 0; i < Math.min(books.length, 2); i++) {
        const borrowing = `
          INSERT INTO borrowings (user_id, book_id, due_date, status, renewal_count)
          VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'active', 0)
        `;
        await executeQuery(borrowing, [userId, books[i].id]);
      }
      
      // Ajouter un emprunt retourné
      if (books.length > 2) {
        const returnedBorrowing = `
          INSERT INTO borrowings (user_id, book_id, borrowed_at, due_date, returned_at, status, renewal_count)
          VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 16 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'returned', 0)
        `;
        await executeQuery(returnedBorrowing, [userId, books[2].id]);
        
        // Ajouter un avis pour ce livre retourné
        const review = `
          INSERT INTO reviews (user_id, book_id, rating, comment)
          VALUES (?, ?, 4, 'Très bon livre, je le recommande vivement!')
        `;
        await executeQuery(review, [userId, books[2].id]);
      }
      
      console.log('✅ Emprunts et avis fictifs créés!');
    }
    
    console.log('');
    console.log('🎉 Tout est prêt! Vous pouvez maintenant vous connecter avec:');
    console.log('   Email: test@2ie.edu');
    console.log('   Mot de passe: password123');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur test:', error);
  }
}

createTestUser().then(() => process.exit(0));
