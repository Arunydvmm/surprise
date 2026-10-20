export type Theme = { id: string; name: string; emoji: string; roseink: string; berry: string; petal: string; blush: string; cream: string; bg: string; font: string; enabled?: boolean; sort_order?: number };

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const FONT_OK = /^[\w\s,"'.\-]{1,300}$/;
export const THEME_ID = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Used only when the database has no usable theme (for example if an admin deleted them all). */
export const fallbackTheme: Theme = { id: "blush", name: "Blush Pink", emoji: "🌸", roseink: "#4c2638", berry: "#b84e73", petal: "#f7c6d4", blush: "#fff0f4", cream: "#fffaf5", bg: "#fffaf7", font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' };

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const hexOr = (v: string, d: string) => (HEX.test(v) ? v : d);

export function themeVars(t: Theme): Record<string, string> {
  const f = fallbackTheme;
  return {
    "--roseink": rgb(hexOr(t.roseink, f.roseink)), "--berry": rgb(hexOr(t.berry, f.berry)), "--petal": rgb(hexOr(t.petal, f.petal)),
    "--blush": rgb(hexOr(t.blush, f.blush)), "--cream": rgb(hexOr(t.cream, f.cream)), "--bg": hexOr(t.bg, f.bg),
    "--font": FONT_OK.test(t.font) ? t.font : f.font
  };
}
