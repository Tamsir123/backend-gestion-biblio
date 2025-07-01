-- Script pour corriger la table borrowings et supprimer la contrainte problématique

USE bibliotheque_web;

-- Supprimer l'index unique problématique s'il existe
ALTER TABLE borrowings DROP INDEX unique_active_borrowing;

-- Créer un trigger pour empêcher les emprunts multiples actifs
DROP TRIGGER IF EXISTS prevent_multiple_active_borrowings;

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

-- Afficher la structure de la table pour vérification
DESCRIBE borrowings;
SHOW INDEX FROM borrowings;
