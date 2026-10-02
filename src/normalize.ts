/** Lowercase, trim, collapse whitespace and strip accents, so "  DOÑA   ana " → "dona ana". */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Zero-pad a FIPS code to 5 digits. Returns undefined for anything that isn't a 1-5 digit code. */
export function normalizeFips(input: unknown): string | undefined {
  let digits: string;
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0) return undefined;
    digits = String(input);
  } else if (typeof input === "string") {
    digits = input.trim();
  } else {
    return undefined;
  }
  return /^\d{1,5}$/.test(digits) ? digits.padStart(5, "0") : undefined;
}
