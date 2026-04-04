import nodemailer from "nodemailer";

let transporter;

const SMTP_HOST_BY_DOMAIN = {
  "gmail.com": "smtp.gmail.com",
  "googlemail.com": "smtp.gmail.com",
  "outlook.com": "smtp.office365.com",
  "hotmail.com": "smtp.office365.com",
  "live.com": "smtp.office365.com",
  "yahoo.com": "smtp.mail.yahoo.com",
  "icloud.com": "smtp.mail.me.com",
  "zoho.com": "smtp.zoho.com",
  "aol.com": "smtp.aol.com",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveSmtpHost() {
  const explicitHost = String(process.env.SMTP_HOST || "").trim();
  if (explicitHost) {
    return explicitHost;
  }

  const email = normalizeEmail(process.env.SMTP_USER);
  const domain = email.includes("@") ? email.split("@").pop() : "";

  if (domain && SMTP_HOST_BY_DOMAIN[domain]) {
    return SMTP_HOST_BY_DOMAIN[domain];
  }

  // Keep setup minimal for common use cases.
  return "smtp.gmail.com";
}

function resolveFromAddress() {
  const explicitFrom = String(process.env.SMTP_FROM || "").trim();
  if (explicitFrom) {
    return explicitFrom;
  }

  return normalizeEmail(process.env.SMTP_USER);
}

function parseSmtpSecure() {
  const secureValue = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  if (secureValue === "true") return true;
  if (secureValue === "false") return false;
  return Number(process.env.SMTP_PORT || 587) === 465;
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_PORT);
}

function getTransporter() {
  if (!isMailerConfigured()) {
    throw new Error("SMTP is not configured. Please set SMTP_USER, SMTP_PASS, and SMTP_PORT.");
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: resolveSmtpHost(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: parseSmtpSecure(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendDonorOtpEmail({ toEmail, otpCode, expiresInMinutes }) {
  const mailer = getTransporter();
  const fromAddress = resolveFromAddress();

  const subject = "ResQNet OTP Verification";
  const text = `Your ResQNet verification code is ${otpCode}. It expires in ${expiresInMinutes} minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 8px;">ResQNet Verification</h2>
      <p style="margin: 0 0 14px;">Use this OTP to verify your donor registration:</p>
      <p style="margin: 0 0 14px; font-size: 24px; font-weight: 700; letter-spacing: 3px;">${otpCode}</p>
      <p style="margin: 0; color: #4b5563;">This code expires in ${expiresInMinutes} minutes.</p>
    </div>
  `;

  await mailer.sendMail({
    from: fromAddress,
    to: toEmail,
    subject,
    text,
    html,
  });
}