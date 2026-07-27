export const formatPercent = (value: number, digits = 1) => {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(digits)}%`;
};

export const formatSignedPercent = (value: number, digits = 1) => {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  const sign = normalized > 0 ? '+' : '';
  return `${sign}${normalized.toFixed(digits)}%`;
};

export const formatInteger = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatEventType = (value: string) => value.replace(/_/g, ' ');

export const formatRelationshipType = (value: string) => {
  if (value === 'suppliercustomer') return 'supplier/customer';
  return value.replace(/_/g, ' ');
};

export const initialsFromUsername = (username: string) => {
  const cleaned = username.trim();
  if (!cleaned) return 'SC';
  const pieces = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (pieces.length === 1) return pieces[0].slice(0, 2).toUpperCase();
  return `${pieces[0][0]}${pieces[1][0]}`.toUpperCase();
};
