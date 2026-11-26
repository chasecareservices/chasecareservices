/**
 * Ghana Post GPS digital address, e.g. GA-183-8164. Spaces, dashes and lower case are
 * forgiven. Returns null when empty and undefined when it can't be a digital address.
 */
export function cleanDigitalAddress(raw: string | null | undefined): string | null | undefined {
  const v = (raw ?? "").toUpperCase().replace(/[\s-]/g, "");
  if (!v) return null;
  const m = v.match(/^([A-Z]{2})(\d{3,4})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}
