import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", ".vercel/**", ".local-import/**", "node_modules/**", "*.tsbuildinfo", "next-env.d.ts"] },
];

export default eslintConfig;
