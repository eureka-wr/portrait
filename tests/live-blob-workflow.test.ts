import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import assetHandler from "../api/asset";
import sessionHandler from "../api/session";
import studioHandler from "../api/studio";

const liveDescribe =
  process.env.RUN_LIVE_BLOB_TEST === "1" ? describe : describe.skip;

liveDescribe("live Vercel Blob workflow", () => {
  const accessKey = "catv-live-storage-smoke-test";
  let cookie = "";
  let jobId = "";
  const previousAccessKey = process.env.PORTRAIT_ACCESS_KEY;

  beforeAll(() => {
    process.env.PORTRAIT_ACCESS_KEY = accessKey;
  });

  afterAll(async () => {
    if (jobId && cookie) {
      await studioHandler.fetch(
        new Request("https://portrait.catv.space/api/studio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie,
            host: "portrait.catv.space",
            origin: "https://portrait.catv.space",
          },
          body: JSON.stringify({ action: "delete", jobId }),
        }),
      );
    }

    if (previousAccessKey === undefined) {
      delete process.env.PORTRAIT_ACCESS_KEY;
    } else {
      process.env.PORTRAIT_ACCESS_KEY = previousAccessKey;
    }
  });

  it("logs in, uploads a normalized photo, reads it privately, and deletes it", async () => {
    const login = await sessionHandler.fetch(
      new Request("https://portrait.catv.space/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "portrait.catv.space",
          origin: "https://portrait.catv.space",
        },
        body: JSON.stringify({ accessKey }),
      }),
    );
    expect(login.status).toBe(200);
    cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const image = await sharp({
      create: {
        width: 900,
        height: 1200,
        channels: 3,
        background: { r: 130, g: 145, b: 150 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    const form = new FormData();
    form.set(
      "photo",
      new File([image], "storage-smoke.jpg", { type: "image/jpeg" }),
    );
    form.set("customerName", "Blob Smoke Test");
    form.set("channel", "测试");
    form.set("notes", "temporary integration test");
    form.set("consentConfirmed", "true");

    const created = await studioHandler.fetch(
      new Request("https://portrait.catv.space/api/studio", {
        method: "POST",
        headers: {
          cookie,
          host: "portrait.catv.space",
          origin: "https://portrait.catv.space",
        },
        body: form,
      }),
    );
    expect(created.status).toBe(201);
    const payload = (await created.json()) as {
      job: { id: string; source: { url: string; width: number; height: number } };
    };
    jobId = payload.job.id;
    expect(payload.job.source.url).toContain("/api/asset?");
    expect(payload.job.source.width).toBe(900);
    expect(payload.job.source.height).toBe(1200);

    const asset = await assetHandler.fetch(
      new Request(
        `https://portrait.catv.space/api/asset?jobId=${jobId}&asset=source`,
        { headers: { cookie } },
      ),
    );
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("image/jpeg");
    expect((await asset.arrayBuffer()).byteLength).toBeGreaterThan(1000);

    const deleted = await studioHandler.fetch(
      new Request("https://portrait.catv.space/api/studio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
          host: "portrait.catv.space",
          origin: "https://portrait.catv.space",
        },
        body: JSON.stringify({ action: "delete", jobId }),
      }),
    );
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true });
    jobId = "";
  }, 60_000);
});
