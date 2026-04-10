/**
 * Format a number as a short string: 304445 → "304K" | 1200000 → "1.2M"
 * Used everywhere in the UI for displaying monetary amounts.
 */
export const fmt = (n) => {
    if (n == null || isNaN(n)) return '0';
    const num = parseFloat(n);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toFixed(2);
};

/**
 * Full formatted number with spaces: 304445.05 → "304 445.05"
 * Used as tooltip on hover.
 */
export const fmtFull = (n) => {
    if (n == null || isNaN(n)) return '0.00';
    return parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Render an amount with short display + full tooltip on hover.
 * Usage: <span {...fmtAmount(304445.05)}>304K<small> MAD</small></span>
 */
export const fmtTitle = (n) => fmtFull(n) + ' MAD';
