-- ============================================
-- MIGRATION: Amélioration du profil utilisateur
-- Ajout de champs supplémentaires pour les étudiants
-- ============================================

USE bibliotheque_web;

-- Ajout de nouveaux champs à la table users
ALTER TABLE users 
ADD COLUMN student_id VARCHAR(50) UNIQUE AFTER email,
ADD COLUMN department VARCHAR(100) AFTER phone,
ADD COLUMN level ENUM('L1', 'L2', 'L3', 'M1', 'M2', 'PhD') AFTER department,
ADD COLUMN country VARCHAR(100) DEFAULT 'Burkina Faso' AFTER address,
ADD COLUMN city VARCHAR(100) AFTER country,
ADD COLUMN emergency_contact_name VARCHAR(100) AFTER date_of_birth,
ADD COLUMN emergency_contact_phone VARCHAR(20) AFTER emergency_contact_name,
ADD COLUMN bio TEXT AFTER emergency_contact_phone,
ADD COLUMN favorite_genres TEXT AFTER bio,
ADD COLUMN last_login_at DATETIME AFTER favorite_genres;

-- Ajout d'index pour les nouveaux champs
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_country ON users(country);

-- Ajout d'une table pour les préférences utilisateur
CREATE TABLE user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    language ENUM('fr', 'en') DEFAULT 'fr',
    theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
    privacy_profile ENUM('public', 'friends', 'private') DEFAULT 'public',
    receive_recommendations BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (user_id)
);

-- Table pour l'historique des connexions (optionnel, pour la sécurité)
CREATE TABLE user_login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
    location VARCHAR(100),
    
    CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_login_history_user (user_id),
    INDEX idx_login_history_date (login_at)
);

-- Insertion de données d'exemple pour les nouveaux champs
UPDATE users SET 
    student_id = CONCAT('2IE', YEAR(CURDATE()), LPAD(id, 4, '0')),
    department = CASE 
        WHEN id % 5 = 0 THEN 'Informatique'
        WHEN id % 5 = 1 THEN 'Génie Civil'
        WHEN id % 5 = 2 THEN 'Génie Électrique'
        WHEN id % 5 = 3 THEN 'Télécommunications'
        ELSE 'Management'
    END,
    level = CASE 
        WHEN id % 6 = 0 THEN 'L1'
        WHEN id % 6 = 1 THEN 'L2'
        WHEN id % 6 = 2 THEN 'L3'
        WHEN id % 6 = 3 THEN 'M1'
        WHEN id % 6 = 4 THEN 'M2'
        ELSE 'PhD'
    END,
    country = 'Burkina Faso',
    city = CASE 
        WHEN id % 4 = 0 THEN 'Ouagadougou'
        WHEN id % 4 = 1 THEN 'Bobo-Dioulasso'
        WHEN id % 4 = 2 THEN 'Koudougou'
        ELSE 'Ouahigouya'
    END,
    date_of_birth = DATE_SUB(CURDATE(), INTERVAL (18 + (id % 10)) YEAR)
WHERE student_id IS NULL;

-- Insertion des préférences par défaut pour tous les utilisateurs existants
INSERT INTO user_preferences (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM user_preferences);

COMMIT;

-- Affichage du résultat
SELECT 'Migration terminée avec succès!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as users_with_preferences FROM user_preferences;
