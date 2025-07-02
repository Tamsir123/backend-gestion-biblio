const { executeQuery, queryOne } = require('../config/database');

class Notification {
  // Créer une notification
  static async create(notificationData) {
    const { user_id, type, title, message, expires_at } = notificationData;
    
    const query = `
      INSERT INTO notifications (user_id, type, title, message, expires_at) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(query, [user_id, type, title, message, expires_at]);
    return result.insertId;
  }
  
  // Obtenir les notifications d'un utilisateur
  static async findByUserId(userId, includeRead = false) {
    let whereClause = 'user_id = ?';
    let params = [userId];
    
    if (!includeRead) {
      whereClause += ' AND is_read = FALSE';
    }
    
    // Supprimer les notifications expirées
    await executeQuery('DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()');
    
    const query = `
      SELECT * FROM notifications 
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `;
    
    return await executeQuery(query, params);
  }
  
  // Marquer comme lu
  static async markAsRead(notificationId, userId) {
    const query = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
    const result = await executeQuery(query, [notificationId, userId]);
    return result.affectedRows > 0;
  }
  
  // Marquer toutes comme lues
  static async markAllAsRead(userId) {
    const query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ?';
    const result = await executeQuery(query, [userId]);
    return result.affectedRows;
  }
  
  // Supprimer une notification
  static async delete(notificationId, userId) {
    const query = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    const result = await executeQuery(query, [notificationId, userId]);
    return result.affectedRows > 0;
  }
  
  // Créer des notifications de retard pour tous les emprunts en retard
  static async createOverdueNotifications() {
    // Récupérer tous les emprunts en retard sans notification récente (dernières 24h)
    const query = `
      SELECT b.*, u.email, u.name as user_name, bk.title as book_title
      FROM borrowings b
      JOIN users u ON b.user_id = u.id
      JOIN books bk ON b.book_id = bk.id
      LEFT JOIN notifications n ON (
        n.user_id = b.user_id 
        AND n.type = 'overdue' 
        AND n.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND n.message LIKE CONCAT('%', bk.title, '%')
      )
      WHERE b.status = 'active' 
      AND b.due_date < NOW()
      AND n.id IS NULL
    `;
    
    const overdueBooks = await executeQuery(query);
    
    const notifications = [];
    for (const borrowing of overdueBooks) {
      const daysDiff = Math.floor((new Date() - new Date(borrowing.due_date)) / (1000 * 60 * 60 * 24));
      
      const notificationId = await this.create({
        user_id: borrowing.user_id,
        type: 'overdue',
        title: 'Livre en retard',
        message: `Le livre "${borrowing.book_title}" est en retard de ${daysDiff} jour(s). Merci de le retourner rapidement.`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire dans 7 jours
      });
      
      notifications.push({
        id: notificationId,
        user_email: borrowing.email,
        user_name: borrowing.user_name,
        book_title: borrowing.book_title,
        days_overdue: daysDiff
      });
    }
    
    return notifications;
  }
  
  // Créer des notifications de rappel (1 jour avant l'échéance)
  static async createReminderNotifications() {
    const query = `
      SELECT b.*, u.email, u.name as user_name, bk.title as book_title
      FROM borrowings b
      JOIN users u ON b.user_id = u.id
      JOIN books bk ON b.book_id = bk.id
      LEFT JOIN notifications n ON (
        n.user_id = b.user_id 
        AND n.type = 'reminder' 
        AND n.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND n.message LIKE CONCAT('%', bk.title, '%')
      )
      WHERE b.status = 'active' 
      AND DATE(b.due_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
      AND n.id IS NULL
    `;
    
    const dueSoonBooks = await executeQuery(query);
    
    const notifications = [];
    for (const borrowing of dueSoonBooks) {
      const notificationId = await this.create({
        user_id: borrowing.user_id,
        type: 'reminder',
        title: 'Rappel de retour',
        message: `Le livre "${borrowing.book_title}" doit être retourné demain. N'oubliez pas !`,
        expires_at: new Date(borrowing.due_date)
      });
      
      notifications.push({
        id: notificationId,
        user_email: borrowing.email,
        user_name: borrowing.user_name,
        book_title: borrowing.book_title
      });
    }
    
    return notifications;
  }
  
  // Récupérer les emprunts en retard pour les notifications
  static async getOverdueBorrowings() {
    const query = `
      SELECT 
        b.id as borrowing_id,
        b.user_id,
        b.book_id,
        b.due_date,
        b.borrowed_at,
        DATEDIFF(NOW(), b.due_date) as days_overdue,
        u.name,
        u.email,
        bk.title as book_title,
        bk.author,
        -- Vérifier si une notification a déjà été envoyée récemment
        (SELECT COUNT(*) FROM notifications n 
         WHERE n.user_id = b.user_id 
         AND n.type = 'overdue' 
         AND n.title LIKE CONCAT('%', bk.title, '%')
         AND DATE(n.created_at) = CURDATE()) as notification_sent_today
      FROM borrowings b
      JOIN users u ON b.user_id = u.id
      JOIN books bk ON b.book_id = bk.id
      WHERE b.status = 'active'
      AND b.due_date < NOW()
      HAVING notification_sent_today = 0
      ORDER BY days_overdue DESC
    `;
    
    return await executeQuery(query);
  }

  // Récupérer les emprunts qui arrivent à échéance demain (pour les rappels)
  static async getBorrowingsDueTomorrow() {
    const query = `
      SELECT 
        b.id as borrowing_id,
        b.user_id,
        b.book_id,
        b.due_date,
        u.name,
        u.email,
        bk.title as book_title,
        bk.author,
        -- Vérifier si un rappel a déjà été envoyé
        (SELECT COUNT(*) FROM notifications n 
         WHERE n.user_id = b.user_id 
         AND n.type = 'reminder' 
         AND n.title LIKE CONCAT('%', bk.title, '%')
         AND DATE(n.created_at) = CURDATE()) as reminder_sent_today
      FROM borrowings b
      JOIN users u ON b.user_id = u.id
      JOIN books bk ON b.book_id = bk.id
      WHERE b.status = 'active'
      AND DATE(b.due_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
      HAVING reminder_sent_today = 0
    `;
    
    return await executeQuery(query);
  }

  // Créer une notification d'email automatique
  static async createEmailNotification(userId, type, bookTitle, daysOverdue = 0) {
    let title, message, dbType;
    
    if (type === 'reminder_email') {
      dbType = 'reminder'; // Utiliser 'reminder' au lieu de 'reminder_email'
      title = `📚 Rappel: ${bookTitle}`;
      message = `Votre livre "${bookTitle}" doit être retourné demain.`;
    } else if (type === 'overdue_email') {
      dbType = 'overdue'; // Utiliser 'overdue' au lieu de 'overdue_email'
      title = `⚠️ Retard: ${bookTitle}`;
      message = `Votre livre "${bookTitle}" est en retard de ${daysOverdue} jour(s).`;
    }
    
    const notificationData = {
      user_id: userId,
      type: dbType, // Utiliser le type compatible avec la base
      title: title,
      message: message,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire dans 7 jours
    };
    
    return await this.create(notificationData);
  }

  // Supprimer les anciennes notifications (nettoyage)
  static async cleanupOldNotifications(daysOld = 30) {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND is_read = TRUE
    `;
    
    const result = await executeQuery(query, [daysOld]);
    console.log(`🧹 ${result.affectedRows} anciennes notifications supprimées`);
    return result.affectedRows;
  }
}

module.exports = Notification;
