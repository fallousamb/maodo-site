// Server-side helper for triggering transactional emails.
// Once Lovable Emails infrastructure is configured (email domain + scaffold),
// this calls the transactional email server route. Until then it no-ops with a log.

interface SendTransactionalEmailParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, any>;
}

export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  const baseUrl =
    process.env.APP_URL ||
    process.env.SITE_URL ||
    "";

  if (!baseUrl) {
    console.warn(
      "[sendTransactionalEmail] no APP_URL configured — email not sent",
      params.templateName,
      params.recipientEmail,
    );
    return { skipped: true };
  }

  try {
    const res = await fetch(`${baseUrl}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.warn(
        "[sendTransactionalEmail] send failed",
        res.status,
        await res.text(),
      );
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[sendTransactionalEmail] error", e);
    return { ok: false };
  }
}
