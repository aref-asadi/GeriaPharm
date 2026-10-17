import { test, expect, type Page } from "@playwright/test";
const email = "qa@example.test",
  password = "QA-only-password-59842!";
const MOBILE = { width: 390, height: 844 };

async function openSurvey(page: Page) {
  const trigger = page
    .getByRole("button", { name: "ارزیابی UMARS" })
    .filter({ visible: true });
  // On narrow viewports the sidebar is an off-canvas drawer (display:none menu button on desktop).
  const menu = page.getByRole("button", { name: "باز کردن فهرست" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.locator(".sidebar.is-open")).toBeVisible();
  }
  await trigger.first().click();
  await expect(page.getByRole("dialog", { name: "ارزیابی UMARS" })).toBeVisible();
}

test("mobile wizard asks demographics first, validates age and auto-advances", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  await openSurvey(page);

  // One question per screen: the demographics section comes first.
  await expect(
    page.getByRole("heading", { name: "سن خود را بر حسب سال وارد کنید (بین ۱۵ تا ۱۲۰ سال)." }),
  ).toBeVisible();
  await expect(page.getByRole("radiogroup")).toHaveCount(0);

  // An out-of-range age is reported and blocks the wizard.
  const age = page.getByLabel("سن", { exact: true });
  await age.fill("12");
  await expect(page.getByRole("alert")).toContainText("سن باید عددی بین");
  await expect(page.getByRole("button", { name: "بعدی" })).toBeDisabled();

  // Persian digits typed by the user are converted to ASCII on the way in.
  await age.fill("۳۲");
  await expect(age).toHaveValue("32");
  await expect(page.getByRole("button", { name: "بعدی" })).toBeEnabled();
  await page.keyboard.press("Enter");

  // Choosing an option advances to the next screen on its own.
  await expect(
    page.getByRole("heading", { name: "جنسیت خود را انتخاب کنید." }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "زن" }).check();
  await expect(
    page.getByRole("heading", { name: "شغل یا حرفه اصلی خود را انتخاب کنید." }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "داروساز" }).check();
  await expect(page.getByRole("heading", { name: /آیا استفاده از برنامه جالب است/ })).toBeVisible();

  // The progress strip follows the wizard and scrolls itself to the active chip.
  await expect(page.getByRole("tab", { name: /بخش A/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /بخش F/ }).click();
  await expect(page.getByRole("heading", { name: /این برنامه آگاهی من را/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /بخش F/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect
    .poll(() =>
      // RTL scroll containers report negative scrollLeft in Chromium.
      page.getByRole("tablist").evaluate((el) => Math.abs(el.scrollLeft)),
    )
    .toBeGreaterThan(0);
  const chipBox = await page.getByRole("tab", { name: /بخش F/ }).boundingBox();
  const listBox = await page.getByRole("tablist").boundingBox();
  expect(chipBox && listBox && chipBox.x >= listBox.x - 2).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/umars-mobile.png" });

  // Step back returns to the last question of the previous section.
  await page.getByRole("button", { name: "قبلی" }).click();
  await expect(
    page.getByRole("heading", { name: /امتیاز کلی ستاره‌ای/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("stores the response on the server and exports it for the admin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openSurvey(page);
  await page.getByLabel("سن", { exact: true }).fill("45");
  await page.keyboard.press("Enter");
  await page.getByRole("radio", { name: "مرد" }).check();
  await page.getByRole("radio", { name: "پزشک" }).check();
  await page.getByRole("radio", { name: /\(۵\) بسیار جالب/ }).check();
  await expect(
    page.getByRole("heading", { name: /آیا به شما امکان می‌دهد تنظیمات/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ثبت نهایی" }).click();
  await expect(
    page.getByRole("heading", { name: "از بازخورد ارزشمند شما سپاسگزاریم!" }),
  ).toBeVisible();
  // The local queue flushes automatically right after a successful submission.
  await expect(
    page.getByText("پاسخ‌های شما با موفقیت روی سرور ثبت شد"),
  ).toBeVisible();

  await page.getByRole("button", { name: "بازگشت به برنامه" }).click();
  await expect(
    page.getByRole("dialog", { name: "ارزیابی UMARS" }),
  ).toBeHidden();
  // A hash-only navigation keeps React state, hence closing the modal first.
  await page.goto("/#admin");
  await page.getByLabel("ایمیل مدیر").fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود امن" }).click();
  await openSurvey(page);
  await expect(page.getByText("۱ پاسخ روی سرور ثبت شده است")).toBeVisible();
  await expect(page.getByText(/۱ پاسخ در این مرورگر/)).toBeVisible();

  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "خروجی CSV (اکسل)" }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(
    /^geriapharm-umars-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "خروجی JSON" }).click(),
  ]);
  expect(json.suggestedFilename()).toBe(
    `geriapharm-umars-${new Date().toISOString().slice(0, 10)}.json`,
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "پاک کردن همه" }).click();
  await expect(page.getByText("۱ پاسخ از سرور پاک شد.")).toBeVisible();
  await expect(page.getByText("۰ پاسخ روی سرور ثبت شده است")).toBeVisible();
});
