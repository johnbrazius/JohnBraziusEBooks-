import "server-only";
import { env } from "./env";

/**
 * Transactional email via Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Optional: when RESEND_API_KEY / EMAIL_FROM are not set, emails are skipped and customers rely on the
 * order page link shown immediately after payment.
 */
export function emailConfigured() {
  return Boolean(env.resendApiKey() && env.emailFrom());
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (!emailConfigured()) return "SKIPPED";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: [to], subject, html, text }),
    });
    if (!res.ok) {
      console.error("[email] send failed with status", res.status);
      return "FAILED";
    }
    return "SENT";
  } catch (err) {
    console.error("[email] send error", (err as Error).message);
    return "FAILED";
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
