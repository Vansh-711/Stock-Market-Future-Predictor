export const TOKEN_COLORS = {
  canvas: '#0B0D12',
  surface: '#12151C',
  surfaceRaised: '#181C25',
  surfaceHover: '#1D2129',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#E7E9EE',
  textSecondary: '#9AA1AE',
  textMuted: '#676E7C',
  accent: '#4C8DFF',
  accentHover: '#6BA1FF',
  accentMuted: 'rgba(76,141,255,0.14)',
  positive: '#4CC38A',
  positiveMuted: 'rgba(76,195,138,0.14)',
  negative: '#E0645C',
  negativeMuted: 'rgba(224,100,92,0.14)',
  warning: '#E0A23D',
  warningMuted: 'rgba(224,162,61,0.14)',
} as const;

export const SECTOR_COLORS: Record<string, string> = {
  Technology: '#6E8FE0',
  Financials: '#7FBF8F',
  Energy: '#D99B5C',
  Healthcare: '#C97FA8',
  Consumer: '#7FC7C2',
  Industrials: '#A6A0D9',
  Communication: '#D9866E',
  Utilities: '#93B5A0',
};

export const sectorColor = (sector: string) => SECTOR_COLORS[sector] ?? TOKEN_COLORS.textMuted;
