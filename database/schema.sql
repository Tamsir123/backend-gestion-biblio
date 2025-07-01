-- ============================================
-- CREATION DE LA BASE DE DONNEES OPTIMISEE
-- Système de Gestion de Bibliothèque
-- ============================================

DROP DATABASE IF EXISTS bibliotheque_web;
CREATE DATABASE bibliotheque_web CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE bibliotheque_web;

-- ============================================
-- TABLE: users (Utilisateurs)
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(255), -- URL ou chemin de l'image de profil
    phone VARCHAR(20), -- Numéro de téléphone
    address VARCHAR(255), -- Adresse postale
    date_of_birth DATE, -- Date de naissance
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Index pour optimiser les recherches
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
);

-- ============================================
-- TABLE: books (Livres)
-- ============================================
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    genre VARCHAR(50),
    description TEXT,
    cover_image VARCHAR(255), -- Chemin ou URL de la couverture
    total_quantity INT NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    publication_year YEAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Index pour optimiser les recherches
    INDEX idx_books_title (title),
    INDEX idx_books_author (author),
    INDEX idx_books_genre (genre),
    INDEX idx_books_isbn (isbn),
    
    -- Contrainte: quantité disponible <= quantité totale
    CONSTRAINT chk_available_quantity CHECK (available_quantity <= total_quantity)
);

-- ============================================
-- TABLE: borrowings (Emprunts)
-- ============================================
CREATE TABLE borrowings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    returned_at DATETIME NULL,
    status ENUM('active', 'returned', 'overdue') NOT NULL DEFAULT 'active',
    renewal_count INT DEFAULT 0 CHECK (renewal_count >= 0),
    notes TEXT,
    comment_text TEXT,
    -- Clés étrangères
    CONSTRAINT fk_borrowing_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_borrowing_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- Index pour optimiser les recherches
    INDEX idx_borrowings_user (user_id),
    INDEX idx_borrowings_book (book_id),
    INDEX idx_borrowings_status (status),
    INDEX idx_borrowings_due_date (due_date)
);

-- Trigger pour empêcher les emprunts multiples du même livre par le même utilisateur
DELIMITER //
CREATE TRIGGER prevent_multiple_active_borrowings
BEFORE INSERT ON borrowings
FOR EACH ROW
BEGIN
    DECLARE existing_count INT DEFAULT 0;
    
    IF NEW.status = 'active' THEN
        SELECT COUNT(*) INTO existing_count 
        FROM borrowings 
        WHERE user_id = NEW.user_id 
          AND book_id = NEW.book_id 
          AND status = 'active';
          
        IF existing_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already has an active borrowing for this book';
        END IF;
    END IF;
END//
DELIMITER ;

-- ============================================
-- TABLE: reviews (Avis et commentaires)
-- ============================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    
    -- Un utilisateur ne peut faire qu'un seul avis par livre
    UNIQUE KEY unique_user_book_review (user_id, book_id),
    
    -- Index
    INDEX idx_reviews_book (book_id),
    INDEX idx_reviews_rating (rating)
);

-- ============================================
-- TABLE: notifications (Notifications)
-- ============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('reminder', 'overdue', 'approval', 'general') NOT NULL DEFAULT 'general',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    
    -- Clé étrangère
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Index
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_read (is_read)
);

-- ============================================
-- TABLE: book_categories (Catégories de livres)
-- ============================================
CREATE TABLE book_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: book_category_relations (Relation livre-catégorie)
-- ============================================
CREATE TABLE book_category_relations (
    book_id INT NOT NULL,
    category_id INT NOT NULL,
    
    PRIMARY KEY (book_id, category_id),
    
    CONSTRAINT fk_book_cat_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_cat_category FOREIGN KEY (category_id) REFERENCES book_categories(id) ON DELETE CASCADE
);

-- ============================================
-- TRIGGERS POUR AUTOMATISER LA GESTION
-- ============================================

-- Trigger: Mise à jour automatique de available_quantity lors d'un emprunt
DELIMITER //
CREATE TRIGGER update_quantity_after_borrow
AFTER INSERT ON borrowings
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE books 
        SET available_quantity = available_quantity - 1 
        WHERE id = NEW.book_id AND available_quantity > 0;
    END IF;
END//

-- Trigger: Mise à jour automatique de available_quantity lors d'un retour
CREATE TRIGGER update_quantity_after_return
AFTER UPDATE ON borrowings
FOR EACH ROW
BEGIN
    IF OLD.status = 'active' AND NEW.status = 'returned' THEN
        UPDATE books 
        SET available_quantity = available_quantity + 1 
        WHERE id = NEW.book_id;
    END IF;
END//

