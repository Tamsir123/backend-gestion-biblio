const cron = require('node-cron');
const Notification = require('../models/Notification');
const EmailService = require('../services/EmailService');

class NotificationScheduler {
  // Démarrer toutes les tâches automatiques
  static start() {
    console.log('🕐 Démarrage du planificateur de notifications...');
    
    // Vérifier les retards tous les jours à 9h00
    this.scheduleOverdueCheck();
    
    // Envoyer les rappels tous les jours à 10h00
    this.scheduleReminders();
    
    // Nettoyer les anciennes notifications tous les dimanches à 3h00
    this.scheduleCleanup();
  }

  // Planifier la vérification des retards
  static scheduleOverdueCheck() {
    // Tous les jours à 9h00
    cron.schedule('0 9 * * *', async () => {
      console.log('🔍 Vérification des livres en retard...');
      
      try {
        const overdueBorrowings = await Notification.getOverdueBorrowings();
        
        if (overdueBorrowings.length > 0) {
          console.log(`📧 ${overdueBorrowings.length} emprunts en retard trouvés`);
          
          // Envoyer les emails et créer les notifications
          for (const borrowing of overdueBorrowings) {
            try {
              // Envoyer l'email
              const emailSent = await EmailService.sendOverdueNotification(
                borrowing.email,
                `${borrowing.first_name} ${borrowing.last_name}`,
                borrowing.book_title,
                borrowing.days_overdue
              );
              
              if (emailSent) {
                // Créer la notification dans la base
                await Notification.createEmailNotification(
                  borrowing.user_id,
                  'overdue_email',
                  borrowing.book_title,
                  borrowing.days_overdue
                );
                console.log(`✅ Email de retard envoyé à ${borrowing.email} pour "${borrowing.book_title}"`);
              }
            } catch (error) {
              console.error(`❌ Erreur envoi email à ${borrowing.email}:`, error.message);
            }
          }
        } else {
          console.log('✅ Aucun livre en retard trouvé');
        }
        
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des retards:', error);
      }
    });
  }

  // Planifier les rappels
  static scheduleReminders() {
    // Tous les jours à 10h00
    cron.schedule('0 10 * * *', async () => {
      console.log('📝 Envoi des rappels de retour...');
      
      try {
        const borrowingsDueTomorrow = await Notification.getBorrowingsDueTomorrow();
        
        if (borrowingsDueTomorrow.length > 0) {
          console.log(`📧 ${borrowingsDueTomorrow.length} rappels à envoyer`);
          
          // Envoyer les emails et créer les notifications
          for (const borrowing of borrowingsDueTomorrow) {
            try {
              // Envoyer l'email de rappel
              const emailSent = await EmailService.sendReminder(
                borrowing.email,
                `${borrowing.first_name} ${borrowing.last_name}`,
                borrowing.book_title
              );
              
              if (emailSent) {
                // Créer la notification dans la base
                await Notification.createEmailNotification(
                  borrowing.user_id,
                  'reminder_email',
                  borrowing.book_title
                );
                console.log(`✅ Rappel envoyé à ${borrowing.email} pour "${borrowing.book_title}"`);
              }
            } catch (error) {
              console.error(`❌ Erreur envoi rappel à ${borrowing.email}:`, error.message);
            }
          }
        } else {
          console.log('✅ Aucun rappel à envoyer');
        }
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'envoi des rappels:', error);
      }
    });
  }

  // Planifier le nettoyage
  static scheduleCleanup() {
    // Tous les dimanches à 3h00
    cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 Nettoyage des anciennes notifications...');
      
      try {
        // Supprimer les notifications lues de plus de 30 jours
        const { executeQuery } = require('../config/database');
        const result = await executeQuery(`
          DELETE FROM notifications 
          WHERE is_read = TRUE 
          AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        console.log(`🗑️ ${result.affectedRows} anciennes notifications supprimées`);
        
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
      }
    });
  }

  // Exécuter manuellement la vérification des retards (pour tests)
  static async checkOverdueNow() {
    console.log('🔍 Vérification manuelle des retards...');
    
    try {
      const overdueNotifications = await Notification.createOverdueNotifications();
      return overdueNotifications;
    } catch (error) {
      console.error('❌ Erreur:', error);
      throw error;
    }
  }

  // Exécuter manuellement les rappels (pour tests)
  static async sendRemindersNow() {
    console.log('📝 Envoi manuel des rappels...');
    
    try {
      const reminderNotifications = await Notification.createReminderNotifications();
      return reminderNotifications;
    } catch (error) {
      console.error('❌ Erreur:', error);
      throw error;
    }
  }
  
  // Méthode pour tester les notifications manuellement (utile pour le développement)
  static async runOverdueCheckNow() {
    console.log('🔍 Test manuel: Vérification des livres en retard...');
    
    try {
      const overdueBorrowings = await Notification.getOverdueBorrowings();
      
      if (overdueBorrowings.length > 0) {
        console.log(`📧 ${overdueBorrowings.length} emprunts en retard trouvés`);
        
        for (const borrowing of overdueBorrowings) {
          console.log(`- ${borrowing.first_name} ${borrowing.last_name}: "${borrowing.book_title}" (${borrowing.days_overdue} jours de retard)`);
          
          // Envoyer l'email
          const emailSent = await EmailService.sendOverdueNotification(
            borrowing.email,
            `${borrowing.first_name} ${borrowing.last_name}`,
            borrowing.book_title,
            borrowing.days_overdue
          );
          
          if (emailSent) {
            // Créer la notification
            await Notification.createEmailNotification(
              borrowing.user_id,
              'overdue_email',
              borrowing.book_title,
              borrowing.days_overdue
            );
          }
        }
      } else {
        console.log('✅ Aucun livre en retard trouvé');
      }
      
      return overdueBorrowings;
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      throw error;
    }
  }

  // Méthode pour tester les rappels manuellement
  static async runReminderCheckNow() {
    console.log('📝 Test manuel: Envoi des rappels...');
    
    try {
      const borrowingsDueTomorrow = await Notification.getBorrowingsDueTomorrow();
      
      if (borrowingsDueTomorrow.length > 0) {
        console.log(`📧 ${borrowingsDueTomorrow.length} rappels à envoyer`);
        
        for (const borrowing of borrowingsDueTomorrow) {
          console.log(`- ${borrowing.first_name} ${borrowing.last_name}: "${borrowing.book_title}" (échéance demain)`);
          
          // Envoyer l'email
          const emailSent = await EmailService.sendReminder(
            borrowing.email,
            `${borrowing.first_name} ${borrowing.last_name}`,
            borrowing.book_title
          );
          
          if (emailSent) {
            // Créer la notification
            await Notification.createEmailNotification(
              borrowing.user_id,
              'reminder_email',
              borrowing.book_title
            );
          }
        }
      } else {
        console.log('✅ Aucun rappel à envoyer');
      }
      
      return borrowingsDueTomorrow;
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      throw error;
    }
  }
}

module.exports = NotificationScheduler;
