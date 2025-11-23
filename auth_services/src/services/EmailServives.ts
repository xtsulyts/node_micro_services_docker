import nodemailer from 'nodemailer';
//import { SentMessageInfo } from 'nodemailer';

const validateEmailConfig = (): { user: string; pass: string} => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error("email o user no estan definidos.");
  }
  return { user, pass};
}

const createTransporter = () => {
  const config = validateEmailConfig();

  return nodemailer.createTransport({
        service: "gmail",
    auth: {
      user: config.user,
      pass: config.pass,
    },
    secure: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

};

const transporter = createTransporter();

transporter.verify((error) => {
  if(error) {
    console.error("error configurando el transporter de email", error);
  } else {
    console.log("trasporter email configurado correctamente.");
  }
}
);

interface EmailOptions {
  email: string;
  token: string;
  frontendUrl?: string;
}

export const enviarEmailRecuperacion = async (options: EmailOptions): Promise<boolean> => {
  const { email, token, frontendUrl = "http://localhost:5173" } = options;

  console.log("inicion de sesion de:", email)

  const enlace = `${frontendUrl}/restablecer-contrasenia?token=>${encodeURIComponent(token)}`
 
  const mailOptions = {
    // from: process.env.EMAIL_USER,
    // to: email,
    // subject: 'Restablecer tu contraseña - Programación III',

    from: {
      name: "Under Tango",
      address: process.env.EMAIL_USER!
    },
    to: email,
    subjet: "Restablecer tu contraseña- Under Tango App",
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