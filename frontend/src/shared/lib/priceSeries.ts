export type PricePoint = {
  date: string;
  value: number;
};

export type PriceRange = '1M' | '3M' | '6M' | '1Y';

const rangeDays: Record<PriceRange, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

const seedFromSymbol = (symbol: string) =>
  symbol.toUpperCase().split('').reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

const wave = (seed: number, index: number) => Math.sin((seed + index * 17) * 0.11) + Math.cos((seed + index * 7) * 0.07);

export const buildPriceSeries = (symbol: string, range: PriceRange): PricePoint[] => {
  const days = rangeDays[range];
  const points = range === '1M' ? 22 : range === '3M' ? 45 : range === '6M' ? 72 : 96;
  const seed = seedFromSymbol(symbol);
  const base = 80 + (seed % 240);
  const drift = ((seed % 9) - 3) / 1000;
  const today = new Date();

  return Array.from({ length: points }, (_, index) => {
    const progress = index / Math.max(1, points - 1);
    const daysAgo = Math.round(days * (1 - progress));
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const movement = 1 + drift * index + wave(seed, index) * 0.015 + Math.sin(progress * Math.PI * 2) * 0.025;
    return {
      date: date.toISOString(),
      value: Number((base * movement).toFixed(2)),
    };
  });
};

export const buildPostEventSeries = (symbol: string, direction: string, createdAt: string, confidence: number): PricePoint[] => {
  const seed = seedFromSymbol(symbol);
  const base = 80 + (seed % 220);
  const start = new Date(createdAt);
  const sign = direction === 'down' ? -1 : 1;
  const expectedMove = sign * (0.008 + Math.min(0.85, confidence) * 0.045);

  return Array.from({ length: 11 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const progress = index / 10;
    const noise = wave(seed, index) * 0.006;
    return {
      date: date.toISOString(),
      value: Number((base * (1 + expectedMove * progress + noise)).toFixed(2)),
    };
  });
};
