import type { Metadata } from "next";
import { getPlatformSettings, pickTheme } from "@/lib/catalog";
import { themeVars } from "@/lib/themes";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPlatformSettings();
  return {
    title: { default: `${s.brand_name}: make a surprise for someone you love`, template: `%s | ${s.brand_name}` },
    description: "Turn photos, memories and letters into a private, animated surprise website for any occasion. Share it with a link and a password."
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await pickTheme(null); // the platform default theme (set in Admin > Settings)
  return <html lang="en" style={themeVars(theme) as React.CSSProperties}><body>{children}</body></html>;
}
