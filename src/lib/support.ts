/**
 * The WhatsApp number to write to when the password is forgotten, from SUPPORT_WHATSAPP
 * (with the country code, e.g. "+228 90 12 34 56"). Null when unset or not a phone number.
 */
export function supportWhatsApp(value = process.env.SUPPORT_WHATSAPP): { display: string; digits: string } | null {
  const display = value?.trim();
  if (!display) return null;
  const digits = display.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return { display, digits };
}

/** Opens a WhatsApp conversation with the message already typed. */
export function whatsAppLink(digits: string, message: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
