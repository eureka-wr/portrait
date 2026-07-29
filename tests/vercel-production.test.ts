import { afterEach, describe, expect, it } from "vitest";
import {
  createSessionCookie,
  isAuthenticated,
  requireSameOrigin,
  verifyAccessKey,
} from "../server/portrait-production/auth";
import {
  resolveJobAsset,
  toSafeJob,
  toSafeJobSummary,
} from "../server/portrait-production/store";
import type { PortraitJob } from "../server/portrait-production/types";
import { buildPortraitProductionPrompts } from "../server/portrait-production/generation";

const originalAccessKey = process.env.PORTRAIT_ACCESS_KEY;

afterEach(() => {
  if (originalAccessKey === undefined) {
    delete process.env.PORTRAIT_ACCESS_KEY;
  } else {
    process.env.PORTRAIT_ACCESS_KEY = originalAccessKey;
  }
});

function sampleJob(): PortraitJob {
  const now = "2026-07-28T00:00:00.000Z";
  return {
    id: "12345678-1234-4234-8234-123456789abc",
    orderNo: "20260728-ABC123",
    createdAt: now,
    updatedAt: now,
    customerName: "测试客户",
    channel: "职业主页",
    notes: "",
    consentConfirmed: true,
    status: "review",
    source: {
      pathname: "portrait-production/jobs/id/source/reference.jpg",
      originalName: "source.jpg",
      mimeType: "image/jpeg",
      width: 1600,
      height: 2000,
      sizeBytes: 1000,
    },
    candidates: [
      {
        id: "composed-leader",
        label: "从容领导力",
        description: "测试",
        pathname: "portrait-production/jobs/id/candidates/quiet.jpg",
        mimeType: "image/jpeg",
        status: "approved",
        portraitDNAId: "style_quiet_executive",
        portraitDNAVersion: "2.0",
        engineVersion: "2.0",
        compilerVersion: "2.0.0",
        promptChecksum: "checksum",
        reviewChecklist: {
          pose: {},
          gaze: {},
          presence: {},
          hair: {},
        },
        rejectionReasons: [],
        createdAt: now,
      },
    ],
  };
}

describe("Vercel production authentication", () => {
  it("creates a valid httpOnly session without exposing the access key", () => {
    process.env.PORTRAIT_ACCESS_KEY = "a-strong-test-passphrase";
    expect(verifyAccessKey("a-strong-test-passphrase")).toBe(true);
    expect(verifyAccessKey("wrong-passphrase")).toBe(false);

    const cookie = createSessionCookie();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("a-strong-test-passphrase");

    const request = new Request("https://portrait.catv.space/api/session", {
      headers: { cookie: cookie.split(";")[0] },
    });
    expect(isAuthenticated(request)).toBe(true);
  });

  it("rejects cross-origin mutations", () => {
    const request = new Request("https://portrait.catv.space/api/studio", {
      headers: {
        host: "portrait.catv.space",
        origin: "https://attacker.example",
      },
    });
    expect(() => requireSameOrigin(request)).toThrow(
      "请求来源未通过校验。",
    );
  });
});

describe("private asset contract", () => {
  it("never exposes Blob pathnames in the browser job payload", () => {
    const safe = toSafeJob(sampleJob());
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("portrait-production/jobs/");
    expect(safe.source.url).toContain("/api/asset?");
    expect(safe.candidates[0].url).toContain("candidate%3Acomposed-leader");
  });

  it("normalizes historical candidates before returning them to the workspace", () => {
    const job = sampleJob();
    const legacyCandidate = job.candidates[0] as unknown as Record<
      string,
      unknown
    >;
    legacyCandidate.label = "Legacy style name";
    for (const key of [
      "portraitDNAId",
      "portraitDNAVersion",
      "engineVersion",
      "compilerVersion",
      "promptChecksum",
      "reviewChecklist",
      "rejectionReasons",
    ]) {
      delete legacyCandidate[key];
    }

    expect(toSafeJob(job).candidates[0]).toMatchObject({
      label: "从容领导力",
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "legacy",
      engineVersion: "legacy",
      compilerVersion: "legacy",
      promptChecksum: "",
      reviewChecklist: {
        pose: {},
        gaze: {},
        presence: {},
        hair: {},
      },
      rejectionReasons: [],
    });
  });

  it("only resolves assets that belong to the loaded job", () => {
    const job = sampleJob();
    expect(resolveJobAsset(job, "source").pathname).toBe(job.source.pathname);
    expect(resolveJobAsset(job, "candidate:composed-leader")).toMatchObject({
      pathname: job.candidates[0].pathname,
      contentType: "image/jpeg",
      filename: "CATV-20260728-ABC123-01.jpg",
      download: false,
    });
    expect(() => resolveJobAsset(job, "candidate:unknown")).toThrow(
      "订单中没有找到这个资产。",
    );
  });

  it("returns private-path-free summaries for the multi-order workspace", () => {
    const summary = toSafeJobSummary(sampleJob());
    expect(summary).toMatchObject({
      customerName: "测试客户",
      status: "review",
      candidateCount: 1,
      approvedCount: 1,
      hasSelection: false,
      deliveryReady: false,
    });
    expect(JSON.stringify(summary)).not.toContain("pathname");
    expect(JSON.stringify(summary)).not.toContain("portrait-production/jobs/");
  });
});

describe("Vercel Portrait Engine v2 production prompts", () => {
  it("compiles four traceable v2 DNA prompts with identity first and negative last", async () => {
    const prompts = await buildPortraitProductionPrompts("Keep it natural.");
    expect(prompts).toHaveLength(4);
    expect(prompts.every((prompt) => prompt.engineVersion === "2.0")).toBe(true);
    expect(prompts.every((prompt) => prompt.compilerVersion === "2.0.0")).toBe(
      true,
    );
    expect(
      prompts.every((prompt) => prompt.providerPrompt.startsWith("[01 · IDENTITY]")),
    ).toBe(true);
    expect(
      prompts.every((prompt) =>
        prompt.providerPrompt.includes("[20 · NEGATIVE]"),
      ),
    ).toBe(true);
  });
});
