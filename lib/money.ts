/** Integer centavos -> '₱1,234.56'. Fractions of a centavo are rounded first. */
export function php(centavos: number): string {
  const whole = Math.round(centavos);
  const sign = whole < 0 ? '-' : '';
  const abs = Math.abs(whole);
  const pesos = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}₱${pesos}.${cents}`;
}
