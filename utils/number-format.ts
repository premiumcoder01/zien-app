/**
 * Formats a raw number or string representation of a number into a beautiful,
 * standard US format with compact suffixes (K for thousands, M for millions, B for billions)
 * and optional currency symbol ($).
 *
 * Examples:
 * - "$265493k" -> "$265.5M"
 * - "265493k" -> "265.5M" (if isCurrency is false) or "$265.5M" (if isCurrency is true)
 * - "265493" -> "$265.5K" (if isCurrency is true)
 * - "45600" -> "45.6K" (if isCurrency is false)
 * - "Safe" -> "Safe"
 * - "+12%" -> "+12%"
 */
export function formatStatValue(
  val: string | number | undefined | null,
  isCurrency: boolean = false
): string {
  if (val === undefined || val === null) return '0';

  const originalStr = String(val).trim();
  if (!originalStr) return '0';

  // 1. Determine if it is a currency value (either passed explicitly, or contains $)
  const hasDollar = originalStr.includes('$');
  const currency = isCurrency || hasDollar;

  // 2. Parse numeric value and multiplier suffix
  // Strip dollar sign and commas to get clean raw string
  let cleanStr = originalStr.replace(/[$,]/g, '').toLowerCase();

  // Detect standard multiplier suffixes: k, m, b
  let multiplier = 1;
  let numericStr = cleanStr;

  if (cleanStr.endsWith('k')) {
    multiplier = 1e3;
    numericStr = cleanStr.slice(0, -1);
  } else if (cleanStr.endsWith('m')) {
    multiplier = 1e6;
    numericStr = cleanStr.slice(0, -1);
  } else if (cleanStr.endsWith('b')) {
    multiplier = 1e9;
    numericStr = cleanStr.slice(0, -1);
  }

  const numValue = parseFloat(numericStr);

  // Safety fallback if it's not a parsable number (e.g. "Safe", "None", "+12%")
  if (isNaN(numValue)) {
    return originalStr;
  }

  const totalVal = numValue * multiplier;

  // 3. Format totalVal based on standard compact US format
  let formattedNumber = '';
  if (totalVal >= 1e9) {
    const bill = totalVal / 1e9;
    formattedNumber = bill.toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (totalVal >= 1e6) {
    const mill = totalVal / 1e6;
    formattedNumber = mill.toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (totalVal >= 1e3) {
    const thou = totalVal / 1e3;
    formattedNumber = thou.toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    // For values less than 1,000, keep up to 2 decimals if present, otherwise no decimals
    formattedNumber = Number(totalVal.toFixed(2)).toString();
  }

  return currency ? `$${formattedNumber}` : formattedNumber;
}
