import type { Config } from "tailwindcss";
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: {
      roseink: v("roseink"), blush: v("blush"), petal: v("petal"), berry: v("berry"), cream: v("cream"),
      rose: { 50: v("blush"), 100: v("petal"), 200: v("petal"), 600: v("berry") },
      pink: { 100: v("petal"), 200: v("petal"), 600: v("berry") }
    },
    boxShadow: { dreamy: "0 18px 70px rgb(var(--berry) / .15)" }
  }},
  plugins: [],
};
export default config;
