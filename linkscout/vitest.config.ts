import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "context/**/*.tsx",
        "lib/store.ts",
        "components/**/*.tsx",
      ],
      exclude: ["node_modules", "tests/**", "**/*.d.ts"],
    },
    testTimeout: 10_000,
    retry: 0,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
