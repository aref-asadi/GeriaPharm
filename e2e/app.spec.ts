import { test, expect } from "@playwright/test";
const email = "qa@example.test",
  password = "QA-only-password-59842!";
const TOTAL = 73,
  CNS_COUNT = 27,
  GI_COUNT = 8,
  CAUTION_COUNT = 14;
async function login(page: import("@playwright/test").Page) {
  await page.goto("/#admin");
  await page.getByLabel("ایمیل مدیر").fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود امن" }).click();
  await expect(
    page.getByRole("button", { name: "افزودن دارو", exact: true }),
  ).toBeVisible();
}
test("Persian home, local font, desktop layout and no JavaScript errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "نسخه‌ای آگاهانه‌تر، مراقبتی ایمن‌تر." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".brand strong")).toHaveText("گریافارم");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
  ).toContain("Vazirmatn");
  await expect(page.locator(".category-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("theme toggle applies and persists dark mode across reload", async ({
  page,
}) => {
  await page.goto("/");
  const group = page.getByRole("group", {
    name: "انتخاب حالت نمایش روشن یا تیره",
  });
  await group.getByRole("button", { name: "تیره" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue("--bg").trim(),
    ),
  ).toBe("#090d16");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await group.getByRole("button", { name: "روشن" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
test("offline pill appears when disconnected", async ({ page, context }) => {
  await page.goto("/");
  // Some Chrome builds do not flip navigator.onLine under CDP emulation,
  // so drive the same window events the app listens to.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(
    page.getByText("حالت آفلاین · بانک داده در دسترس است"),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByText("حالت آفلاین · بانک داده در دسترس است"),
  ).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByText("حالت آفلاین · بانک داده در دسترس است"),
  ).toBeHidden();
});
test("Persian and English search, details, private note and bookmark persistence", async ({
  page,
}) => {
  await page.goto("/#library");
  const search = page.getByRole("textbox", { name: "جست‌وجو", exact: true });
  await search.fill("وارفارین");
  await expect(page.locator(".med-card")).toHaveCount(1);
  await page.getByRole("button", { name: "وارفارین", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("شروع وارفارین", { exact: false })).toBeVisible();
  const note = page.getByLabel(/یادداشت خصوصی بالینی/);
  await note.fill("یادداشت آزمایشی بالینی");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "نشانک‌گذاری", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/#bookmarks");
  await expect(page.locator(".med-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".med-card")).toHaveCount(1);
  await page.getByRole("button", { name: "وارفارین", exact: true }).click();
  await expect(page.getByLabel(/یادداشت خصوصی بالینی/)).toHaveValue(
    "یادداشت آزمایشی بالینی",
  );
  await page
    .getByLabel(/یادداشت خصوصی بالینی/)
    .fill("");
  await page.keyboard.press("Escape");
  await page.goto("/#library");
  await search.fill("Xanax");
  await expect(page.locator(".med-title")).toHaveText("آلپرازولام");
  await search.fill("هیدروکسی‌زین");
  await expect(page.locator(".med-card")).toHaveCount(1);
});
test("regimen detects interactions, condition warnings and renal metric mismatch", async ({
  page,
}) => {
  await page.goto("/#regimen");
  const input = page.getByRole("textbox", { name: "جست‌وجوی دارو برای نسخه" });
  for (const name of ["آلپرازولام", "ترامادول", "آمی‌تریپتیلین"]) {
    await input.fill(name);
    await page.locator(".picker-results button").first().click();
  }
  await expect(
    page.getByRole("heading", { name: "بار تجمعی سیستم عصبی مرکزی · ۳ دارو" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "آلپرازولام + ترامادول" }),
  ).toBeVisible();
  await page.getByLabel("دمانس", { exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "آمی‌تریپتیلین · دمانس" }),
  ).toBeVisible();
  await page.getByLabel("نرخ فیلتراسیون کلیه").fill("20");
  await expect(
    page.getByText("ترامادول · ارزیابی کلیوی کامل نیست"),
  ).toBeVisible();
  await page.getByLabel("کلیرانس کراتینین", { exact: true }).fill("20");
  await expect(
    page.getByRole("heading", { name: "ترامادول · CrCl < 30 mL/min" }),
  ).toBeVisible();
  await expect(page.locator(".stat-tile")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: /چاپ خلاصه/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/regimen-desktop.png",
    fullPage: true,
  });
});
test("admin is gated, login works, edit persists, backup downloads, audit and logout work", async ({
  page,
}) => {
  await page.goto("/#admin");
  await expect(
    page.getByRole("heading", { name: "ورود به مدیریت گریافارم" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "افزودن دارو", exact: true }),
  ).not.toBeVisible();
  await login(page);
  await page
    .getByRole("button", { name: "ویرایش وارفارین", exact: true })
    .click();
  await page
    .getByLabel("یادداشت و منبع بازبینی")
    .fill("بازبینی آزمایشی رابط کاربری");
  await page.getByRole("button", { name: "ذخیره دارو", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "ویرایش وارفارین", exact: true })
    .click();
  await expect(page.getByLabel("یادداشت و منبع بازبینی")).toHaveValue(
    "بازبینی آزمایشی رابط کاربری",
  );
  await page.getByRole("button", { name: "بستن پنجره" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "دریافت پشتیبان" }).click();
  expect((await download).suggestedFilename()).toMatch(/geriapharm.*json/);
  await page.getByRole("button", { name: "تاریخچه", exact: true }).click();
  await expect(page.getByText("ذخیره دارو", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "artifacts/admin-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ورود به مدیریت گریافارم" }),
  ).toBeVisible();
});
test("admin creation, dirty form protection, invalid import and deletion confirmation", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "افزودن دارو", exact: true }).click();
  await page.getByLabel("نام فارسی دارو").fill("داروی آزمایشی");
  await page.getByLabel("نام ژنریک انگلیسی *").fill("QA test medication");
  await page
    .getByLabel("توصیه بالینی *", { exact: true })
    .fill("توصیه آزمایشی");
  await page.getByLabel("دلیل و شواهد بالینی *").fill("داده آزمایشی");
  await page.getByRole("button", { name: "بستن پنجره" }).click();
  await expect(
    page.getByText("تغییرات ذخیره نشده است.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ادامه ویرایش" }).click();
  await page.getByRole("button", { name: "ذخیره دارو", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "حذف داروی آزمایشی", exact: true }),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad-json"),
  });
  await expect(page.getByRole("alert")).toContainText("JSON");
  await page
    .getByRole("button", { name: "حذف داروی آزمایشی", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("فهرست مشترک");
  await page.getByRole("button", { name: "تأیید تغییرات" }).click();
  await expect(
    page.getByRole("button", { name: "حذف داروی آزمایشی", exact: true }),
  ).not.toBeVisible();
});
test("mobile RTL, no overflow and accessible login", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".mobile-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "مدیریت" })
    .click();
  await expect(
    page.getByRole("heading", { name: "ورود به مدیریت گریافارم" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/login-mobile.png", fullPage: true });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "مرجع داروها" })
    .click();
  await page
    .getByRole("textbox", { name: "جست‌وجو", exact: true })
    .fill("آلپرازولام");
  await page.getByRole("button", { name: "آلپرازولام", exact: true }).click();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  const modalBox = await page.getByRole("dialog").boundingBox();
  expect(modalBox!.x).toBeGreaterThan(5);
  expect(modalBox!.y).toBeGreaterThan(5);
  await page.screenshot({
    path: "artifacts/detail-mobile.png",
    fullPage: true,
  });
});
test("production PWA works after offline reload without caching auth APIs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "نسخه‌ای آگاهانه‌تر، مراقبتی ایمن‌تر." }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls = [];
    for (const key of keys) {
      for (const req of await (await caches.open(key)).keys())
        urls.push(req.url);
    }
    return urls;
  });
  expect(
    cached.some((u) => u.includes("vazirmatn") && u.includes(".woff2")),
  ).toBe(true);
  expect(cached.some((u) => u.includes("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "نسخه‌ای آگاهانه‌تر، مراقبتی ایمن‌تر." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "جست‌وجوی سریع دارو" })
    .fill("وارفارین");
  await expect(page.locator(".med-card")).toHaveCount(1);
  await page.getByRole("button", { name: "وارفارین", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/#admin");
  await expect(
    page.getByRole("button", { name: "افزودن دارو", exact: true }),
  ).not.toBeVisible();
  await context.setOffline(false);
});

test("accessibility audit of home and admin login", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const path of ["/", "/#admin"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});

test("password change returns to login with a success message", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "تغییر رمز", exact: true }).click();
  await page.getByLabel("رمز فعلی", { exact: true }).fill(password);
  const next = "QA-new-password-66431!";
  await page.getByLabel("رمز جدید؛ حداقل ۱۲ نویسه").fill(next);
  await page.getByLabel("تکرار رمز جدید").fill(next);
  await page.getByRole("button", { name: "ذخیره رمز جدید" }).click();
  await expect(
    page.getByRole("heading", { name: "ورود به مدیریت گریافارم" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("رمز عبور تغییر کرد");
  await page.getByLabel("ایمیل مدیر").fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(next);
  await page.getByRole("button", { name: "ورود امن" }).click();
  await expect(
    page.getByRole("button", { name: "افزودن دارو", exact: true }),
  ).toBeVisible();
  const session = await (await page.request.get("/api/auth/session")).json();
  const restored = await page.request.post("/api/auth/password", {
    headers: {
      Origin: "http://127.0.0.1:4174",
      "X-CSRF-Token": session.csrfToken,
    },
    data: { currentPassword: next, newPassword: password },
  });
  expect(restored.ok()).toBe(true);
});

test("custom filter dropdown supports keyboard, selection and outside dismissal", async ({
  page,
}) => {
  await page.goto("/#library");
  await expect(page.locator("select,datalist")).toHaveCount(0);
  const specialty = page.getByRole("combobox", {
    name: "گروه درمانی",
    exact: true,
  });
  await specialty.click();
  await expect(
    page.getByRole("listbox", { name: "گروه درمانی", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("option", { name: "سیستم عصبی مرکزی", exact: true })
    .click();
  await expect(specialty).toContainText("سیستم عصبی مرکزی");
  await expect(page.locator(".med-card")).toHaveCount(CNS_COUNT);
  await specialty.press("ArrowDown");
  await specialty.press("Home");
  await specialty.press("Enter");
  await expect(specialty).toContainText("همه گروه‌های درمانی");
  await expect(page.locator(".med-card")).toHaveCount(TOTAL);
  const beers = page.getByRole("combobox", { name: "دسته معیار بیرز" });
  await beers.click();
  await page
    .getByRole("option", { name: "مصرف با احتیاط", exact: true })
    .click();
  await expect(page.locator(".med-card")).toHaveCount(CAUTION_COUNT);
  await beers.click();
  await page.screenshot({
    path: "artifacts/dropdown-desktop.png",
    fullPage: true,
  });
  await page.getByRole("heading", { name: "مرجع داروها", exact: true }).click();
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await beers.focus();
  await beers.press("ArrowDown");
  await beers.press("Escape");
  await expect(beers).toBeFocused();
  await expect(beers).toHaveAttribute("aria-expanded", "false");
});

test("custom admin choices work above the modal and preserve free text", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "ویرایش وارفارین", exact: true })
    .click();
  await expect(page.locator("select,datalist")).toHaveCount(0);
  const quality = page.getByRole("combobox", {
    name: "کیفیت شواهد",
    exact: true,
  });
  await quality.click();
  await page.getByRole("option", { name: "پایین", exact: true }).click();
  await expect(quality).toContainText("پایین");
  await quality.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(quality).toHaveAttribute("aria-expanded", "false");
  const category = page.getByRole("combobox", {
    name: "گروه درمانی",
    exact: true,
  });
  await category.fill("گروه درمانی سفارشی");
  await expect(
    page.getByText("گزینه‌ای پیدا نشد.", { exact: false }),
  ).toBeVisible();
  await category.press("Tab");
  await expect(category).toHaveValue("گروه درمانی سفارشی");
  const target = page
    .getByRole("combobox", { name: "نام دارو یا کلاس هدف", exact: true })
    .first();
  await target.fill("واژه‌ای که هیچ گزینه‌ای ندارد");
  await expect(
    page.getByText("گزینه‌ای پیدا نشد.", { exact: false }),
  ).toBeVisible();
  await target.fill("Opioids");
  await page
    .getByRole("option", { name: "اپیوئیدها Opioids", exact: true })
    .click();
  await expect(target).toHaveValue("اپیوئیدها");
  await page
    .getByRole("button", { name: "افزودن بیماری", exact: true })
    .click();
  const disease = page
    .getByRole("combobox", { name: "بیماری یا سندرم", exact: true })
    .last();
  await disease.fill("نارسایی");
  await disease.press("ArrowDown");
  await disease.press("Enter");
  await expect(disease).toHaveValue("نارسایی قلبی");
  await disease.click();
  await page.screenshot({
    path: "artifacts/dropdown-admin.png",
    fullPage: true,
  });
  await disease.press("Escape");
  await page.getByRole("button", { name: "بستن پنجره" }).click();
  await page.getByRole("button", { name: "بستن بدون ذخیره" }).click();
});

test("custom dropdown stays in mobile viewport and passes accessibility", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#library");
  const specialty = page.getByRole("combobox", {
    name: "گروه درمانی",
    exact: true,
  });
  await specialty.click();
  const panel = page.locator(".choice-popover:popover-open");
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "artifacts/dropdown-mobile.png",
    fullPage: true,
  });
  await page.getByRole("option", { name: "گوارش", exact: true }).click();
  await expect(page.locator(".med-card")).toHaveCount(GI_COUNT);
});