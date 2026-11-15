/**
 * Formats an amount as Indian Rupees with Indian digit grouping (₹5,25,000).
 * Implemented by hand so it doesn't depend on Intl support in the JS engine.
 */
export function formatPrice(amount: number): string {
  const rounded = Math.round(amount);
  const negative = rounded < 0;
  const digits = String(Math.abs(rounded));
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}₹${rest ? `${rest},${lastThree}` : lastThree}`;
}

/** Short rupee amount for stat tiles: ₹950, ₹42.5K, ₹3.4L, ₹1.2Cr. */
export function formatCompactPrice(amount: number): string {
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  if (amount >= 1_00_00_000) return `₹${trim(amount / 1_00_00_000)}Cr`;
  if (amount >= 1_00_000) return `₹${trim(amount / 1_00_000)}L`;
  if (amount >= 1_000) return `₹${trim(amount / 1_000)}K`;
  return formatPrice(amount);
}

/** "just now", "5m ago", "3h ago", "2d ago", then a short date. */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Formats an Indian mobile number for display: +91 98765 43210. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
}
