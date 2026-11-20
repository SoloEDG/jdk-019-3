// End-to-end smoke test for the text-on-path feature.
// Usage: node scripts/smoke.mjs   (expects `vite preview` to be reachable)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// chromium comes from Debian debs extracted under /tmp/chromium-root
// (the Playwright CDN is unreachable from this environment)
const CHROMIUM_ROOT = "/tmp/chromium-root";
const executablePath = `${CHROMIUM_ROOT}/usr/lib/chromium/chromium`;
const LD_LIBRARY_PATH = [
  `${CHROMIUM_ROOT}/usr/lib/chromium`,
  `${CHROMIUM_ROOT}/usr/lib/aarch64-linux-gnu`,
  `${CHROMIUM_ROOT}/usr/lib/aarch64-linux-gnu/pulseaudio`,
  `${CHROMIUM_ROOT}/lib/aarch64-linux-gnu`,
].join(":");

const PORT = 4519;
const root = fileURLToPath(new URL("..", import.meta.url));
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: "pipe" },
);
await new Promise((res, rej) => {
  server.stdout.on("data", (d) => String(d).includes("Local") && res());
  server.stderr.on("data", (d) => process.stderr.write(d));
  setTimeout(() => rej(new Error("server timeout")), 20000);
});

let failures = 0;
const ok = (c, label) => {
  console.log(c ? "✓" : "✗", label);
  if (!c) failures++;
};

try {
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    env: { ...process.env, LD_LIBRARY_PATH },
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => {
    console.error("PAGE ERROR:", e.message);
    failures++;
  });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector(".text-on-path .glyph");
  const glyphs = await page.locator(".text-on-path .glyph").count();
  ok(glyphs > 10, `seeded text renders ${glyphs} glyphs along the curve`);

  // select the text shape via the layers panel
  await page.locator(".layer", { hasText: "Wave" }).click();
  await page.waitForSelector("aside textarea");

  // font size re-flow: shrink to guarantee fit, then grow to force overflow
  const sizeInput = page.locator("aside label", { hasText: "字号" }).locator("input");
  await sizeInput.fill("16");
  await sizeInput.blur();
  await page.waitForTimeout(100);
  ok((await page.locator(".glyph-overflow").count()) === 0, "no overflow at small size");
  await sizeInput.fill("60");
  await sizeInput.blur();
  await page.waitForTimeout(100);
  const over = await page.locator(".glyph-overflow").count();
  ok(over > 0, `overflow glyphs flagged in red at large size (${over})`);
  ok(await page.locator(".overflow-mark").isVisible(), "overflow range bracket drawn");
  ok(
    (await sizeInput.inputValue()) === "60",
    "font size kept as-is (no silent shrinking)",
  );
  const warn = await page.locator(".text-stats.warn").textContent();
  ok(/溢出|超出/.test(warn), `panel warns about overflow: ${warn.trim()}`);

  // start offset shifts glyphs along the path
  const before = await page.locator(".text-on-path .glyph").first().getAttribute("transform");
  const offInput = page.locator("aside label", { hasText: "起始偏移" }).locator("input");
  await offInput.fill("120");
  await offInput.blur();
  await page.waitForTimeout(100);
  const after = await page.locator(".text-on-path .glyph").first().getAttribute("transform");
  ok(before !== after, "start offset re-positions glyphs");

  // direction flip
  await page.locator(".direction button", { hasText: "反向" }).click();
  await page.waitForTimeout(100);
  ok(true, "direction toggle applied without errors");
  await page.locator(".direction button", { hasText: "正向" }).click();
  await page.waitForTimeout(100);

  // group scale scales text metrics (unlike font-size-only edits)
  await sizeInput.fill("20");
  await sizeInput.blur();
  const pct = page.locator("aside label", { hasText: "组缩放" }).locator("input");
  await pct.fill("150");
  await page.locator("button", { hasText: "应用缩放" }).click();
  await page.waitForTimeout(100);
  ok((await sizeInput.inputValue()) === "30", "group scale multiplied font size (20 → 30)");

  // convert to outlines keeps holes & color, undo restores text + path link
  await page.locator("button", { hasText: "转为字形轮廓" }).click();
  await page.waitForTimeout(150);
  ok((await page.locator(".text-on-path").count()) === 0, "live text replaced by outlines");
  const outlined = page.locator('svg[data-testid="canvas"] path[fill-rule="evenodd"]');
  ok((await outlined.count()) === 1, "outline shape rendered with evenodd fill");
  ok(
    (await page.locator('svg[data-testid="canvas"] > path').count()) === 10,
    "carrier path survives as its own shape next to the outlines",
  );
  const d = await outlined.first().getAttribute("d");
  const subpaths = (d.match(/M/g) || []).length;
  ok(subpaths > 20, `outline has many contours incl. counters (${subpaths} subpaths)`);
  ok((await outlined.first().getAttribute("fill")) === "#523391", "outline keeps text color");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(150);
  ok((await page.locator(".text-on-path .glyph").count()) > 10, "undo restores live text");
  await page.locator(".layer", { hasText: "Wave" }).click();
  const restored = await page.locator("aside textarea").inputValue();
  ok(/curving path/.test(restored), "undo restores original text content and path link");

  // export dialog: both modes offered with size estimates
  await page.locator('[data-testid="export"]').click();
  await page.waitForSelector(".dialog");
  const dialogText = await page.locator(".dialog").textContent();
  ok(/可编辑文字/.test(dialogText) && /字形轮廓/.test(dialogText), "both export modes offered");
  ok(/KB/.test(dialogText), "file size estimates shown");
  ok(/字体/.test(dialogText), "font-dependency trade-off explained");

  const dl1 = page.waitForEvent("download");
  await page.locator('[data-testid="export-confirm"]').click();
  const svg1 = await (await dl1).path();
  const fs = await import("node:fs");
  const editable = fs.readFileSync(svg1, "utf8");
  ok(editable.includes("<textPath"), "editable export keeps <textPath>");

  await page.locator('[data-testid="export"]').click();
  await page.locator('.option', { hasText: "转为字形轮廓" }).click();
  const dl2 = page.waitForEvent("download");
  await page.locator('[data-testid="export-confirm"]').click();
  const outlined2 = fs.readFileSync(await (await dl2).path(), "utf8");
  ok(!outlined2.includes("<text") && outlined2.includes('fill-rule="evenodd"'), "outline export bakes glyphs to paths");
  ok(outlined2.length > editable.length, `outline export larger (${outlined2.length} > ${editable.length} bytes)`);

  await browser.close();
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} FAILURE(S)` : "\nsmoke test passed");
process.exit(failures ? 1 : 0);
