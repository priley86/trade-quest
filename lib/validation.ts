export function requiredText(value: unknown, label: string, max = 80): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`${label} is required (up to ${max} characters).`);
  }
  return value.trim();
}

export function contactIdentity(value: unknown): { email: string } | { phone: string } {
  const contact = requiredText(value, "Email or phone", 254);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return { email: contact.toLowerCase() };
  const phone = contact.replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return { phone };
  // Make the common North American 10-digit format convenient locally while
  // still sending Supabase the E.164 value it expects.
  if (/^\d{10}$/.test(phone)) return { phone: `+1${phone}` };
  throw new Error("Enter a valid email address or a 10-digit phone number.");
}

export function passwordValue(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) {
    throw new Error("Choose a password between 8 and 128 characters.");
  }
  return value;
}

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Invalid identifier.");
  }
  return value;
}

export function logoUrl(value: unknown): string | null {
  if (!value) return null;
  const raw = requiredText(value, "Logo URL", 2048);
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use an HTTPS logo URL.");
  return url.href;
}

export function positiveInteger(value: unknown, max: number): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`Enter a whole number from 1 to ${max}.`);
  return n;
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function returnPercent(value: number, cost: number): string {
  if (cost <= 0) return "—";
  const percentage = ((value - cost) / cost) * 100;
  return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
}
