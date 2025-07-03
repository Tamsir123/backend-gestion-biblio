# ÉVOLUTION DU SCHÉMA DE BASE DE DONNÉES

## Version actuelle: 2.0.0 (2025-07-03)

### 📋 Résumé des tables

| Table | Description | Statut |
|-------|-------------|--------|
| `users` | Informations des utilisateurs (étudiants/admins) | ✅ Complet |
| `user_preferences` | Préférences utilisateur (notifications, thème, etc.) | ✅ Complet |
| `user_login_history` | Historique des connexions | ✅ Complet |
| `books` | Catalogue des livres | ✅ Complet |
| `book_categories` | Catégories de livres | ✅ Complet |
| `book_category_relations` | Relations many-to-many livres-catégories | ✅ Complet |
| `borrowings` | Emprunts de livres | ✅ Complet |
| `reviews` | Avis et évaluations des livres | ✅ Complet |
| `notifications` | Système de notifications | ✅ Complet |

### 🔍 Vues (Views)

| Vue | Description | Utilité |
|-----|-------------|---------|
| `books_with_borrowing_info` | Livres avec stats d'emprunt et notes | Dashboard, catalogue |
| `borrowings_with_details` | Emprunts avec infos utilisateur/livre | Gestion des emprunts |
| `users_with_stats` | Utilisateurs avec statistiques | Dashboard admin |

### ⚡ Triggers

| Trigger | Fonction | Impact |
|---------|----------|--------|
| `update_book_quantity_on_borrow` | Met à jour available_quantity lors d'emprunt | Gestion automatique du stock |
| `update_book_quantity_on_return` | Met à jour available_quantity lors de retour | Gestion automatique du stock |
| `update_overdue_status` | Marque les emprunts en retard | Gestion automatique des retards |

### 📊 Index principaux

- **Utilisateurs**: email, role, student_id, department, level, country
- **Livres**: title, author, genre, isbn
- **Emprunts**: user_id, book_id, status, due_date
- **Avis**: book_id, rating
- **Notifications**: user_id, type, is_read
- **Historique**: user_id, login_at

### 🔐 Contraintes et règles métier

#### Utilisateurs
- ✅ Email unique obligatoire
- ✅ student_id unique si fourni
- ✅ Détection automatique du rôle basée sur l'email
- ✅ Soft delete avec is_active

#### Livres
- ✅ ISBN unique si fourni
- ✅ Gestion automatique des quantités (available_quantity ≤ total_quantity)
- ✅ Support des images de couverture

#### Emprunts
- ✅ Statut automatique (active → overdue si date dépassée)
- ✅ Système de renouvellement (renewal_count)
- ✅ Historique complet des emprunts

#### Avis/Reviews
- ✅ Un seul avis par utilisateur par livre
- ✅ Rating entre 1 et 5
- ✅ Système de modération (is_approved)

#### Notifications
- ✅ Types: reminder, overdue, approval, general
- ✅ Expiration automatique possible
- ✅ Marquage lu/non-lu

### 🚀 Fonctionnalités avancées

#### Gestion des rôles
- **Détection automatique**: emails contenant "admin", "direction", "bibliothecaire" → rôle admin
- **Sécurité**: frontend ne peut pas forcer le rôle, détection côté backend

#### Profils utilisateurs complets
- Informations personnelles étendues
- Préférences personnalisables
- Statistiques d'utilisation
- Historique de connexion

#### Analytics et reporting
- Vues optimisées pour les dashboards
- Statistiques pré-calculées
- Support pour l'export de données

#### Système de notifications
- Types multiples (rappels, retards, approbations)
- Expiration automatique
- Gestion de l'état lu/non-lu

### 📈 Performances

#### Optimisations mises en place
- **Index composés** pour les requêtes fréquentes
- **Vues matérialisées** pour les statistiques
- **Triggers** pour la mise à jour automatique
- **Pool de connexions** dans l'application

#### Recommandations futures
- Mise en place de cache Redis pour les données fréquemment consultées
- Archivage des anciens emprunts
- Logs d'audit pour les actions sensibles

### 🔄 Migrations récentes

#### v2.0.0 (2025-07-03)
- ✅ Correction du middleware auth (id vs userId)
- ✅ Ajout du système de préférences utilisateur
- ✅ Amélioration de la table user_login_history
- ✅ Optimisation des index
- ✅ Ajout des vues pour les performances
- ✅ Triggers pour la gestion automatique

#### v1.9.0 (2025-07-02)
- ✅ Ajout de la détection automatique des rôles
- ✅ Extension des champs utilisateur (profil complet)
- ✅ Système de notifications complet
- ✅ Table de catégories de livres

#### v1.8.0 (2025-07-01)
- ✅ Correction de la table borrowings (colonnes manquantes)
- ✅ Ajout du système d'avis/reviews
- ✅ Amélioration de la gestion des emprunts

### 🛠️ Outils de maintenance

#### Procédures stockées
- `CleanExpiredBorrowings()`: Marque les emprunts en retard
- `GetLibraryStats()`: Statistiques générales de la bibliothèque

#### Scripts utiles
- `analyze-db.js`: Analyse de la structure de la DB
- `check_and_migrate.js`: Vérification et migration des données
- `test-role-consistency.js`: Test de cohérence des rôles

### 📝 Notes pour les développeurs

#### Convention de nommage
- **Tables**: snake_case (users, user_preferences, book_categories)
- **Colonnes**: snake_case (created_at, is_active, student_id)
- **Index**: idx_tablename_column (idx_users_email, idx_borrowings_status)
- **Foreign Keys**: table_id (user_id, book_id)

#### Types de données
- **IDs**: INT AUTO_INCREMENT
- **Textes courts**: VARCHAR avec limite appropriée
- **Textes longs**: TEXT
- **Booléens**: TINYINT(1)
- **Dates**: DATETIME avec DEFAULT CURRENT_TIMESTAMP
- **Énumérations**: ENUM pour les valeurs fixes

#### Sécurité
- Toutes les FK avec CASCADE approprié
- Validation des contraintes métier
- Index sur les colonnes de recherche fréquente
- Soft delete pour les données importantes

### 🔮 Roadmap future

#### Version 2.1.0 (prévue)
- [ ] Système de réservation de livres
- [ ] Historique détaillé des actions (audit logs)
- [ ] Support multilingue complet
- [ ] Système de recommandations basé sur l'IA

#### Version 2.2.0 (prévue)
- [ ] Intégration avec des APIs externes (WorldCat, Google Books)
- [ ] Système de chat/messagerie
- [ ] Gestion des amendes automatique
- [ ] Export avancé (PDF, Excel)

---

**Dernière mise à jour**: 2025-07-03  
**Développeur**: Tamsir Diouf  
**Statut**: ✅ Production Ready
