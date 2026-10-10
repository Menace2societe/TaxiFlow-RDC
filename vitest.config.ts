import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" lève une erreur hors du bundle serveur de Next.js.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url))
    }
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000
  }
});
