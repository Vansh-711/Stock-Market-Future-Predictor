const KNOWN_MARKET_CAP_USD: Record<string, number> = {
  AAPL: 3_300_000_000_000,
  MSFT: 3_200_000_000_000,
  NVDA: 3_100_000_000_000,
  GOOGL: 2_100_000_000_000,
  GOOG: 2_100_000_000_000,
  AMZN: 2_000_000_000_000,
  META: 1_300_000_000_000,
  TSM: 850_000_000_000,
  AVGO: 750_000_000_000,
  BRK: 900_000_000_000,
  JPM: 620_000_000_000,
  XOM: 510_000_000_000,
  UNH: 480_000_000_000,
  LLY: 760_000_000_000,
  V: 560_000_000_000,
  MA: 440_000_000_000,
  COST: 390_000_000_000,
  ASML: 380_000_000_000,
  ORCL: 360_000_000_000,
  AMD: 260_000_000_000,
  CRM: 250_000_000_000,
  NFLX: 280_000_000_000,
  QCOM: 210_000_000_000,
  TXN: 180_000_000_000,
  INTC: 145_000_000_000,
  MU: 130_000_000_000,
  AMAT: 170_000_000_000,
  LRCX: 125_000_000_000,
  CAT: 165_000_000_000,
  DE: 115_000_000_000,
  BA: 105_000_000_000,
  NEE: 150_000_000_000,
};

const hashSymbol = (symbol: string) =>
  symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const estimatedMarketCap = (symbol: string) => {
  const normalized = symbol.toUpperCase();
  if (KNOWN_MARKET_CAP_USD[normalized]) return KNOWN_MARKET_CAP_USD[normalized];
  const hash = hashSymbol(normalized);
  if (hash % 11 === 0) return 240_000_000_000;
  if (hash % 5 === 0) return 75_000_000_000;
  return 18_000_000_000;
};

export const nodeRadiusForSymbol = (symbol: string) => {
  const cap = estimatedMarketCap(symbol);
  if (cap > 1_000_000_000_000) return 20;
  if (cap > 200_000_000_000) return 15;
  if (cap > 50_000_000_000) return 11;
  return 8;
};
