import { describe, expect, it } from "vitest";
import {
  resolveLocalAuthDeployment,
  resolveLocalAuthRunnerConfig,
} from "./playwright-local-auth-config";

describe("playwright local-auth runner config", () => {
  it("keeps frontend dev auth disabled for public smoke while preserving authenticated modes", () => {
    expect(resolveLocalAuthRunnerConfig({}, ["--smoke"]).frontendDevAuth).toBe("0");
    expect(
      resolveLocalAuthRunnerConfig({ VITE_ENABLE_DEV_AUTH: "1" }, ["--smoke"]).frontendDevAuth,
    ).toBe("0");
    expect(resolveLocalAuthRunnerConfig({}).frontendDevAuth).toBe("1");
    expect(resolveLocalAuthRunnerConfig({}, ["--http"]).frontendDevAuth).toBe("1");
  });

  it("runs both public smoke files without changing their native retries", () => {
    expect(resolveLocalAuthRunnerConfig({}, ["--smoke"])).toMatchObject({
      mode: "smoke",
      playwrightArgs: [
        "--project=chromium",
        "e2e/ci-smoke.pw.test.ts",
        "e2e/public-routes-smoke.pw.test.ts",
      ],
    });
    expect(resolveLocalAuthRunnerConfig({}, ["--", "--smoke"]).mode).toBe("smoke");
    expect(() => resolveLocalAuthRunnerConfig({}, ["--smoke", "--retries=0"])).toThrow(
      "does not accept Playwright arguments",
    );
  });

  it("selects the real local HTTP harness without accepting browser arguments", () => {
    expect(resolveLocalAuthRunnerConfig({}, ["--http"]).mode).toBe("http");
    expect(resolveLocalAuthRunnerConfig({}, ["--", "--http"]).mode).toBe("http");
    expect(resolveLocalAuthRunnerConfig({}).mode).toBe("playwright");
    expect(() => resolveLocalAuthRunnerConfig({}, ["--http", "--project=chromium"])).toThrow(
      "does not accept Playwright arguments",
    );
  });

  it("defaults local-auth Convex to the anonymous deployment marker", () => {
    expect(resolveLocalAuthDeployment(undefined, null)).toBe("anonymous:anonymous-agent");
    expect(resolveLocalAuthDeployment(undefined, undefined)).toBe("anonymous:anonymous-agent");
  });

  it("prefers explicit and discovered local-auth deployments before the default", () => {
    expect(resolveLocalAuthDeployment("anonymous:explicit-agent", "anonymous:local-agent")).toBe(
      "anonymous:explicit-agent",
    );
    expect(resolveLocalAuthDeployment(undefined, "anonymous:local-agent")).toBe(
      "anonymous:local-agent",
    );
  });

  it("does not inherit the generic CI Convex URL", () => {
    expect(
      resolveLocalAuthRunnerConfig({
        VITE_CONVEX_URL: "https://example.invalid",
        VITE_CONVEX_SITE_URL: "https://example.invalid",
      }),
    ).toMatchObject({
      convexSiteUrl: "http://127.0.0.1:3211",
      convexUrl: "http://127.0.0.1:3210",
    });
  });

  it("uses local-auth-specific Convex URL overrides", () => {
    expect(
      resolveLocalAuthRunnerConfig({
        PLAYWRIGHT_LOCAL_AUTH_CONVEX_SITE_URL: "http://127.0.0.1:4311",
        PLAYWRIGHT_LOCAL_AUTH_CONVEX_URL: "http://127.0.0.1:4310",
      }),
    ).toMatchObject({
      convexSiteUrl: "http://127.0.0.1:4311",
      convexUrl: "http://127.0.0.1:4310",
    });
  });

  it("passes explicit Playwright args and defaults to the local-auth suite", () => {
    expect(resolveLocalAuthRunnerConfig({}, ["--", "e2e/example.pw.test.ts"])).toMatchObject({
      playwrightArgs: ["--retries=1", "e2e/example.pw.test.ts"],
    });
    expect(resolveLocalAuthRunnerConfig({}).playwrightArgs).toEqual([
      "--retries=1",
      "--project=chromium",
      "e2e/local-auth",
    ]);
  });

  it("preserves an explicit Playwright retries override", () => {
    expect(
      resolveLocalAuthRunnerConfig({}, ["--", "--retries=0", "e2e/example.pw.test.ts"]),
    ).toMatchObject({
      playwrightArgs: ["--retries=0", "e2e/example.pw.test.ts"],
    });
    expect(
      resolveLocalAuthRunnerConfig({}, ["--", "--retries", "2", "e2e/example.pw.test.ts"]),
    ).toMatchObject({
      playwrightArgs: ["--retries", "2", "e2e/example.pw.test.ts"],
    });
  });
});
