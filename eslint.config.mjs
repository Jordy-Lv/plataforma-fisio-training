import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  {
    // `work/` y `_local/` son material temporal de trabajo, ya fuera de git: si
    // alguien deja ahí un entorno de otro lenguaje, el lint del proyecto no
    // tiene por qué opinar sobre él.
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "next-env.d.ts",
      "work/**",
      "_local/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
