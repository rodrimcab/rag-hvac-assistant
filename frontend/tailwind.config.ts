import type { Config } from "tailwindcss";

/** Rutas de contenido; tema y colores viven en `src/index.css` (@theme) para Tailwind v4. */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
} satisfies Config;
