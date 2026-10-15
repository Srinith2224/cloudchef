const nodemailer = require('nodemailer');

const emailEnabled = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    })
  : null;

const TITLES = {
  registration: 'Confirm your email',
  reset: 'Reset your password',
  update: 'Confirm your new password'
};

const sendOtpEmail = async (email, otp, purpose) => {
  const title = TITLES[purpose] || 'Your verification code';

  if (!emailEnabled) {
    // Development fallback: no email account configured, so print the code instead.
    console.log(`\n[dev email] ${title} for ${email}: ${otp}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"CloudChef" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${title} – CloudChef`,
    text: `Your CloudChef code is ${otp}. It expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#1a1411;color:#f6eee8;border-radius:16px">
        <h2 style="margin:0 0 4px;color:#ff7b5c">CloudChef</h2>
        <p style="margin:0 0 24px;color:#bfb2a8">${title}</p>
        <p style="margin:0 0 8px">Your code:</p>
        <div style="font-size:30px;letter-spacing:8px;font-weight:700;background:#2a211c;padding:16px;border-radius:12px;text-align:center">${otp}</div>
        <p style="margin:24px 0 0;color:#bfb2a8;font-size:13px">It expires in 10 minutes. If you didn't ask for this code, you can ignore this email.</p>
      </div>`
  });
};

module.exports = { sendOtpEmail, emailEnabled };
