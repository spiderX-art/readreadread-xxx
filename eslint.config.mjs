import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.wrangler/**",
      "**/playwright-report/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"]
      }
    }
  },
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-undef": "off",
      "vue/multi-word-component-names": "off"
    }
  },
  {
    files: ["apps/web/**/*.{ts,vue}"],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: ["apps/worker/**/*.ts"],
    languageOptions: {
      globals: globals.serviceworker
    }
  },
  {
    files: ["**/*.config.{ts,mjs}", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      globals: globals.node
    }
  }
];
