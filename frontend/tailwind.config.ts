import type { Config } from "tailwindcss";
import { animations, components, palette, rounded, shade } from "@tailus/themer";

// The Tailus plugins supply the palettes (switched with data-palette on <html>), the surface
// shades, the radius tokens and the shared component styles. Components use their utility classes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  plugins: [components, rounded, palette, shade, animations],
};

export default config;
