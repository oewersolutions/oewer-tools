import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/", ".next/", "out/", ".venv/", "dist/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
