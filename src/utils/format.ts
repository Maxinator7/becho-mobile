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
