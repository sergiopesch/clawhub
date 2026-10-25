import { expect, test } from "@playwright/test";
import { stubExternalMediaInVitePreview } from "./helpers/externalMedia";
import { expectHealthyPage, trackRuntimeErrors, waitForHydration } from "./helpers/runtimeErrors";
import { routeVercelProtectionBypass } from "./helpers/vercelProtection";

test("SSR bootstrap scripts share one fresh response CSP nonce", async ({ context }) => {
  const nonces = await Promise.all(
    [0, 1].map(async () => {
      const page = await context.newPage();
      await routeVercelProtectionBypass(page);
      try {
        const response = await page.goto("/settings", { waitUntil: "domcontentloaded" });
        if (!response) throw new Error("Missing settings SSR response");
        expect(response.ok()).toBe(true);
        const csp = response.headers()["content-security-policy"] ?? "";
        const scriptPolicy = /(?:^|;)\s*(script-src\s[^;]*)/.exec(csp)?.[1] ?? "";
        expect(scriptPolicy).not.toContain("'unsafe-inline'");
        const nonce = /'nonce-([^']+)'/.exec(scriptPolicy)?.[1];
        expect(nonce).toBeTruthy();
        const bootstrapScriptNonces = await page.evaluate(
          (html) => {
            const document = new DOMParser().parseFromString(html, "text/html");
            return Array.from(document.querySelectorAll("script:not([src])"))
              .filter((script) => {
                const type = (script.getAttribute("type") ?? "").trim().toLowerCase();
                return (
                  Boolean(script.textContent?.trim()) &&
                  (type === "" || type === "module" || /(?:java|ecma)script/.test(type))
                );
              })
              .map((script) => script.getAttribute("nonce"));
          },
          await response.text(),
        );
        expect(bootstrapScriptNonces.length).toBeGreaterThan(0);
        for (const scriptNonce of bootstrapScriptNonces) {
          expect(scriptNonce).toBe(nonce);
        }
        await waitForHydration(page);
        return nonce;
      } finally {
        await page.close();
      }
    }),
  );

  expect(nonces[0]).not.toBe(nonces[1]);
});

test("public navigation routes render without runtime errors", async ({ browser }) => {
  const routes = [
    { path: "/skills", heading: "Skills" },
    { path: "/plugins", heading: "Plugins" },
  ];

  for (const route of routes) {
    const page = await browser.newPage();
    await routeVercelProtectionBypass(page);
    await stubExternalMediaInVitePreview(page);
    const errors = trackRuntimeErrors(page);

    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1", { hasText: route.heading })).toBeVisible();
    await expectHealthyPage(page, errors);
    await page.close();
  }
});

test("signed-out publish entry renders", async ({ page }) => {
  await routeVercelProtectionBypass(page);
  await stubExternalMediaInVitePreview(page);
  const errors = trackRuntimeErrors(page);

  await page.goto("/upload", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/skills\/publish$/);
  await expect(page.getByText("Sign in to publish a skill")).toBeVisible();
  await expectHealthyPage(page, errors);
});
