/**
 * BigInt-safe USDC formatting utilities.
 * USDC has 6 decimals. Never use Number() or parseFloat() on raw financial values.
 */

export function formatUsdc(raw: string): string {
  const bigVal = BigInt(raw);
  const isNeg = bigVal < 0n;
  const abs = isNeg ? -bigVal : bigVal;
  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').slice(0, 2);
  const formatted =
    new Intl.NumberFormat('en-US').format(Number(whole)) + '.' + fracStr;
  return (isNeg ? '-' : '') + formatted + ' USDC';
}

export function formatUsdcCompact(raw: string): string {
  const bigVal = BigInt(raw);
  const isNeg = bigVal < 0n;
  const abs = isNeg ? -bigVal : bigVal;
  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').slice(0, 2);
  const formatted =
    new Intl.NumberFormat('en-US').format(Number(whole)) + '.' + fracStr;
  return (isNeg ? '-$' : '$') + formatted;
}

export function navToChartValue(raw: string): number {
  const whole = BigInt(raw) / 1_000_000n;
  return Number(whole);
}

export function deltaSign(delta: string): 'positive' | 'negative' | 'zero' {
  const val = BigInt(delta);
  if (val > 0n) return 'positive';
  if (val < 0n) return 'negative';
  return 'zero';
}
