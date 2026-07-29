import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("operator can complete the phase-one portrait workflow", async ({
  page,
}) => {
  const sourceImage = await sharp({
    create: {
      width: 900,
      height: 1200,
      channels: 3,
      background: { r: 151, g: 171, b: 178 },
    },
  })
    .jpeg({ quality: 88 })
    .toBuffer();

  await page.goto("/portrait");
  await expect(
    page.getByRole("heading", {
      name: /不用变成别人.*也能看起来更职业/,
    }),
  ).toBeVisible();

  await page.goto("/admin/portrait/orders/new");
  await page.getByRole("textbox", { name: "客户昵称" }).fill("Playwright 验收客户");
  await page
    .getByRole("textbox", { name: "客户要求" })
    .fill("用于职业主页，必须保持真实身份与自然皮肤。");
  await page.locator('input[type="file"]').setInputFiles({
    name: "playwright-source.jpg",
    mimeType: "image/jpeg",
    buffer: sourceImage,
  });
  await page.getByRole("button", { name: "创建并进入工作台" }).click();

  await expect(
    page.getByRole("heading", { name: "Playwright 验收客户" }),
  ).toBeVisible();
  await expect(page.getByText("待生成", { exact: true })).toBeVisible();
  await expect(page.getByText(/DNA v2\.\d+/)).toBeVisible();

  await page.getByRole("button", { name: "编译 Prompt" }).click();
  await expect(page.getByText("Identity 排在第一位")).toBeVisible();
  await expect(page.getByText(/Negative 最后一位 · 20 模块/)).toBeVisible();

  await page.getByRole("button", { name: "生成 4 张候选" }).click();
  const candidates = page.getByRole("article");
  await expect(candidates).toHaveCount(4);

  for (let index = 0; index < 2; index += 1) {
    await candidates
      .nth(index)
      .getByText("Pose · Gaze · Presence · Hair 审核")
      .click();
    const checklist = candidates.nth(index).getByRole("checkbox");
    const checklistCount = await checklist.count();
    for (let item = 0; item < checklistCount; item += 1) {
      await checklist.nth(item).check();
    }
    await candidates.nth(index).getByRole("button", { name: "通过" }).click();
    await candidates
      .nth(index)
      .getByRole("button", { name: "选为预览" })
      .click();
  }

  await candidates
    .nth(2)
    .getByText("Pose · Gaze · Presence · Hair 审核")
    .click();
  await candidates
    .nth(2)
    .getByLabel("淘汰原因")
    .selectOption("weak_presence");
  await candidates.nth(2).getByRole("button", { name: "淘汰" }).click();

  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "下载两张并标记已发送" })
    .click();
  await expect(page.getByText("等待客户选择", { exact: true })).toBeVisible();

  await page.getByRole("radio", { name: "预览 1" }).check();
  await page
    .getByRole("textbox", { name: "客户原话 / 修改意见" })
    .fill("选择第一张，整体自然且职业。");
  await page.getByRole("button", { name: "确认最终选择" }).click();
  await expect(page.getByText("客户已选择", { exact: true })).toBeVisible();

  const finalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出无水印高清 ZIP" }).click();
  await finalDownload;
  await expect(page.getByText("待交付", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "确认客户已收到并完成订单" })
    .click();
  await expect(page.getByText("已完成", { exact: true })).toBeVisible();
});
