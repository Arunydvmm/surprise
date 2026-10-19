export type Theme = { id: string; name: string; emoji: string; roseink: string; berry: string; petal: string; blush: string; cream: string; bg: string; font: string };
const sans = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const rounded = 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif';
const serif = 'Georgia, "Times New Roman", serif';
export const themes: Theme[] = [
  { id: "blush", name: "Blush Pink", emoji: "🌸", roseink: "#4c2638", berry: "#b84e73", petal: "#f7c6d4", blush: "#fff0f4", cream: "#fffaf5", bg: "#fffaf7", font: sans },
  { id: "romantic", name: "Romantic Red", emoji: "❤️", roseink: "#3a1520", berry: "#c0283f", petal: "#f5b5bf", blush: "#ffecee", cream: "#fff7f6", bg: "#fff6f5", font: serif },
  { id: "lavender", name: "Lavender Dream", emoji: "💜", roseink: "#33274f", berry: "#7c5cbf", petal: "#d9ccf5", blush: "#f3eeff", cream: "#faf7ff", bg: "#faf8ff", font: rounded },
  { id: "ocean", name: "Ocean Breeze", emoji: "🌊", roseink: "#18364a", berry: "#2b7a9b", petal: "#bfe3f0", blush: "#eaf7fc", cream: "#f6fcff", bg: "#f5fbfe", font: sans },
  { id: "peach", name: "Sunset Peach", emoji: "🍑", roseink: "#4a2a1d", berry: "#d9653b", petal: "#ffd2b8", blush: "#fff0e6", cream: "#fffaf4", bg: "#fff8f2", font: rounded },
  { id: "mint", name: "Mint Garden", emoji: "🌿", roseink: "#1f3a2e", berry: "#3f9a73", petal: "#c4ecd8", blush: "#eafaf2", cream: "#f6fffa", bg: "#f5fdf9", font: rounded }
];
export const defaultThemeId = "blush";
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
export function themeVars(t: Theme): Record<string, string> {
  return { "--roseink": rgb(t.roseink), "--berry": rgb(t.berry), "--petal": rgb(t.petal), "--blush": rgb(t.blush), "--cream": rgb(t.cream), "--bg": t.bg, "--font": t.font };
}
export const findTheme = (id?: string | null) => themes.find(t => t.id === id) || themes[0];
