const LKR_FORMATTER = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 });

export function formatLKR(amount) {
  const value = Number(amount) || 0;
  return `Rs. ${LKR_FORMATTER.format(value)}`;
}
