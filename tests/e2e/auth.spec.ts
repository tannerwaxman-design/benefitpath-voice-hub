import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[id="company"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/");
    // Should redirect to login or welcome page
    await page.waitForURL(/\/(login|welcome)/);
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
  });
});

test.describe("Landing Page", () => {
  test("landing page loads with hero section", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.locator("text=BenefitPath")).toBeVisible();
  });

  test("landing page has pricing section", async ({ page }) => {
    await page.goto("/welcome");
    // Scroll to pricing or check it exists
    const pricingText = page.locator("text=Pricing");
    await expect(pricingText.first()).toBeVisible();
  });
});

test.describe("Public Pages", () => {
  test("privacy policy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("text=Privacy")).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("text=Terms")).toBeVisible();
  });

  test("404 page shows for invalid routes", async ({ page }) => {
    await page.goto("/invalid-route-xyz");
    await expect(page.locator("text=404").or(page.locator("text=Not Found"))).toBeVisible();
  });
});
