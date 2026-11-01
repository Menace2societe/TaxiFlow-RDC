import type { Config } from "tailwindcss";

const config: Config = {
  // L'espace chauffeur (.plate-world) est clair : les variantes dark: ne s'y appliquent pas.
  darkMode: ["variant", "&:where(.dark *):not(:where(.plate-world, .plate-world *))"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17231f",
        palm: "#1f7a55",
        copper: "#b86b37",
        river: "#0e7490",
        road: "#f6f4ef",
        // Univers « plaque » de l'espace chauffeur
        plate: {
          ground: "#f7f7f2",
          white: "#ffffff",
          ink: "#111111",
          soft: "#3b3b36",
          rule: "#d6d6cc",
          band: "#1f4fb4",
          "band-dark": "#173d8c",
          vignette: "#f2c230",
          ok: "#17703d",
          wait: "#8f5000",
          bad: "#b3261e"
        }
      },
      fontFamily: {
        plate: ["var(--font-plate)", "Arial Narrow", "sans-serif"],
        street: ["var(--font-street)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 35, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
