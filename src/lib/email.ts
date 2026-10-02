import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null | undefined;

/** SMTP transport from env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). null when not configured. */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    transporter = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
  });
  return transporter;
}

export function isEmailConfigured() {
  return getTransporter() !== null;
}

/** Sends each message individually. Never throws; returns how many were delivered. */
export async function sendEmails(messages: EmailMessage[]): Promise<{ sent: number; failed: number }> {
  const t = getTransporter();
  if (!t) {
    if (messages.length) console.warn(`[email] SMTP not configured; skipped ${messages.length} email(s)`);
    return { sent: 0, failed: 0 };
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  const results = await Promise.allSettled(messages.map((m) => t.sendMail({ from, ...m })));
  const failed = results.filter((r) => r.status === "rejected");
  for (const r of failed) console.error("[email] send failed:", (r as PromiseRejectedResult).reason);
  return { sent: results.length - failed.length, failed: failed.length };
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
