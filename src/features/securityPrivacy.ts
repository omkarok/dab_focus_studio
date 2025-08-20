// Placeholder utilities for security and privacy features.
// TODO: add encryption for local data and sanitized exports.

export function encrypt(text: string): string {
  // Simple XOR cipher placeholder; replace with real crypto.
  return text
    .split("")
    .map((c) => String.fromCharCode(c.charCodeAt(0) ^ 42))
    .join("");
}

export function decrypt(text: string): string {
  // XOR again to decrypt.
  return encrypt(text);
}
