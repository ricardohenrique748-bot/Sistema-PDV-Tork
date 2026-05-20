const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function enviarEmailResetSenha(email, nome, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://sistema-pdv-tork.vercel.app';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Sistema Tork" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Redefinição de senha - Sistema Tork',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Sistema Tork</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background: #f59e0b;
          color: #000;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 16px 0;
        ">Redefinir Senha</a>
        <p style="color: #999; font-size: 12px;">Se você não solicitou a redefinição, ignore este e-mail. Sua senha continuará a mesma.</p>
        <p style="color: #999; font-size: 12px;">Link: ${resetUrl}</p>
      </div>
    `,
  });
}

module.exports = { enviarEmailResetSenha };
