# 📧 Guide du Système de Notifications par Email

## 🚀 Configuration

### 1. Variables d'environnement (.env)

```env
# Configuration Email (Gmail)
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application
EMAIL_SERVICE=gmail
```

### 2. Configuration Gmail

1. **Activer l'authentification à 2 facteurs** sur votre compte Gmail
2. Aller dans **"Mots de passe d'application"** dans les paramètres Google
3. Générer un **mot de passe d'application** pour "Mail"
4. Utiliser ce mot de passe dans `EMAIL_PASS` (pas votre mot de passe Gmail habituel)

## 📋 Fonctionnalités

### ⏰ Notifications Automatiques

- **Rappels** : Envoyés 1 jour avant l'échéance (10h00 chaque jour)
- **Retards** : Envoyés pour les livres en retard (9h00 chaque jour)
- **Nettoyage** : Suppression des anciennes notifications (dimanche 3h00)

### 📧 Types d'emails

1. **📚 Rappel de retour** : Livre à rendre demain
2. **⚠️ Notification de retard** : Livre en retard avec nombre de jours
3. **✅ Confirmation d'emprunt** : Confirmation lors d'un nouvel emprunt

## 🛠️ API Endpoints

### Routes Utilisateur

```
GET    /api/notifications           # Récupérer ses notifications
PUT    /api/notifications/:id/read  # Marquer comme lue
PUT    /api/notifications/mark-all-read # Marquer toutes comme lues
```

### Routes Admin

```
GET    /api/notifications/stats     # Statistiques des notifications
POST   /api/notifications/test-email # Tester la configuration email
POST   /api/notifications/send-overdue # Envoyer manuellement les notifications de retard
POST   /api/notifications/send-reminders # Envoyer manuellement les rappels
DELETE /api/notifications/cleanup   # Nettoyer les anciennes notifications
```

## 🧪 Tests

### 1. Tester la configuration

```bash
node scripts/test-notifications.js
```

### 2. Tester avec un email spécifique

```bash
node scripts/test-notifications.js votre-email@example.com
```

### 3. API de test (Admin seulement)

```bash
# Tester la configuration email
curl -X POST http://localhost:5000/api/notifications/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Voir les statistiques
curl -X GET http://localhost:5000/api/notifications/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Envoyer manuellement les notifications de retard
curl -X POST http://localhost:5000/api/notifications/send-overdue \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📮 Tests avec Postman

### Étape 1 : Authentification Admin

1. **Créer une nouvelle requête POST**
   - URL : `http://localhost:5000/api/auth/login`
   - Method : `POST`
   - Headers : `Content-Type: application/json`

2. **Body (raw JSON) :**
```json
{
  "email": "tam@admin2ie.edu.org.com",
  "password": "Motdepassefort23"
}
```

3. **Récupérer le token** de la réponse pour les tests suivants

### Étape 2 : Tester la Configuration Email

1. **Nouvelle requête POST**
   - URL : `http://localhost:5000/api/notifications/test-email`
   - Method : `POST`
   - Headers : 
     - `Authorization: Bearer YOUR_TOKEN_HERE`
     - `Content-Type: application/json`

### Étape 3 : Voir les Statistiques

1. **Nouvelle requête GET**
   - URL : `http://localhost:5000/api/notifications/stats`
   - Method : `GET`
   - Headers : `Authorization: Bearer YOUR_TOKEN_HERE`

### Étape 4 : Tests d'Envoi Manuel

#### 4.1 Envoyer les Notifications de Retard
- URL : `http://localhost:5000/api/notifications/send-overdue`
- Method : `POST`
- Headers : `Authorization: Bearer YOUR_TOKEN_HERE`

#### 4.2 Envoyer les Rappels
- URL : `http://localhost:5000/api/notifications/send-reminders`
- Method : `POST`
- Headers : `Authorization: Bearer YOUR_TOKEN_HERE`

### Étape 5 : Gestion des Notifications (Utilisateur)

#### 5.1 Récupérer ses Notifications
- URL : `http://localhost:5000/api/notifications`
- Method : `GET`
- Headers : `Authorization: Bearer USER_TOKEN`
- Query Parameters (optionnel) : `includeRead=true`

#### 5.2 Marquer une Notification comme Lue
- URL : `http://localhost:5000/api/notifications/{NOTIFICATION_ID}/read`
- Method : `PUT`
- Headers : `Authorization: Bearer USER_TOKEN`

#### 5.3 Marquer Toutes les Notifications comme Lues
- URL : `http://localhost:5000/api/notifications/mark-all-read`
- Method : `PUT`
- Headers : `Authorization: Bearer USER_TOKEN`

### 🎯 Collection Postman Recommandée

Créez une collection avec ces requêtes dans l'ordre :

1. **Auth Admin** - Login admin
2. **Test Email Config** - Vérifier la config email
3. **Get Stats** - Voir les statistiques
4. **Send Overdue** - Envoyer notifications retard
5. **Send Reminders** - Envoyer rappels
6. **Cleanup** - Nettoyer anciennes notifications

