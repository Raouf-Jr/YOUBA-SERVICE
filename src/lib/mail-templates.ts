import type { Mail } from "./mail";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function passwordResetMail({ to, name, url, minutes }: { to: string; name: string; url: string; minutes: number }): Mail {
  const firstName = name.split(" ")[0] || name;
  const text = [
    `Bonjour ${firstName},`,
    "",
    "Vous avez demandé à réinitialiser votre mot de passe YOUBA SERVICE.",
    "Ouvrez ce lien pour choisir un nouveau mot de passe :",
    "",
    url,
    "",
    `Le lien est valable ${minutes} minutes et ne fonctionne qu'une seule fois.`,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.",
    "",
    "— YOUBA SERVICE",
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px 12px;background:#f5f4ef;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#121211">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fdfdfc;border:1px solid #e7e6df;border-radius:16px">
          <tr><td style="padding:28px 28px 8px">
            <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em">
              <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#0f766e;vertical-align:-5px;margin-right:8px"></span>YOUBA <span style="font-weight:500;color:#52514e">SERVICE</span>
            </div>
          </td></tr>
          <tr><td style="padding:16px 28px 0;font-size:15px;line-height:1.55">
            <p style="margin:0 0 12px">Bonjour ${escape(firstName)},</p>
            <p style="margin:0 0 20px">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton pour en choisir un nouveau.</p>
          </td></tr>
          <tr><td style="padding:0 28px">
            <a href="${escape(url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px">Choisir un nouveau mot de passe</a>
          </td></tr>
          <tr><td style="padding:20px 28px 28px;font-size:13px;line-height:1.55;color:#52514e">
            <p style="margin:0 0 10px">Le lien est valable ${minutes} minutes et ne fonctionne qu'une seule fois.</p>
            <p style="margin:0 0 10px">Si le bouton ne marche pas, copiez ce lien dans votre navigateur :<br><a href="${escape(url)}" style="color:#0b6159;word-break:break-all">${escape(url)}</a></p>
            <p style="margin:0">Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to, subject: "Réinitialisation de votre mot de passe YOUBA SERVICE", text, html };
}
