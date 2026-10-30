import { describe, expect, it } from "vitest";
import { supportWhatsApp, whatsAppLink } from "@/lib/support";

describe("WhatsApp contact", () => {
  it("accepts the number written the usual ways, with the country code", () => {
    expect(supportWhatsApp("+228 90 12 34 56")).toEqual({ display: "+228 90 12 34 56", digits: "22890123456" });
    expect(supportWhatsApp("00228-90-12-34-56")?.digits).toBe("22890123456");
    expect(supportWhatsApp(" +33 6 12 34 56 78 ")?.display).toBe("+33 6 12 34 56 78");
  });

  it("ignores an empty or clearly wrong value", () => {
    expect(supportWhatsApp(undefined)).toBeNull();
    expect(supportWhatsApp("   ")).toBeNull();
    expect(supportWhatsApp("123")).toBeNull();
    expect(supportWhatsApp("appelez-moi")).toBeNull();
  });

  it("opens a conversation with the message typed in", () => {
    expect(whatsAppLink("22890123456", "Bonjour, j'ai oublié mon mot de passe")).toBe(
      "https://wa.me/22890123456?text=Bonjour%2C%20j'ai%20oubli%C3%A9%20mon%20mot%20de%20passe",
    );
  });
});
