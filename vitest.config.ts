import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": new URL(
        "./tests/cloudflare-workers-stub.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});