### Variables d'Environnement Postman

Créez un environnement avec :
- `base_url` : `http://localhost:5000`
- `admin_token` : (sera défini après login)
- `user_token` : (pour tests utilisateur)

### 📧 Guide Pratique de Test des Emails

#### Configuration Préalable

1. **Assurez-vous que le fichier .env contient :**
```env
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application-gmail
EMAIL_SERVICE=gmail
```

2. **Démarrez le serveur :**
```bash
cd /home/tamsir/Desktop/backend-gestion-biblio
npm start
```

#### Test Étape par Étape avec Postman

##### 1. Connexion Admin
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "tam@admin2ie.edu.org.com", 
  "password": "Motdepassefort23"
}
```
**Réponse attendue :** Token JWT à copier

##### 2. Test de Configuration Email
```
POST http://localhost:5000/api/notifications/test-email
Authorization: Bearer [VOTRE_TOKEN]
Content-Type: application/json
```
**Réponse attendue :** 
- ✅ `"Configuration email valide"` si tout fonctionne
- ❌ `"Configuration email invalide"` si problème

##### 3. Vérifier les Statistiques
```
GET http://localhost:5000/api/notifications/stats
Authorization: Bearer [VOTRE_TOKEN]
```
**Réponse attendue :** Liste des emprunts en retard et à échéance

##### 4. Envoyer un Test d'Email de Retard
```
POST http://localhost:5000/api/notifications/send-overdue
Authorization: Bearer [VOTRE_TOKEN]
```
**Réponse attendue :** Confirmation d'envoi + nombre d'emails envoyés

##### 5. Envoyer un Test de Rappel
```
POST http://localhost:5000/api/notifications/send-reminders
Authorization: Bearer [VOTRE_TOKEN]
```
**Réponse attendue :** Confirmation d'envoi + nombre de rappels envoyés

#### 🔍 Vérification des Emails

Après chaque test d'envoi :
1. **Vérifiez votre boîte de réception** (et dossier spam)
2. **Vérifiez les logs du serveur** dans la console
3. **Testez avec différents comptes utilisateurs**

#### 🛠️ Résolution de Problèmes

**Si "Configuration email invalide" :**
- Vérifiez `EMAIL_USER` et `EMAIL_PASS` dans `.env`
- Assurez-vous d'utiliser un mot de passe d'application Gmail
- Redémarrez le serveur après modification du `.env`

**Si aucun email n'est envoyé :**
- Vérifiez qu'il y a des emprunts en retard dans la base
- Utilisez `/api/notifications/stats` pour voir les données
- Vérifiez les logs du serveur pour les erreurs

**Si erreur d'authentification :**
- Vérifiez que le token admin est valide
- Reconnectez-vous si nécessaire

## 📊 Exemple de Réponse API

### Statistiques des notifications

```json
{
  "success": true,
  "data": {
    "overdueCount": 2,
    "reminderCount": 1,
    "overdueBorrowings": [
      {
        "borrowing_id": 1,
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "book_title": "Les Misérables",
        "days_overdue": 3
      }
    ],
    "borrowingsDueTomorrow": [
      {
        "borrowing_id": 2,
        "user_id": 2,
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@example.com",
        "book_title": "Le Petit Prince",
        "due_date": "2025-07-02"
      }
    ]
  }
}
```

## 🔧 Dépannage

### Problèmes courants

1. **"Configuration email invalide"**
   - Vérifiez `EMAIL_USER` et `EMAIL_PASS` dans le .env
   - Assurez-vous d'utiliser un mot de passe d'application Gmail

2. **"Erreur d'authentification"**
   - Vérifiez que l'authentification 2FA est activée
   - Régénérez le mot de passe d'application

3. **"Aucun email envoyé"**
   - Vérifiez les emprunts en base de données
   - Testez avec `/api/notifications/stats`

### Logs utiles

```bash
# Démarrer le serveur en mode développement
npm run dev

# Surveiller les logs
tail -f logs/notifications.log
```

## 🔒 Sécurité

- Les routes admin nécessitent une authentification
- Les mots de passe d'application sont plus sécurisés que les mots de passe Gmail
- Les emails contiennent uniquement les informations nécessaires
- Nettoyage automatique des anciennes notifications

## 📱 Intégration Frontend

Pour intégrer les notifications dans le frontend React :

```javascript
// Récupérer les notifications
const fetchNotifications = async () => {
  const response = await fetch('/api/notifications', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.data.notifications;
};

// Marquer comme lue
const markAsRead = async (notificationId) => {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

## 🎯 Prochaines Étapes

1. **Tests avec de vrais emails**
2. **Personnalisation des templates HTML**
3. **Ajout de notifications SMS** (optionnel)
4. **Interface admin pour gérer les notifications**
5. **Rapports de performance des emails**
