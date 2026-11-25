export type CertificationType = "internal" | "cpd" | "externally_accredited";

/**
 * Wording for course certificates. "Accredited" is only ever shown for courses the
 * database allows to be marked externally accredited (body + reference recorded) [§14].
 */
export function certificationLabel(type: CertificationType): string {
  switch (type) {
    case "externally_accredited":
      return "Externally accredited";
    case "cpd":
      return "CPD course";
    default:
      return "Chase certificate";
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Digits only, for tel: and wa.me links. */
export function phoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function whatsappLink(number: string, message?: string): string {
  const digits = phoneDigits(number).replace(/^\+/, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** Split CMS plain text into paragraphs on blank lines. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
