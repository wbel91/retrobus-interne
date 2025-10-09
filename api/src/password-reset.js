import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configuration email (à adapter selon votre service)
const transporter = nodemailer.createTransporter({
  // Configuration à personnaliser
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const passwordResetAPI = {
  // Demander une réinitialisation de mot de passe
  async requestReset(req, res) {
    try {
      const { memberId } = req.params;
      const requestedBy = req.user?.id || 'admin';
      
      // Vérifier que le membre existe et a accès à l'intranet
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Membre introuvable' });
      }

      if (!member.hasInternalAccess) {
        return res.status(400).json({ error: 'Ce membre n\'a pas accès à l\'intranet' });
      }

      // Invalider les anciens tokens
      await prisma.passwordReset.updateMany({
        where: {
          memberId,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      });

      // Générer un nouveau token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expire dans 24h

      const passwordReset = await prisma.passwordReset.create({
        data: {
          memberId,
          token,
          expiresAt,
          requestedBy
        }
      });

      // Envoyer l'email de réinitialisation
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@retrobus-essonne.fr',
        to: member.email,
        subject: '🔐 Réinitialisation de votre mot de passe MyRBE',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #be003c, #e40045); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🚌 RétroBus Essonne</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">Votre plateforme MyRBE</p>
            </div>
            
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${member.firstName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Une demande de réinitialisation de mot de passe a été effectuée pour votre compte MyRBE.
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #be003c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  🔐 Réinitialiser mon mot de passe
                </a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 25px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ Important :</strong> Ce lien est valable pendant 24 heures seulement.
                  Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
              </div>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #be003c; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            
            <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2025 RétroBus Essonne - Association loi 1901</p>
              <p style="margin: 5px 0 0;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        `
      });

      res.json({ 
        message: 'Email de réinitialisation envoyé',
        sentTo: member.email 
      });
    } catch (error) {
      console.error('Erreur demande réinitialisation:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Valider un token de réinitialisation
  async validateToken(req, res) {
    try {
      const { token } = req.params;
      
      const passwordReset = await prisma.passwordReset.findUnique({
        where: { token },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      if (!passwordReset) {
        return res.status(404).json({ error: 'Token invalide' });
      }

      if (passwordReset.usedAt) {
        return res.status(400).json({ error: 'Token déjà utilisé' });
      }

      if (new Date() > passwordReset.expiresAt) {
        return res.status(400).json({ error: 'Token expiré' });
      }
      
      res.json({ 
        valid: true,
        member: passwordReset.member 
      });
    } catch (error) {
      console.error('Erreur validation token:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Réinitialiser le mot de passe
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      const passwordReset = await prisma.passwordReset.findUnique({
        where: { token },
        include: { member: true }
      });
      
      if (!passwordReset || passwordReset.usedAt || new Date() > passwordReset.expiresAt) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe et marquer le token comme utilisé
      await prisma.$transaction([
        prisma.member.update({
          where: { id: passwordReset.memberId },
          data: { internalPassword: hashedPassword }
        }),
        prisma.passwordReset.update({
          where: { token },
          data: { usedAt: new Date() }
        })
      ]);

      res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Générer un mot de passe temporaire pour nouveau membre
  async generateTemporaryPassword(req, res) {
    try {
      const { memberId } = req.params;
      
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Membre introuvable' });
      }

      // Générer un mot de passe temporaire
      const tempPassword = `RBE${member.memberNumber.slice(-3)}${Math.random().toString(36).slice(-4).toUpperCase()}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Mettre à jour le membre avec accès intranet et mot de passe
      await prisma.member.update({
        where: { id: memberId },
        data: {
          hasInternalAccess: true,
          internalPassword: hashedPassword
        }
      });

      // Envoyer l'email de bienvenue avec les identifiants
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@retrobus-essonne.fr',
        to: member.email,
        subject: '🎉 Bienvenue sur MyRBE - Vos identifiants d\'accès',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #be003c, #e40045); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🚌 Bienvenue sur MyRBE !</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">Votre espace adhérent RétroBus Essonne</p>
            </div>
            
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${member.firstName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Votre adhésion a été validée ! Vous avez maintenant accès à votre espace personnel MyRBE 
                où vous pourrez consulter vos informations, gérer vos inscriptions aux événements et bien plus encore.
              </p>
              
              <div style="background: white; border: 2px solid #be003c; padding: 25px; border-radius: 10px; margin: 30px 0;">
                <h3 style="color: #be003c; margin-top: 0;">🔑 Vos identifiants de connexion :</h3>
                <p style="margin: 15px 0;"><strong>Email :</strong> ${member.email}</p>
                <p style="margin: 15px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #f8f9fa; padding: 5px 10px; border-radius: 3px; font-family: monospace; font-size: 16px; color: #e83e8c;">${tempPassword}</code></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/login" 
                   style="background: #be003c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  🚀 Accéder à MyRBE
                </a>
              </div>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 25px 0;">
                <p style="margin: 0; color: #0c5460; font-size: 14px;">
                  <strong>🛡️ Sécurité :</strong> Nous vous recommandons de changer ce mot de passe 
                  lors de votre première connexion pour garantir la sécurité de votre compte.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à nous contacter.
                <br><br>
                Bienvenue dans la famille RétroBus Essonne ! 🎉
              </p>
            </div>
            
            <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2025 RétroBus Essonne - Association loi 1901</p>
              <p style="margin: 5px 0 0;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        `
      });

      res.json({ 
        message: 'Accès créé et email envoyé',
        temporaryPassword: tempPassword,
        sentTo: member.email
      });
    } catch (error) {
      console.error('Erreur création accès temporaire:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};