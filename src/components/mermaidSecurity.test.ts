/* @vitest-environment node */

import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type MathRenderer = {
  renderToString(source: string, options: Record<string, unknown>): string;
};

const require = createRequire(import.meta.url);
const mermaidPackage = require.resolve("mermaid/package.json");
const mermaidRequire = createRequire(mermaidPackage);
const coreMathPath = mermaidRequire.resolve("katex/dist/katex.mjs");
const bundledMathDirectory = join(dirname(mermaidPackage), "dist/chunks/mermaid.esm.min");
const bundledMathFile = (await readdir(bundledMathDirectory)).find((name) =>
  /^katex-.*\.mjs$/.test(name),
);
if (!bundledMathFile) throw new Error("Mermaid browser math chunk was not found");

// The app bundles Mermaid's core entry and its KaTeX dependency. Check the
// upstream prebuilt browser copy too, which dependency overrides cannot replace.
const renderers = await Promise.all(
  [coreMathPath, join(bundledMathDirectory, bundledMathFile)].map(async (filename) => {
    const module = (await import(/* @vite-ignore */ pathToFileURL(filename).href)) as {
      default: MathRenderer;
    };
    return module.default;
  }),
);

describe.each(
  renderers.map((renderer, index) => ({
    name: index === 0 ? "app-resolved math" : "prebuilt browser math",
    renderer,
  })),
)("Mermaid $name", ({ renderer }) => {
  it.each([true, () => true])("rejects inherited trust permission %s", (trust) => {
    const options = Object.assign(Object.create({ trust }), { throwOnError: false });
    for (const source of ["\\href{javascript:alert(1)}{click}", "\\url{javascript:alert(1)}"]) {
      expect(renderer.renderToString(source, options)).not.toContain('href="javascript:');
    }
  });

  it("keeps ordinary mathematics available", () => {
    const output = renderer.renderToString("\\frac{x^2}{y}", { trust: false });
    expect(output).toContain("katex");
    expect(output).toContain("<math");
  });
});
