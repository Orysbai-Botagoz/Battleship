import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#eef8ff",
          100: "#d9efff",
          200: "#bce4ff",
          300: "#8fd2ff",
          400: "#5ab8ff",
          500: "#2e99ff",
          600: "#1879f5",
          700: "#145fdb",
          800: "#174eaf",
          900: "#194486"
        }
      }
    },
  },
  plugins: [],
};

export default config;