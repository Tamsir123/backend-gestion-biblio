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

