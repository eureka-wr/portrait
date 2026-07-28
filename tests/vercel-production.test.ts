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
} from "../server/portrait-production/store";
import type { PortraitJob } from "../server/portrait-production/types";

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
        id: "quiet-leader",
        label: "静默领导者",
        description: "测试",
        pathname: "portrait-production/jobs/id/candidates/quiet.jpg",
        mimeType: "image/jpeg",
        status: "approved",
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
    expect(safe.candidates[0].url).toContain("candidate%3Aquiet-leader");
  });

  it("only resolves assets that belong to the loaded job", () => {
    const job = sampleJob();
    expect(resolveJobAsset(job, "source").pathname).toBe(job.source.pathname);
    expect(
      resolveJobAsset(job, "candidate:quiet-leader").pathname,
    ).toBe(job.candidates[0].pathname);
    expect(() => resolveJobAsset(job, "candidate:unknown")).toThrow(
      "订单中没有找到这个资产。",
    );
  });
});
