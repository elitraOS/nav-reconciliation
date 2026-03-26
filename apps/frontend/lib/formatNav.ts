/**
 * Formats a BigInt financial value (as string) to a human-readable display string.
 *
 * CONSTRAINT: Never uses parseFloat, Number(), or parseInt on financial values.
 * Uses pure BigInt arithmetic for correctness with large values.
 *
 * @param value - The raw value as a string (BigInt serialized)
 * @param decimals - Number of decimal places (e.g., 18 for ETH-like tokens)
 * @returns Human-readable string like "1,234.567890"
 */
export function formatNav(value: string, decimals: number): string {
  if (!value || value === "0") return "0." + "0".repeat(decimals > 6 ? 6 : decimals);

  const bigVal = BigInt(value);
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;

  const divisor = 10n ** BigInt(decimals);
  const integerPart = absVal / divisor;
  const fractionalPart = absVal % divisor;

  // Format integer part with commas
  const intStr = formatWithCommas(integerPart.toString());

  // Format fractional part with leading zeros, show at most 6 decimal places
  const displayDecimals = decimals > 6 ? 6 : decimals;
  const fracStr = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .slice(0, displayDecimals);

  const result = `${intStr}.${fracStr}`;
  return isNegative ? `-${result}` : result;
}

function formatWithCommas(intStr: string): string {
  let result = "";
  const len = intStr.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) {
      result += ",";
    }
    result += intStr[i];
  }
  return result;
}
