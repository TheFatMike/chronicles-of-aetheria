/**
 * Formats a numeric currency value into a human-readable string with abbreviations (k, m, etc.)
 * @param amount The amount of gold/currency
 * @param decimals Number of decimal places for abbreviated values
 * @returns Formatted string
 */
export const formatGold = (amount: number, decimals: number = 1): string => {
  if (amount === undefined || amount === null) return "0";
  
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(decimals).replace(/\.0$/, '') + "M";
  }
  
  if (amount >= 1000) {
    return (amount / 1000).toFixed(decimals).replace(/\.0$/, '') + "K";
  }
  
  return amount.toString();
};

/**
 * Detailed gold formatting with commas for tooltips or full displays
 */
export const formatGoldDetailed = (amount: number): string => {
  if (amount === undefined || amount === null) return "0";
  return amount.toLocaleString();
};
