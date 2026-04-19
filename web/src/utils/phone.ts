export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Ensure only one plus sign at the beginning
  if (cleaned.includes("+")) {
    const hasLeadingPlus = cleaned.startsWith("+");
    cleaned = cleaned.replace(/\+/g, "");
    if (hasLeadingPlus) {
      cleaned = "+" + cleaned;
    }
  }

  if (!cleaned) return undefined;

  // If it doesn't start with +, assume US (+1) if 10 digits
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
    // Fallback: just return the digits
    return cleaned;
  }
  
  return cleaned;
}
