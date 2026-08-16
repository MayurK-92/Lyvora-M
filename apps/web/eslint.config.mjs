import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { sharedRulesConfig } from "@lyvora/config/eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...sharedRulesConfig,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
