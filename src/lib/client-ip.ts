import "server-only";
import { headers } from "next/headers";

/** The visitor's IP as reported by the hosting platform's proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ?? // Netlify
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "inconnue"
  );
}
