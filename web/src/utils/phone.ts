export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, "");

  if (!cleaned) return undefined;

  // If it's exactly 10 digits, assume it's a US number without the country code
  if (cleaned.length === 10) {
    return `1${cleaned}`;
  }
  
  return cleaned;
}
