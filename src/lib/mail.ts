import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type Mail = { to: string; subject: string; text: string; html: string };

/**
 * E-mails go out through any SMTP server (Brevo, Gmail, Zoho, the host's own…),
 * configured with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.
 */
export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

let transporter: Transporter | undefined;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

/** Sends the e-mail; without SMTP settings in development, prints it to the server console instead. */
export async function sendMail(mail: Mail): Promise<"sent" | "logged"> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP non configuré");
    console.info(`\n📧 E-mail (non envoyé : SMTP non configuré)\nÀ : ${mail.to}\nObjet : ${mail.subject}\n\n${mail.text}\n`);
    return "logged";
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return "sent";
}
