const Notification = require('../models/Notification');
const EmailService = require('../services/EmailService');
const NotificationScheduler = require('../services/NotificationScheduler');

class NotificationController {
  // Récupérer les notifications d'un utilisateur
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const includeRead = req.query.includeRead === 'true';
      
      const notifications = await Notification.findByUserId(userId, includeRead);
      
      res.json({
        success: true,
        data: {
          notifications,
          unreadCount: notifications.filter(n => !n.is_read).length
        }
      });
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des notifications'
      });
    }
  }

  // Marquer une notification comme lue
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      const updated = await Notification.markAsRead(notificationId, userId);
      
      if (updated) {
        res.json({
          success: true,
          message: 'Notification marquée comme lue'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Notification non trouvée'
        });
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage de la notification'
      });
    }
  }

  // Marquer toutes les notifications comme lues
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      const updatedCount = await Notification.markAllAsRead(userId);
      
      res.json({
        success: true,
        message: `${updatedCount} notifications marquées comme lues`
      });
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage des notifications'
      });
    }
  }

  // Tester l'envoi d'emails (admin seulement)
  static async testEmailConfiguration(req, res) {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Droits administrateur requis.'
        });
      }

      const configValid = await EmailService.testConfiguration();
      
      if (configValid) {
        res.json({
          success: true,
          message: 'Configuration email valide ✅'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Configuration email invalide ❌'
        });
      }
    } catch (error) {
      console.error('Erreur test email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du test de configuration email'
      });
    }
  }

  // Envoyer manuellement les notifications de retard (admin seulement)
  static async sendOverdueNotifications(req, res) {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Droits administrateur requis.'
        });
      }

      const results = await NotificationScheduler.runOverdueCheckNow();
      
      res.json({
        success: true,
        message: `Vérification terminée. ${results.length} emprunts en retard traités.`,
        data: results
      });
    } catch (error) {
      console.error('Erreur envoi notifications retard:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi des notifications de retard'
      });
    }
  }

  // Envoyer manuellement les rappels (admin seulement)
  static async sendReminders(req, res) {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Droits administrateur requis.'
        });
      }

      const results = await NotificationScheduler.runReminderCheckNow();
      
      res.json({
        success: true,
        message: `Vérification terminée. ${results.length} rappels envoyés.`,
        data: results
      });
    } catch (error) {
      console.error('Erreur envoi rappels:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi des rappels'
      });
    }
  }

  // Récupérer les statistiques de notifications (admin)
  static async getNotificationStats(req, res) {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Droits administrateur requis.'
        });
      }

      const overdueBorrowings = await Notification.getOverdueBorrowings();
      const borrowingsDueTomorrow = await Notification.getBorrowingsDueTomorrow();
      
      res.json({
        success: true,
        data: {
          overdueCount: overdueBorrowings.length,
          reminderCount: borrowingsDueTomorrow.length,
          overdueBorrowings: overdueBorrowings,
          borrowingsDueTomorrow: borrowingsDueTomorrow
        }
      });
    } catch (error) {
      console.error('Erreur statistiques notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Nettoyer les anciennes notifications (admin)
  static async cleanupOldNotifications(req, res) {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Droits administrateur requis.'
        });
      }

      const daysOld = parseInt(req.query.days) || 30;
      const deletedCount = await Notification.cleanupOldNotifications(daysOld);
      
      res.json({
        success: true,
        message: `${deletedCount} anciennes notifications supprimées`
      });
    } catch (error) {
      console.error('Erreur nettoyage notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage des notifications'
      });
    }
  }
}

module.exports = NotificationController;
