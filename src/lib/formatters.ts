/**
 * Auto-format a US phone number as the user types: (XXX) XXX-XXXX
 * Strips all non-digit characters, then applies formatting.
 */
export const formatPhoneNumber = (value: string): string => {
  // Strip everything except digits
  const digits = value.replace(/\D/g, "");

  // Limit to 10 digits (US) — allow leading 1 to be stripped
  const trimmed = digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits;
  const d = trimmed.slice(0, 10);

  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

/**
 * Strip spaces and common keyboard artifacts from a URL input in real-time.
 * This prevents accidental spaces injected by mobile keyboards.
 */
export const sanitizeUrlInput = (value: string): string => {
  // Remove all whitespace characters (spaces, tabs, newlines)
  return value.replace(/\s/g, "");
};
