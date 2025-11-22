import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';

// Validar que las variables de entorno estén definidas
const getEmailConfig = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  if (!user || !pass) {
    throw new Error('EMAIL_USER o EMAIL_PASS no están definidos en las variables de entorno');
  }
  
  return { user, pass };
};

// Configuración del transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: getEmailConfig()
});

export const enviarEmailRecuperacion = async (email: string, token: string): Promise<boolean> => {
  console.log('📧 Simulando envío de email a:', email);
  console.log('📧 Token:', token);
  const enlace = `http://localhost:5173/restablecer-contrasenia?token=${token}`; // url front under tango
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Restablecer tu contraseña - Programación III',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Restablecer Contraseña</h2>
    <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
    
    <p><strong>Tu token de verificación:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 16px; word-wrap: break-word; white-space: pre-wrap;">
    ${token}
</div>
    
    <p style="margin-top: 20px;">O haz clic en el siguiente enlace:</p>
    <a href="${enlace}" 
       style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
       Restablecer Contraseña
    </a>
    
    <p><strong>Este token expirará en 1 hora.</strong></p>
    <p>Si no solicitaste este restablecimiento, ignora este email.</p>
    <hr>
    <p style="color: #666; font-size: 12px;">Equipo de Programación III</p>
</div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email de recuperación enviado a:', email);
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};