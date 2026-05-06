/**
 * Email transport. Two backends, picked by env:
 *
 *   1. Resend HTTPS API — used when RESEND_API_KEY (or any re_-prefixed key
 *      in SMTP_PASS) is present. Avoids SMTP entirely; works on hosts that
 *      block outbound 25/465/587 (Railway, Fly, App Platform, etc.).
 *   2. SMTP via nodemailer — used otherwise. Same code path works with:
 *        - Mailpit dev catcher (http://localhost:8025)
 *        - Self-hosted SMTP, Postmark, SES, Mailgun, Sendgrid, etc.
 *
 * Without either, falls through to console.log so dev keeps working with
 * zero infra. Caller code MUST go through this module — never import
 * nodemailer or call api.resend.com directly elsewhere.
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

function getResendKey(): string | null {
  const candidate =
    process.env.RESEND_API_KEY ??
    process.env.AUTH_RESEND_KEY ??
    process.env.SMTP_PASS;
  if (!candidate) return null;
  // Heuristic: only treat as Resend HTTP if the key looks like a Resend key
  // or SMTP_HOST is explicitly Resend's. Otherwise SMTP_PASS belongs to a
  // different SMTP provider and we'd corrupt the auth header.
  if (candidate.startsWith("re_")) return candidate;
  if (process.env.SMTP_HOST === "smtp.resend.com") return candidate;
  return null;
}

async function sendViaResend(
  msg: EmailMessage,
  from: string,
  apiKey: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = msg.from ?? DEFAULT_FROM;

  const resendKey = getResendKey();
  if (resendKey) {
    await sendViaResend(msg, from, resendKey);
    return;
  }

  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return;
  }

  console.log(
    `\n[email] (no transport configured — logging only)\n  To:      ${msg.to}\n  From:    ${from}\n  Subject: ${msg.subject}\n  ${msg.text ?? msg.html.replace(/<[^>]+>/g, "").slice(0, 240)}\n`,
  );
}
