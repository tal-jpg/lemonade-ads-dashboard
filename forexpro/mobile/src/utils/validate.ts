/**
 * Input validation.
 *
 * Every rule here also exists server-side (Cloud Functions + security rules) —
 * client validation is for fast feedback, never for enforcement.
 */

export type ValidationResult = string | null; // null === valid

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export function validateEmail(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

export function validateFullName(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return 'Full name is required';
  if (v.length < 2) return 'Name is too short';
  if (v.length > 80) return 'Name is too long';
  return null;
}

export function validateUsername(value: string): ValidationResult {
  const v = value.trim().toLowerCase();
  if (!v) return 'Username is required';
  if (v.length < 3) return 'At least 3 characters';
  if (v.length > 20) return 'At most 20 characters';
  if (!USERNAME_RE.test(v)) return 'Use lowercase letters, numbers and _ only';
  return null;
}

export function validatePhone(value: string, required = true): ValidationResult {
  const v = value.replace(/[\s()-]/g, '');
  if (!v) return required ? 'Phone number is required' : null;
  if (!PHONE_RE.test(v)) return 'Enter a valid phone number with country code';
  return null;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';
};

export function passwordStrength(value: string): PasswordStrength {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength['label'][] = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  return { score: clamped, label: labels[clamped] };
}

export function validatePassword(value: string): ValidationResult {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Include at least one letter and one number';
  }
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): ValidationResult {
  if (!confirm) return 'Confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export function validateBio(value: string): ValidationResult {
  if (value.length > 200) return 'Bio must be 200 characters or fewer';
  return null;
}

export function validateMessage(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return 'Message cannot be empty';
  if (v.length > 4000) return 'Message is too long';
  return null;
}

/** Returns the first error in a form, or null when everything passes. */
export function firstError(results: ValidationResult[]): ValidationResult {
  return results.find((r) => r !== null) ?? null;
}

export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function normalisePhone(value: string): string {
  return value.replace(/[\s()-]/g, '');
}
