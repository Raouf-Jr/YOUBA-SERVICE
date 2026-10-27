/** What the device stores while offline, and sends to the server once it can. */

export type CheckoutPayload = {
  checkoutId: string;
  shopId: string;
  date: string;
  paymentMethod: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
};

export type ExpensePayload = {
  clientRef: string;
  shopId: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
};

export type SyncResult =
  | { ok: true; added: boolean }
  /** auth: signed out · shop: entry belongs to another account · invalid: refused for good */
  | { ok: false; reason: "auth" | "shop" | "invalid"; message: string };
