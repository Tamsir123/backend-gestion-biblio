const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Configuration du transporteur email
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // ou votre service email
      auth: {
        user: process.env.EMAIL_USER || 'votre-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'votre-mot-de-passe-app'
      }
    });
  }

  // Envoyer un email de rappel
  async sendReminder(userEmail, userName, bookTitle) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'bibliotheque@universite.com',
      to: userEmail,
      subject: '📚 Rappel de retour - Bibliothèque Universitaire',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">📚 Rappel de retour</h2>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Ceci est un rappel amical concernant votre emprunt :</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin: 0 0 10px 0;">📖 ${bookTitle}</h3>
            <p style="color: #6c757d; margin: 0;">
              <strong>Date limite de retour :</strong> Demain
            </p>
          </div>
          
          <p>Merci de retourner ce livre à temps pour permettre à d'autres étudiants d'en profiter.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              📧 Cet email a été envoyé automatiquement par le système de gestion de bibliothèque.<br>
              🏫 Bibliothèque Universitaire - 2ie
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de rappel envoyé à ${userEmail} pour le livre "${bookTitle}"`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi email à ${userEmail}:`, error.message);
      return false;
    }
  }

  // Envoyer un email de retard
  async sendOverdueNotification(userEmail, userName, bookTitle, daysOverdue) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'bibliotheque@universite.com',
      to: userEmail,
      subject: '⚠️ Livre en retard - Action requise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">⚠️ Livre en retard</h2>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre emprunt est <strong style="color: #dc3545;">en retard de ${daysOverdue} jour(s)</strong> :</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin: 0 0 10px 0;">📖 ${bookTitle}</h3>
            <p style="color: #721c24; margin: 0;">
              <strong>Retard :</strong> ${daysOverdue} jour(s)
            </p>
          </div>
          
          <p><strong>Action requise :</strong></p>
          <ul>
            <li>Retournez le livre dès que possible</li>
            <li>Contactez la bibliothèque si vous avez des difficultés</li>
            <li>Des frais de retard peuvent s'appliquer</li>
          </ul>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              💡 <strong>Astuce :</strong> Vous pouvez renouveler vos emprunts en ligne si le livre n'est pas réservé par un autre étudiant.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              📧 Cet email a été envoyé automatiquement par le système de gestion de bibliothèque.<br>
              🏫 Bibliothèque Universitaire - 2ie
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de retard envoyé à ${userEmail} pour le livre "${bookTitle}" (${daysOverdue} jours)`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi email à ${userEmail}:`, error.message);
      return false;
    }
  }

  // Envoyer un email de confirmation d'emprunt
  async sendBorrowConfirmation(userEmail, userName, bookTitle, dueDate) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'bibliotheque@universite.com',
      to: userEmail,
      subject: '✅ Confirmation d\'emprunt - Bibliothèque',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Emprunt confirmé</h2>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre emprunt a été confirmé avec succès :</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin: 0 0 10px 0;">📖 ${bookTitle}</h3>
            <p style="color: #155724; margin: 0;">
              <strong>Date de retour :</strong> ${new Date(dueDate).toLocaleDateString('fr-FR')}
            </p>
          </div>
          
          <p>Bonne lecture ! 📚</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              📧 Cet email a été envoyé automatiquement par le système de gestion de bibliothèque.<br>
              🏫 Bibliothèque Universitaire - 2ie
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de confirmation envoyé à ${userEmail} pour le livre "${bookTitle}"`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi email à ${userEmail}:`, error.message);
      return false;
    }
  }

  // Tester la configuration email
  async testConfiguration() {
    try {
      await this.transporter.verify();
      console.log('✅ Configuration email valide');
      return true;
    } catch (error) {
      console.error('❌ Configuration email invalide:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
