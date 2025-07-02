const EmailService = require('../services/EmailService');
const NotificationScheduler = require('../services/NotificationScheduler');

/**
 * Script de test pour les notifications par email
 * Usage: node scripts/test-notifications.js
 */

async function testEmailConfiguration() {
  console.log('🧪 Test de la configuration email...');
  
  try {
    const isValid = await EmailService.testConfiguration();
    
    if (isValid) {
      console.log('✅ Configuration email valide');
      return true;
    } else {
      console.log('❌ Configuration email invalide');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur configuration email:', error.message);
    return false;
  }
}

async function testOverdueNotifications() {
  console.log('\n🧪 Test des notifications de retard...');
  
  try {
    const results = await NotificationScheduler.runOverdueCheckNow();
    console.log(`✅ Test terminé. ${results.length} emprunts en retard traités.`);
    
    if (results.length > 0) {
      console.log('\n📋 Détails des emprunts en retard:');
      results.forEach((borrowing, index) => {
        console.log(`${index + 1}. ${borrowing.first_name} ${borrowing.last_name}`);
        console.log(`   📖 "${borrowing.book_title}"`);
        console.log(`   📧 ${borrowing.email}`);
        console.log(`   ⏰ ${borrowing.days_overdue} jour(s) de retard`);
        console.log('');
      });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erreur test retards:', error.message);
    return [];
  }
}

async function testReminders() {
  console.log('\n🧪 Test des rappels...');
  
  try {
    const results = await NotificationScheduler.runReminderCheckNow();
    console.log(`✅ Test terminé. ${results.length} rappels traités.`);
    
    if (results.length > 0) {
      console.log('\n📋 Détails des rappels:');
      results.forEach((borrowing, index) => {
        console.log(`${index + 1}. ${borrowing.first_name} ${borrowing.last_name}`);
        console.log(`   📖 "${borrowing.book_title}"`);
        console.log(`   📧 ${borrowing.email}`);
        console.log(`   📅 Échéance: ${new Date(borrowing.due_date).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erreur test rappels:', error.message);
    return [];
  }
}

async function sendTestEmail() {
  console.log('\n🧪 Envoi d\'un email de test...');
  
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('❌ Veuillez fournir une adresse email de test:');
    console.log('   node scripts/test-notifications.js votre-email@example.com');
    return false;
  }
  
  try {
    // Test email de rappel
    const reminderSent = await EmailService.sendReminder(
      testEmail,
      'Utilisateur Test',
      'Les Misérables - Victor Hugo'
    );
    
    if (reminderSent) {
      console.log('✅ Email de rappel envoyé avec succès');
    }
    
    // Test email de retard
    const overdueSent = await EmailService.sendOverdueNotification(
      testEmail,
      'Utilisateur Test',
      'Le Petit Prince - Antoine de Saint-Exupéry',
      3
    );
    
    if (overdueSent) {
      console.log('✅ Email de retard envoyé avec succès');
    }
    
    return reminderSent && overdueSent;
  } catch (error) {
    console.error('❌ Erreur envoi email test:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Démarrage des tests de notifications...\n');
  
  // Test configuration
  const configValid = await testEmailConfiguration();
  
  if (!configValid) {
    console.log('\n❌ Configuration email invalide. Vérifiez votre fichier .env');
    console.log('Variables requises: EMAIL_USER, EMAIL_PASS');
    process.exit(1);
  }
  
  // Test email si une adresse est fournie
  if (process.argv[2]) {
    await sendTestEmail();
  }
  
  // Test notifications automatiques
  await testOverdueNotifications();
  await testReminders();
  
  console.log('\n✅ Tous les tests terminés');
  process.exit(0);
}

// Exécuter les tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  });
}

module.exports = {
  testEmailConfiguration,
  testOverdueNotifications,
  testReminders,
  sendTestEmail
};
