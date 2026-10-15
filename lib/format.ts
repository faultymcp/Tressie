// lib/format.ts
// Small display helpers for stylists' prices and appointment lengths.

export function formatLength(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

export function formatPrice(pence: number, from: boolean) {
  const pounds = (pence / 100).toFixed(pence % 100 ? 2 : 0);
  return `${from ? 'from ' : ''}£${pounds}`;
}
