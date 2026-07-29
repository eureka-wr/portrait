import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("production safety contracts", () => {
  it("declares D1 and private R2 bindings", () => {
    const config = read("vite.config.ts");
    expect(config).toContain('const d1 = "DB"');
    expect(config).toContain('const r2 = "PORTRAIT_ASSETS"');
  });

  it("never exposes storage keys in the studio state query", () => {
    const repository = read(
      "src/modules/portrait/database/repository.ts",
    );
    expect(repository).toContain(
      "SELECT id, order_id, candidate_id, kind, mime_type",
    );
    expect(repository).not.toMatch(
      /SELECT id, order_id, candidate_id, kind, storage_key, mime_type, width/,
    );
  });

  it("keeps feature flags for self-service and payment off", () => {
    const envExample = read(".env.example");
    expect(envExample).toContain("ENABLE_PORTRAIT_SELF_SERVICE=false");
    expect(envExample).toContain("ENABLE_PORTRAIT_ONLINE_PAYMENT=false");
  });

  it("uses GPT Image 2 across both production runtimes", () => {
    const modelSources = [
      read(".env.example"),
      read("api/session.ts"),
      read("server/portrait-production/generation.ts"),
      read("src/modules/portrait/database/repository.ts"),
      read("src/modules/portrait/providers/provider.ts"),
    ].join("\n");

    expect(modelSources).toContain("gpt-image-2");
    expect(modelSources).not.toContain("gpt-image-1.5");
  });

  it("keeps Vercel runtime imports resolvable after ESM compilation", () => {
    const compiler = read("src/modules/portrait/prompts/compiler.ts");
    expect(compiler).toContain('from "../domain/catalog.js"');
    expect(compiler).toContain('from "../domain/types.js"');
  });
});
