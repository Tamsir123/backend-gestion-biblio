const { executeQuery, queryOne } = require('../config/database');

class AnalyticsController {
  // Statistiques générales du dashboard
  static async getDashboardStats(req, res) {
    try {
      // 1. Statistiques générales
      const [totalBooks, totalUsers, totalBorrowings, activeBorrowings, overdueBorrowings, totalReviews, avgRating] = await Promise.all([
        queryOne('SELECT COUNT(*) as count FROM books'),
        queryOne('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
        queryOne('SELECT COUNT(*) as count FROM borrowings'),
        queryOne('SELECT COUNT(*) as count FROM borrowings WHERE status = "active"'),
        queryOne('SELECT COUNT(*) as count FROM borrowings WHERE status = "overdue"'),
        queryOne('SELECT COUNT(*) as count FROM reviews'),
        queryOne('SELECT AVG(rating) as avg_rating FROM reviews')
      ]);

      // Calculer les tendances (simulation - vous pouvez implémenter le calcul réel)
      const thisMonth = await queryOne(`
        SELECT COUNT(*) as count FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      `);
      
      const lastMonth = await queryOne(`
        SELECT COUNT(*) as count FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
        AND borrowed_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      `);

      const borrowingsGrowth = lastMonth?.count > 0 
        ? Math.round(((thisMonth?.count || 0) - (lastMonth?.count || 0)) / (lastMonth?.count || 1) * 100)
        : 0;

      // 2. Activité récente (30 derniers jours)
      const recentActivity = await executeQuery(`
        SELECT 
          DATE(borrowed_at) as date,
          COUNT(CASE WHEN returned_at IS NULL THEN 1 END) as new_borrowings,
          COUNT(CASE WHEN returned_at IS NOT NULL THEN 1 END) as returns
        FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(borrowed_at)
        ORDER BY date ASC
      `);

      // 3. Livres les plus populaires
      const popularBooks = await executeQuery(`
        SELECT 
          b.id,
          b.title,
          b.author,
          COUNT(br.id) as borrow_count
        FROM books b
        JOIN borrowings br ON b.id = br.book_id
        GROUP BY b.id, b.title, b.author
        ORDER BY borrow_count DESC
        LIMIT 10
      `);

      // 4. Heures de pointe
      const peakHours = await executeQuery(`
        SELECT 
          HOUR(borrowed_at) as hour,
          COUNT(*) as activity_count
        FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY HOUR(borrowed_at)
        ORDER BY activity_count DESC
      `);

      // 5. Statistiques par catégories
      const categoriesStats = await executeQuery(`
        SELECT 
          COALESCE(b.genre, 'Non catégorisé') as genre,
          COUNT(DISTINCT b.id) as book_count,
          ROUND(COUNT(DISTINCT b.id) * 100.0 / (SELECT COUNT(*) FROM books), 2) as percentage
        FROM books b
        GROUP BY b.genre
        ORDER BY book_count DESC
        LIMIT 8
      `);

      // Structure de réponse conforme à ce que le frontend attend
      const responseData = {
        overview: {
          total_books: totalBooks?.count || 0,
          total_users: totalUsers?.count || 0,
          active_borrowings: activeBorrowings?.count || 0,
          overdue_borrowings: overdueBorrowings?.count || 0,
          total_reviews: totalReviews?.count || 0,
          average_rating: parseFloat(avgRating?.avg_rating) || 0
        },
        trends: {
          books_growth: 5, // Simulation - calculer la croissance réelle des livres
          users_growth: 8, // Simulation - calculer la croissance réelle des utilisateurs  
          borrowings_growth: borrowingsGrowth
        },
        popular_books: popularBooks,
        recent_activity: recentActivity,
        categories_stats: categoriesStats,
        peak_hours: peakHours
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Erreur analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Statistiques détaillées des emprunts
  static async getBorrowingAnalytics(req, res) {
    try {
      const { period = '30' } = req.query; // 7, 30, 90, 365 jours

      const analytics = {
        borrowingsByDate: [],
        returnsByDate: [],
        overdueAnalysis: {},
        peakHours: []
      };

      // Emprunts par date
      const borrowingsByDate = await executeQuery(`
        SELECT 
          DATE(borrowed_at) as date,
          COUNT(*) as count
        FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(borrowed_at)
        ORDER BY date ASC
      `, [period]);

      analytics.borrowingsByDate = borrowingsByDate;

      // Retours par date
      const returnsByDate = await executeQuery(`
        SELECT 
          DATE(returned_at) as date,
          COUNT(*) as count
        FROM borrowings 
        WHERE returned_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND returned_at IS NOT NULL
        GROUP BY DATE(returned_at)
        ORDER BY date ASC
      `, [period]);

      analytics.returnsByDate = returnsByDate;

      // Analyse des retards
      const overdueAnalysis = await queryOne(`
        SELECT 
          COUNT(*) as total_overdue,
          COALESCE(AVG(DATEDIFF(CURDATE(), due_date)), 0) as avg_days_overdue,
          COALESCE(MAX(DATEDIFF(CURDATE(), due_date)), 0) as max_days_overdue
        FROM borrowings 
        WHERE status = 'active' AND due_date < CURDATE()
      `);

      analytics.overdueAnalysis = overdueAnalysis || {
        total_overdue: 0,
        avg_days_overdue: 0,
        max_days_overdue: 0
      };

      // Heures de pointe (basé sur les emprunts)
      const peakHours = await executeQuery(`
        SELECT 
          HOUR(borrowed_at) as hour,
          COUNT(*) as count
        FROM borrowings 
        WHERE borrowed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY HOUR(borrowed_at)
        ORDER BY hour ASC
      `, [period]);

      analytics.peakHours = peakHours;

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Erreur analytics emprunts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des analytics d\'emprunts'
      });
    }
  }

  // Export des rapports en CSV
  static async exportReport(req, res) {
    try {
      const { type = 'borrowings', period = '30' } = req.query;

      let query = '';
      let filename = '';

      switch (type) {
        case 'borrowings':
          query = `
            SELECT 
              br.id,
              u.name as user_name,
              u.email,
              b.title,
              b.author,
              DATE_FORMAT(br.borrowed_at, '%Y-%m-%d %H:%i:%s') as borrowed_at,
              DATE_FORMAT(br.due_date, '%Y-%m-%d') as due_date,
              DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') as returned_at,
              br.status
            FROM borrowings br
            JOIN users u ON br.user_id = u.id
            JOIN books b ON br.book_id = b.id
            WHERE br.borrowed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY br.borrowed_at DESC
          `;
          filename = `emprunts_${period}j.csv`;
          break;

        case 'users':
          query = `
            SELECT 
              u.id,
              u.name,
              u.email,
              u.role,
              DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at,
              COUNT(br.id) as total_borrowings
            FROM users u
            LEFT JOIN borrowings br ON u.id = br.user_id
            WHERE u.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY u.id
            ORDER BY u.created_at DESC
          `;
          filename = `utilisateurs_${period}j.csv`;
          break;

        case 'books':
          query = `
            SELECT 
              b.id,
              b.title,
              b.author,
              b.genre as category,
              b.isbn,
              b.publication_year,
              COUNT(br.id) as borrow_count
            FROM books b
            LEFT JOIN borrowings br ON b.id = br.book_id
            GROUP BY b.id
            ORDER BY borrow_count DESC
          `;
          filename = `livres_statistiques.csv`;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Type de rapport non valide'
          });
      }

      const data = await executeQuery(query, type === 'books' ? [] : [period]);

      // Convertir en CSV
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Aucune donnée trouvée pour cette période'
        });
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        }).join(',')
      );

      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csv); // BOM pour Excel

    } catch (error) {
      console.error('Erreur export rapport:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export du rapport'
      });
    }
  }
}

module.exports = AnalyticsController;
