/**
 * Email transport — SMTP via nodemailer. Universal, portable, and works
 * identically for:
 *   - Mailpit dev catcher (http://localhost:8025)
 *   - Resend (smtp.resend.com:587, user "resend", pass = API key)
 *   - AWS SES, Postmark, Mailgun, Sendgrid, etc.
 *
 * If `SMTP_HOST` is unset, emails fall through to console-log so dev keeps
 * working with no infra. Caller code MUST go through this module — never
 * import nodemailer directly elsewhere (project_portability.md).
 */
import nodemailer, { type Transporter } from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "TES Treats <noreply@tes-treats.local>";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (cachedTransport) return cachedTransport;

  const port = Number(process.env.SMTP_PORT ?? 587);
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS ?? "",
        }
      : undefined,
  });
  return cachedTransport;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = msg.from ?? DEFAULT_FROM;
  const transport = getTransport();

  if (!transport) {
    console.log(
      `\n[email] (no SMTP configured — logging only)\n  To:      ${msg.to}\n  From:    ${from}\n  Subject: ${msg.subject}\n  ${msg.text ?? msg.html.replace(/<[^>]+>/g, "").slice(0, 240)}\n`,
    );
    return;
  }

  await transport.sendMail({
    from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}
