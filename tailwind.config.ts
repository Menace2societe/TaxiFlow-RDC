import type { Config } from "tailwindcss";

const config: Config = {
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
        road: "#f6f4ef"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 35, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
