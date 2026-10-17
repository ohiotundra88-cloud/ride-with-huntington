import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Every page renders inside the root layout, which owns the one <main> landmark.
// A <main> anywhere else in src/ would nest a second landmark inside it.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts|jsx|js)$/.test(name) ? [path] : [];
  });
}

test("only the root layout renders a <main> element", () => {
  const offenders = sourceFiles("src").filter(
    (file) => /<main[\s>]/.test(readFileSync(file, "utf8")) && !file.endsWith("__root.tsx"),
  );
  assert.deepEqual(offenders, []);
});

test("the root layout has exactly one <main> and a skip link that targets it", () => {
  const root = readFileSync("src/routes/__root.tsx", "utf8");
  assert.equal(root.match(/<main[\s>]/g)?.length, 1);
  assert.match(root, /<main id="main-content"/);
  assert.match(root, /href="#main-content"/);
});
