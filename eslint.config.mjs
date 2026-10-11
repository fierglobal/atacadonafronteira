import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saída de build do OpenNext/Cloudflare — código gerado, não fonte.
    ".open-next/**",
    // Saída de build do Vercel adapter — código gerado, não fonte.
    ".vercel/**",
    // Worktrees de agentes em background — cópia isolada em branch própria,
    // não é o código que será deployado a partir daqui.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
