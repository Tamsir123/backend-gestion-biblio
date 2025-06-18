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
        const overdueNotifications = await Notification.createOverdueNotifications();
        
        if (overdueNotifications.length > 0) {
          console.log(`📧 ${overdueNotifications.length} notifications de retard créées`);
          
          // Envoyer les emails
          for (const notif of overdueNotifications) {
            await EmailService.sendOverdueNotification(
              notif.user_email,
              notif.user_name,
              notif.book_title,
              notif.days_overdue
            );
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
        const reminderNotifications = await Notification.createReminderNotifications();
        
        if (reminderNotifications.length > 0) {
          console.log(`📧 ${reminderNotifications.length} rappels créés`);
          
          // Envoyer les emails
          for (const notif of reminderNotifications) {
            await EmailService.sendReminder(
              notif.user_email,
              notif.user_name,
              notif.book_title
            );
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
}

module.exports = NotificationScheduler;
