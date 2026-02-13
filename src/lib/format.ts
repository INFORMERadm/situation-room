const FOREX_SYMBOLS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CHFJPY', 'EURCHF', 'EURAUD',
  'GBPCHF', 'GBPAUD', 'AUDCHF', 'NZDJPY', 'AUDNZD', 'CADJPY', 'USDMXN',
  'USDZAR', 'USDTRY', 'USDSEK', 'USDNOK', 'USDDKK', 'USDSGD', 'USDHKD',
]);

export function isForexSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase().replace('/', '');
  return FOREX_SYMBOLS.has(s);
}

export function formatPrice(price: number, symbol?: string): string {
  if (symbol && isForexSymbol(symbol)) {
    return price.toFixed(4);
  }
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return price.toFixed(2);
}

export function formatPriceWithCurrency(price: number, symbol?: string): string {
  if (symbol && isForexSymbol(symbol)) {
    return price.toFixed(4);
  }
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(2)}`;
}
