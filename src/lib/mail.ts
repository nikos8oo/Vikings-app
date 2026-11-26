import "server-only";

/**
 * Envoi d'email via l'API Resend (https://resend.com) — RESEND_API_KEY + MAIL_FROM.
 * Sans clé en développement : le lien est affiché à l'écran et dans la console.
 */
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendLoginMail(to: string, link: string, code: string, firstName?: string | null) {
  const hello = firstName ? `Salut ${escapeHtml(firstName)},` : "Salut,";
  const html = `<!doctype html><html><body style="margin:0;background:#050505;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#111114;border:1px solid #232328;border-radius:20px;padding:32px">
<tr><td style="color:#d1ec2d;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Vikings Athletes</td></tr>
<tr><td style="padding-top:18px;color:#e4e1e6;font-size:22px;font-weight:800">${hello}</td></tr>
<tr><td style="padding-top:10px;color:#a3a1a8;font-size:15px;line-height:1.5">Voici ton lien de connexion. Il est valable 15 minutes.</td></tr>
<tr><td style="padding-top:26px"><a href="${link}" style="display:block;text-align:center;background:#d1ec2d;color:#050505;text-decoration:none;font-weight:800;font-size:16px;padding:16px;border-radius:14px">Me connecter</a></td></tr>
<tr><td style="padding-top:26px;color:#a3a1a8;font-size:13px">Ou saisis ce code dans l'app :</td></tr>
<tr><td style="padding-top:8px;color:#e4e1e6;font-size:34px;font-weight:800;letter-spacing:10px;font-family:ui-monospace,Menlo,monospace">${code}</td></tr>
<tr><td style="padding-top:26px;color:#6b6a72;font-size:12px;line-height:1.5">Tu n'as rien demandé ? Ignore simplement cet email.</td></tr>
</table></td></tr></table></body></html>`;

  if (!mailConfigured()) {
    console.info(`[mail:dev] ${to} → ${link} (code ${code})`);
    return { ok: true as const, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Vikings Athletes <onboarding@resend.dev>",
      to: [to],
      subject: `${code} — ton lien de connexion Vikings`,
      html,
      text: `${hello.replace(/<[^>]+>/g, "")}\n\nConnecte-toi : ${link}\nOu saisis le code : ${code}\n\nValable 15 minutes.`,
    }),
  });
  if (!res.ok) {
    console.error("[mail] échec Resend", res.status, await res.text().catch(() => ""));
    return { ok: false as const };
  }
  return { ok: true as const, dev: false };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
