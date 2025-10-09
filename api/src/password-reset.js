import { PrismaClient } from '@prisma/client';
          emailSent = true;
        } catch (mailErr) {
          console.warn('Envoi email reset échoué ou SMTP absent:', mailErr?.message || mailErr);
        }
      }
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configuration email (Ã  adapter selon votre service)
const transporter = nodemailer.createTransport({
  // Configuration Ã  personnaliser
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// DÃ©tection simple de configuration SMTP
const isEmailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};

export const passwordResetAPI = {
  // Demander une rÃ©initialisation de mot de passe
  async requestReset(req, res) {
    try {
      const { memberId } = req.params;
      const requestedBy = req.user?.id || 'admin';
      
      // VÃ©rifier que le membre existe et a accÃ¨s Ã  l'intranet
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Membre introuvable' });
      }

      if (!member.hasInternalAccess) {
        return res.status(400).json({ error: 'Ce membre n\'a pas accÃ¨s Ã  l\'intranet' });
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

      // GÃ©nÃ©rer un nouveau token
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

      // Envoyer l'email de rÃ©initialisation
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      let emailSent = false;
      if (isEmailConfigured()) {
        try {
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@retrobus-essonne.fr',
        to: member.email,
        subject: 'ðŸ” RÃ©initialisation de votre mot de passe MyRBE',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #be003c, #e40045); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">ðŸšŒ RÃ©troBus Essonne</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">Votre plateforme MyRBE</p>
            </div>
            
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${member.firstName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Une demande de rÃ©initialisation de mot de passe a Ã©tÃ© effectuÃ©e pour votre compte MyRBE.
                Cliquez sur le bouton ci-dessous pour crÃ©er un nouveau mot de passe.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #be003c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  ðŸ” RÃ©initialiser mon mot de passe
                </a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 25px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>âš ï¸ Important :</strong> Ce lien est valable pendant 24 heures seulement.
                  Si vous n'avez pas demandÃ© cette rÃ©initialisation, ignorez cet email.
                </p>
              </div>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #be003c; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            
            <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">Â© 2025 RÃ©troBus Essonne - Association loi 1901</p>
              <p style="margin: 5px 0 0;">Cet email a Ã©tÃ© envoyÃ© automatiquement, merci de ne pas y rÃ©pondre.</p>
            </div>
          </div>
        `
      });
          emailSent = true;
        } catch (mailErr) {
          console.warn('Envoi email reset échoué ou SMTP absent:', mailErr?.message || mailErr);
        }
      }

      res.json({ 
        message: 'Demande de rǸinitialisation traitǸe',
        sentTo: member.email,
        emailSent
      });
  },

  // Valider un token de rÃ©initialisation
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
        return res.status(400).json({ error: 'Token dÃ©jÃ  utilisÃ©' });
      }

      if (new Date() > passwordReset.expiresAt) {
        return res.status(400).json({ error: 'Token expirÃ©' });
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

  // RÃ©initialiser le mot de passe
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractÃ¨res' });
      }

      const passwordReset = await prisma.passwordReset.findUnique({
        where: { token },
        include: { member: true }
      });
      
      if (!passwordReset || passwordReset.usedAt || new Date() > passwordReset.expiresAt) {
        return res.status(400).json({ error: 'Token invalide ou expirÃ©' });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Mettre Ã  jour le mot de passe et marquer le token comme utilisÃ©
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

      res.json({ message: 'Mot de passe mis Ã  jour avec succÃ¨s' });
    } catch (error) {
      console.error('Erreur rÃ©initialisation mot de passe:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // GÃ©nÃ©rer un mot de passe temporaire pour nouveau membre
  async generateTemporaryPassword(req, res) {
    try {
      const { memberId } = req.params;
      
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });
      
      if (!member) {
        return res.status(404).json({ error: 'Membre introuvable' });
      }

      // GÃ©nÃ©rer un mot de passe temporaire
      const tempPassword = `RBE${member.memberNumber.slice(-3)}${Math.random().toString(36).slice(-4).toUpperCase()}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Mettre Ã  jour le membre avec accÃ¨s intranet et mot de passe
      await prisma.member.update({
        where: { id: memberId },
        data: {
          hasInternalAccess: true,
          internalPassword: hashedPassword
        }
      });

      // Envoyer l'email de bienvenue avec les identifiants
      let emailSent = false;
      if (isEmailConfigured()) {
        try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@retrobus-essonne.fr',
        to: member.email,
        subject: 'ðŸŽ‰ Bienvenue sur MyRBE - Vos identifiants d\'accÃ¨s',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #be003c, #e40045); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">ðŸšŒ Bienvenue sur MyRBE !</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">Votre espace adhÃ©rent RÃ©troBus Essonne</p>
            </div>
            
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${member.firstName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Votre adhÃ©sion a Ã©tÃ© validÃ©e ! Vous avez maintenant accÃ¨s Ã  votre espace personnel MyRBE 
                oÃ¹ vous pourrez consulter vos informations, gÃ©rer vos inscriptions aux Ã©vÃ©nements et bien plus encore.
              </p>
              
              <div style="background: white; border: 2px solid #be003c; padding: 25px; border-radius: 10px; margin: 30px 0;">
                <h3 style="color: #be003c; margin-top: 0;">ðŸ”‘ Vos identifiants de connexion :</h3>
                <p style="margin: 15px 0;"><strong>Email :</strong> ${member.email}</p>
                <p style="margin: 15px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #f8f9fa; padding: 5px 10px; border-radius: 3px; font-family: monospace; font-size: 16px; color: #e83e8c;">${tempPassword}</code></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/login" 
                   style="background: #be003c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  ðŸš€ AccÃ©der Ã  MyRBE
                </a>
              </div>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 25px 0;">
                <p style="margin: 0; color: #0c5460; font-size: 14px;">
                  <strong>ðŸ›¡ï¸ SÃ©curitÃ© :</strong> Nous vous recommandons de changer ce mot de passe 
                  lors de votre premiÃ¨re connexion pour garantir la sÃ©curitÃ© de votre compte.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                Si vous avez des questions ou rencontrez des difficultÃ©s, n'hÃ©sitez pas Ã  nous contacter.
                <br><br>
                Bienvenue dans la famille RÃ©troBus Essonne ! ðŸŽ‰
              </p>
            </div>
            
            <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">Â© 2025 RÃ©troBus Essonne - Association loi 1901</p>
              <p style="margin: 5px 0 0;">Cet email a Ã©tÃ© envoyÃ© automatiquement, merci de ne pas y rÃ©pondre.</p>
            </div>
          </div>
        `
      });
          emailSent = true;
        } catch (mailErr) {
          console.warn('Envoi email acc�s �chou� ou SMTP absent:', mailErr?.message || mailErr);
        }
      }

      res.json({ 
        message: 'Acces cree' ,
        temporaryPassword: tempPassword,
        sentTo: member.email,
        emailSent
      });
    } catch (error) {
      console.error('Erreur crÃ©ation accÃ¨s temporaire:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};
