import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",

      // Code complexity and size limits
      "max-lines": ["error", {
        "max": 600,
        "skipBlankLines": true,
        "skipComments": true
      }],
      "max-lines-per-function": ["error", {
        "max": 100,
        "skipBlankLines": true,
        "skipComments": true
      }],
      "complexity": ["error", 10],
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
      "max-nested-callbacks": ["error", 3],
    },
  },
);
