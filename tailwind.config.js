/**
 * FHTC Sentinel design tokens — single source of truth for the theme.
 * Mirrored as CSS variables in app/globals.css (used by print styles and
 * components that need raw values).
 *
 * Rules:
 *  - Radius scale: inputs/buttons 8, cards 12, large panels 16. Nothing else.
 *  - Shadows: floating elements only (dropdowns, modals, sticky bars).
 *  - Severity colors are used ONLY on flags/scores/heat bars, always beside
 *    a text label (S1–S5) so color is never the sole signal.
 */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F7F7F4",
        surface: "#FFFFFF",
        subtle: "#F1F1ED",
        border: "#E6E5DF",
        "border-strong": "#D3D2CA",
        ink: {
          DEFAULT: "#141414",
          secondary: "#5C5C57",
          muted: "#8C8C86",
        },
        brand: {
          DEFAULT: "#0F5E7A",
          soft: "#E3F1F6",
          hover: "#0B4A62",
        },
        success: { DEFAULT: "#2E7D4F", soft: "#E7F2EB" },
        info: { DEFAULT: "#0F5E7A", soft: "#E3F1F6" },
        warning: { DEFAULT: "#C58A1B", soft: "#FBF1DA" },
        danger: { DEFAULT: "#B3261E", soft: "#FBE3E1" },
        sev1: { fg: "#5B8C5A", bg: "#EAF3EA" },
        sev2: { fg: "#8A9A3B", bg: "#F2F5E1" },
        sev3: { fg: "#C58A1B", bg: "#FBF1DA" },
        sev4: { fg: "#D1621F", bg: "#FCE8DA" },
        sev5: { fg: "#B3261E", bg: "#FBE3E1" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],      // 12
        sm: ["0.875rem", { lineHeight: "1.25rem" }],  // 14 body
        base: ["1rem", { lineHeight: "1.5rem" }],     // 16
        lg: ["1.25rem", { lineHeight: "1.75rem" }],   // 20
        xl: ["1.5rem", { lineHeight: "2rem" }],       // 24 page titles
        "2xl": ["2rem", { lineHeight: "2.375rem" }],  // 32
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        panel: "16px",
      },
      boxShadow: {
        float: "0 1px 2px rgba(20,20,20,0.06), 0 8px 24px -8px rgba(20,20,20,0.16)",
      },
      spacing: {}, // 4px grid is Tailwind's default scale
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};
