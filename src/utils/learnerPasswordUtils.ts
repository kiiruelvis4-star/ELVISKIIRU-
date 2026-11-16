/**
 * Learner Password & Access PIN Management Utility
 * Standard: Exactly 6 characters alphanumeric (uppercase)
 * Example: LR4829, AM7102, KEV811
 */

const CHAR_SET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous 0, O, 1, I for clarity

/**
 * Generates a clean, distinct 6-character password for a learner.
 * e.g. "LR4892", "AM9102"
 */
export function generate6CharPassword(learnerName?: string, adm?: string): string {
  // Use first 2 letters of name or 'LR'
  let prefix = 'LR';
  if (learnerName) {
    const letters = learnerName.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (letters.length >= 2) {
      prefix = letters.slice(0, 2);
    }
  }

  // Generate 4 randomized alphanumeric characters
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const randIdx = Math.floor(Math.random() * CHAR_SET.length);
    suffix += CHAR_SET[randIdx];
  }

  return `${prefix}${suffix}`.toUpperCase().slice(0, 6);
}

/**
 * Validates if a password conforms to the 6-character requirement
 */
export function isValid6CharPassword(pass?: string): boolean {
  if (!pass) return false;
  const clean = pass.trim();
  return clean.length === 6;
}

/**
 * Normalizes password to clean 6 characters
 */
export function normalize6CharPassword(pass: string): string {
  return pass.trim().toUpperCase().slice(0, 6);
}
