/** A day's figures as typed on the device, sent to the server right away or once it can be reached. */
export type DayPayload = {
  date: string;
  lines: { productId: string; revenue: number; expense: number; note: string | null }[];
};

export type SyncResult =
  | { ok: true }
  /** auth: signed out · invalid: refused for good */
  | { ok: false; reason: "auth" | "invalid"; message: string };
