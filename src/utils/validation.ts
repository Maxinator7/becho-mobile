/** Same rules as the API, so users see problems before submitting. */

export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let local = digits;
  if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USER_CODE = /^BCH-[0-9A-Z]{6}$/i;

export const validate = {
  name(v: string) {
    const t = v.trim();
    if (!t) return 'Enter your name';
    if (t.length < 2) return 'Name must be at least 2 characters';
    if (t.length > 60) return 'Name must be at most 60 characters';
    if (!/^[\p{L}\p{M} .'-]+$/u.test(t)) return "Use letters, spaces, dots, apostrophes or hyphens only";
    return null;
  },
  mobile(v: string) {
    if (!v.trim()) return 'Enter your mobile number';
    return normalizeIndianMobile(v) ? null : 'Enter a valid 10-digit Indian mobile number';
  },
  email(v: string) {
    if (!v.trim()) return 'Enter your email';
    return EMAIL.test(v.trim()) ? null : 'Enter a valid email address';
  },
  password(v: string) {
    if (!v) return 'Enter a password';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (v.length > 128) return 'Password must be at most 128 characters';
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use at least one letter and one number';
    return null;
  },
  identifier(v: string) {
    const t = v.trim();
    if (!t) return 'Enter your email, mobile number or user code';
    if (t.includes('@')) return EMAIL.test(t) ? null : 'Enter a valid email address';
    if (USER_CODE.test(t) || normalizeIndianMobile(t)) return null;
    return 'Enter a valid email or 10-digit mobile number';
  },
  otp(v: string) {
    return /^\d{6}$/.test(v.trim()) ? null : 'Enter the 6-digit code';
  },
};

export const passwordRules = (v: string) => [
  { label: 'At least 8 characters', ok: v.length >= 8 },
  { label: 'At least one letter', ok: /[A-Za-z]/.test(v) },
  { label: 'At least one number', ok: /\d/.test(v) },
];

/** Turns API validation details into { field: message }. */
export function fieldErrors(details?: { path: string; message: string }[]) {
  const out: Record<string, string> = {};
  for (const d of details ?? []) if (d.path && !out[d.path]) out[d.path] = d.message;
  return out;
}
