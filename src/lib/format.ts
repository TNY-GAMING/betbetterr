export const fmt = (n: number, digits = 2) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "k";
  }
  return fmt(n);
};

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