-- Trigger: Mise à jour du statut overdue automatiquement
CREATE TRIGGER check_overdue_status
BEFORE UPDATE ON borrowings
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' AND NEW.due_date < NOW() THEN
        SET NEW.status = 'overdue';
    END IF;
END//

DELIMITER ;

-- ============================================
-- DONNEES DE TEST
-- ============================================

-- Exemples d'insertion d'utilisateurs enrichis
INSERT INTO users (name, email, password, role, is_active, profile_image, phone, address, date_of_birth)
VALUES
('Admin Principal', 'admin@biblio.com', '$2b$10$hashadmin', 'admin', TRUE, 'admin.jpg', '+22670000000', '2iE, Ouaga', '1980-01-01'),
('Awa Traoré', 'awa.traore@etu.2ie-edu.org', '$2b$10$hashawa', 'student', TRUE, 'awa.jpg', '+22670123456', 'Ouagadougou, BF', '2001-05-12'),
('Moussa Diallo', 'moussa.diallo@etu.2ie-edu.org', '$2b$10$hashmoussa', 'student', TRUE, NULL, '+22670234567', 'Bobo-Dioulasso, BF', '2000-11-23'),
('Fatoumata Koné', 'fatou.kone@etu.2ie-edu.org', '$2b$10$hashfatou', 'student', TRUE, 'fatou.png', NULL, 'Abidjan, CI', '2002-03-08'),
('Jean Dupont', 'jean.dupont@etu.2ie-edu.org', '$2b$10$hashjean', 'student', FALSE, NULL, NULL, NULL, NULL);
-- Les mots de passe sont à remplacer par des hash bcrypt valides en production.

-- Catégories de livres
INSERT INTO book_categories (name, description) VALUES 
('Fiction', 'Romans et nouvelles de fiction'),
('Science-Fiction', 'Livres de science-fiction et fantasy'),
('Histoire', 'Livres d\'histoire et biographies'),
('Sciences', 'Livres scientifiques et techniques'),
('Philosophie', 'Ouvrages philosophiques'),
('Littérature Classique', 'Grands classiques de la littérature');

-- Livres d'exemple
INSERT INTO books (title, author, isbn, genre, description, total_quantity, available_quantity, publication_year) VALUES 
(
    'Le Petit Prince', 
    'Antoine de Saint-Exupéry', 
    '978-2-07-040853-7',
    'Littérature jeunesse',
    'L\'histoire d\'un petit prince qui voyage de planète en planète et nous enseigne des leçons de vie importantes sur l\'amour, l\'amitié et la nature humaine.',
    5, 5, 1943
),
(
    '1984', 
    'George Orwell', 
    '978-0-452-28423-4',
    'Science-fiction dystopique',
    'Un roman visionnaire qui dépeint une société totalitaire où Big Brother surveille chaque geste des citoyens. Une œuvre incontournable sur les dangers de la surveillance de masse.',
    3, 3, 1949
),
(
    'L\'Étranger', 
    'Albert Camus', 
    '978-2-07-036002-1',
    'Philosophie existentialiste',
    'L\'histoire de Meursault, un homme indifférent qui commet un meurtre absurde. Une réflexion profonde sur l\'absurdité de l\'existence humaine.',
    4, 4, 1942
);

-- ============================================
-- VUES UTILES POUR L'APPLICATION
-- ============================================

-- Vue: Livres avec informations d'emprunt
CREATE VIEW books_with_borrowing_info AS
SELECT 
    b.*,
    COALESCE(borrowed_count.count, 0) as currently_borrowed,
    COALESCE(avg_rating.average, 0) as average_rating,
    COALESCE(review_count.count, 0) as review_count
FROM books b
LEFT JOIN (
    SELECT book_id, COUNT(*) as count 
    FROM borrowings 
    WHERE status = 'active' 
    GROUP BY book_id
) borrowed_count ON b.id = borrowed_count.book_id
LEFT JOIN (
    SELECT book_id, AVG(rating) as average 
    FROM reviews 
    GROUP BY book_id
) avg_rating ON b.id = avg_rating.book_id
LEFT JOIN (
    SELECT book_id, COUNT(*) as count 
    FROM reviews 
    GROUP BY book_id
) review_count ON b.id = review_count.book_id;

-- Vue: Emprunts avec détails
CREATE VIEW borrowings_with_details AS
SELECT 
    br.*,
    u.name as user_name,
    u.email as user_email,
    b.title as book_title,
    b.author as book_author,
    CASE 
        WHEN br.status = 'active' AND br.due_date < NOW() THEN 'overdue'
        ELSE br.status 
    END as current_status,
    DATEDIFF(NOW(), br.due_date) as days_overdue
FROM borrowings br
JOIN users u ON br.user_id = u.id
JOIN books b ON br.book_id = b.id;

COMMIT;
