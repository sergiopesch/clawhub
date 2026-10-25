const DEFAULT_CONVEX_URL = "http://127.0.0.1:3210";
const DEFAULT_CONVEX_SITE_URL = "http://127.0.0.1:3211";
export const DEFAULT_LOCAL_AUTH_CONVEX_DEPLOYMENT = "anonymous:anonymous-agent";
const DEFAULT_PLAYWRIGHT_ARGS = ["--project=chromium", "e2e/local-auth"];
const PUBLIC_SMOKE_ARGS = [
  "--project=chromium",
  "e2e/ci-smoke.pw.test.ts",
  "e2e/public-routes-smoke.pw.test.ts",
];
const DEFAULT_PLAYWRIGHT_RETRIES = "1";

type RunnerEnv = Record<string, string | undefined>;

export type LocalAuthRunnerConfig = {
  mode: "playwright" | "http" | "smoke";
  frontendDevAuth: "0" | "1";
  convexDeployment: string | undefined;
  convexSiteUrl: string;
  convexUrl: string;
  playwrightArgs: string[];
};

function stripPackageManagerSeparator(args: string[]) {
  return args[0] === "--" ? args.slice(1) : args;
}

function withDefaultRetries(args: string[]) {
  if (args.some((arg) => arg === "--retries" || arg.startsWith("--retries="))) {
    return args;
  }
  return [`--retries=${DEFAULT_PLAYWRIGHT_RETRIES}`, ...args];
}

export function resolveLocalAuthDeployment(
  configuredDeployment: string | undefined,
  fallbackDeployment: string | null | undefined,
) {
  return configuredDeployment ?? fallbackDeployment ?? DEFAULT_LOCAL_AUTH_CONVEX_DEPLOYMENT;
}

export function resolveLocalAuthRunnerConfig(
  env: RunnerEnv = process.env,
  argv: string[] = process.argv.slice(2),
): LocalAuthRunnerConfig {
  const args = stripPackageManagerSeparator(argv);
  const mode = args[0] === "--http" ? "http" : args[0] === "--smoke" ? "smoke" : "playwright";
  if (mode !== "playwright" && args.length !== 1) {
    throw new Error(`The local ${mode} gate does not accept Playwright arguments`);
  }
  const playwrightArgs = mode === "playwright" ? args : [];
  return {
    mode,
    frontendDevAuth: mode === "smoke" ? "0" : "1",
    convexDeployment: env.PLAYWRIGHT_LOCAL_AUTH_CONVEX_DEPLOYMENT,
    convexSiteUrl: env.PLAYWRIGHT_LOCAL_AUTH_CONVEX_SITE_URL ?? DEFAULT_CONVEX_SITE_URL,
    convexUrl: env.PLAYWRIGHT_LOCAL_AUTH_CONVEX_URL ?? DEFAULT_CONVEX_URL,
    playwrightArgs:
      mode === "smoke"
        ? PUBLIC_SMOKE_ARGS
        : withDefaultRetries(playwrightArgs.length > 0 ? playwrightArgs : DEFAULT_PLAYWRIGHT_ARGS),
  };
}
