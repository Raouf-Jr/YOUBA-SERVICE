import "server-only";
import { headers } from "next/headers";

/**
 * Public address of the site, for links in e-mails.
 * APP_URL wins; Netlify (URL) and Vercel set one automatically; otherwise the request's host.
 */
export async function getAppUrl(): Promise<string> {
  const fixed =
    process.env.APP_URL ||
    process.env.URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (fixed) return fixed.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
