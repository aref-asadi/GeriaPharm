import { test, expect } from "@playwright/test";

/**
 * The regimen page reads as three intake columns on top (prescription →
 * conditions → demographics/renal, right to left) with the full-width safety
 * report underneath, and nothing may overflow sideways inside those cards.
 */
test("regimen keeps a three column intake row above full width results", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#regimen");
  const input = page.getByRole("textbox", { name: "جست‌وجوی دارو برای نسخه" });
  for (const name of ["آلپرازولام", "ترامادول", "آمی‌تریپتیلین"]) {
    await input.fill(name);
    await page.locator(".picker-results button").first().click();
  }
  await page.getByLabel("دمانس", { exact: true }).check();
  await page.getByLabel("نرخ فیلتراسیون کلیه").fill("20");
  await page.getByLabel("کلیرانس کراتینین", { exact: true }).fill("20");

  const panels = page.locator(".checker-top-grid > .panel");
  await expect(panels).toHaveCount(3);
  const boxes = await panels.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }),
  );
  // One row of equal-width columns, laid out right to left.
  expect(new Set(boxes.map((b) => b.y)).size).toBe(1);
  expect(new Set(boxes.map((b) => b.w)).size).toBe(1);
  const xs = boxes.map((b) => b.x);
  expect(xs).toEqual([...xs].sort((a, b) => b - a));

  const grid = await page.locator(".checker-top-grid").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
  const results = await page.locator(".audit.checker-results").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
  });
  // The report spans the same width as the intake row and sits below it.
  expect(results.x).toBe(grid.x);
  expect(results.w).toBe(grid.w);
  expect(results.y).toBeGreaterThanOrEqual(grid.y + grid.h);

  // No card or strip inside the page may scroll sideways (tables opt in).
  const overflowing = await page.evaluate(() => {
    const bad: string[] = [];
    document
      .querySelectorAll(
        ".checker-container .panel, .checker-container .audit, .edge-ai-cdss-panel, .edge-ai-cdss-panel > *, .audit-alert, .audit-stats",
      )
      .forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 1)
          bad.push((el.className || el.tagName).toString().slice(0, 60));
      });
    return bad;
  });
  expect(overflowing).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);

  // The Beers groups start expanded and the toggle drives all of them at once.
  const collapseAll = page.getByRole("button", { name: "بستن همه گروه‌ها" });
  await expect(collapseAll).toBeVisible();
  await collapseAll.click();
  await expect(
    page.getByRole("heading", { name: "آلپرازولام + ترامادول" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "باز کردن همه گروه‌ها" }).click();
  await expect(
    page.getByRole("heading", { name: "آلپرازولام + ترامادول" }),
  ).toBeVisible();

  // Tablet: two columns, phone: a single column, still without overflow.
  await page.setViewportSize({ width: 820, height: 900 });
  expect(
    new Set(await panels.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)))).size,
  ).toBe(2);
  await page.setViewportSize({ width: 480, height: 900 });
  expect(
    new Set(await panels.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)))).size,
  ).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
