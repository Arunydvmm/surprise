import type { Metadata } from "next";
import { db, isDbConfigured, RowDataPacket } from "@/lib/db";
import { findTheme, themeVars } from "@/lib/themes";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A Little Something for You 💗",
  description: "A tiny digital scrapbook for a very special best friend.",
  robots: { index: false, follow: false }
};
async function loadThemeId(): Promise<string | null> {
  if (!isDbConfigured()) return null;
  try {
    const pool = await db();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT `value` FROM surprise_settings WHERE `key` = 'theme' LIMIT 1");
    return rows[0]?.value || null;
  } catch { return null; }
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = findTheme(await loadThemeId());
  return <html lang="en" style={themeVars(theme) as React.CSSProperties}><body>{children}</body></html>;
}
