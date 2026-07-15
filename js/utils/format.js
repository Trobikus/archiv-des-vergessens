export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  // Nutzt den deutschen Standard für Tausendertrennpunkte: 1.000.000
  return new Intl.NumberFormat('de-DE').format(Math.floor(num));
}