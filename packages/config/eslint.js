// Shared flat-config rules for every package in the monorepo.
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
const sharedRules = [
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", ".next/**"],
  },
];

// For plain TS packages with no other typescript-eslint setup (packages/core, packages/ui).
export const baseConfig = [...tseslint.configs.recommended, ...sharedRules];

// For apps that already register the typescript-eslint plugin themselves (apps/web, via
// eslint-config-next) — registering the same plugin twice throws "Cannot redefine plugin".
export const sharedRulesConfig = sharedRules;

export default baseConfig;
