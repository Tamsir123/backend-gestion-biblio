## 📊 Schéma de la base de données

### 🧑 users
| Champ       | Type         | Description              |
|-------------|--------------|--------------------------|
| id          | INT (PK)     | Identifiant unique       |
| name        | VARCHAR      | Nom complet              |
| email       | VARCHAR      | Email unique             |
| password    | VARCHAR      | Mot de passe hashé       |
| role        | ENUM         | 'student' ou 'admin'     |
| created_at  | DATETIME     | Date de création         |

### 📚 books
| Champ       | Type         | Description              |
|-------------|--------------|--------------------------|
| id          | INT (PK)     | Identifiant unique       |
| title       | VARCHAR      | Titre du livre           |
| author      | VARCHAR      | Auteur                   |
| genre       | VARCHAR      | Genre littéraire         |
| quantity    | INT          | Nombre d’exemplaires     |
| created_at  | DATETIME     | Date d’ajout             |

### 📄 borrowings
| Champ        | Type         | Description                            |
|--------------|--------------|----------------------------------------|
| id           | INT (PK)     | ID de l’emprunt                        |
| user_id      | INT (FK)     | Référence vers `users(id)`             |
| book_id      | INT (FK)     | Référence vers `books(id)`             |
| borrowed_at  | DATETIME     | Date d’emprunt                         |
| due_date     | DATETIME     | Date limite de retour                  |
| returned_at  | DATETIME     | Date réelle de retour (nullable)       |
| status       | ENUM         | 'borrowed', 'returned', 'late'         |

### ⭐ reviews
| Champ        | Type         | Description                      |
|--------------|--------------|----------------------------------|
| id           | INT (PK)     | ID de l’avis                     |
| user_id      | INT (FK)     | Utilisateur ayant commenté       |
| book_id      | INT (FK)     | Livre concerné                   |
| rating       | TINYINT      | Note de 1 à 5                    |
| comment      | TEXT         | Commentaire (optionnel)          |
| created_at   | DATETIME     | Date du commentaire              |

### 🔔 notifications
| Champ       | Type         | Description                      |
|-------------|--------------|----------------------------------|
| id          | INT (PK)     | ID de la notification            |
| user_id     | INT (FK)     | Utilisateur concerné             |
| message     | TEXT         | Contenu de la notification       |
| sent_at     | DATETIME     | Date d’envoi                     |
| is_read     | BOOLEAN      | Lu ou non (false par défaut)     |

### 🔗 Relations
- `users` ⟷ `borrowings`, `reviews`, `notifications`
- `books` ⟷ `borrowings`, `reviews`
