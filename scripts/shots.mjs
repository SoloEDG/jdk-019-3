// Visual check: screenshot the seeded app, an overflow state, and outlines.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const CHROMIUM_ROOT = "/tmp/chromium-root";
const LD_LIBRARY_PATH = [
  `${CHROMIUM_ROOT}/usr/lib/chromium`,
  `${CHROMIUM_ROOT}/usr/lib/aarch64-linux-gnu`,
  `${CHROMIUM_ROOT}/usr/lib/aarch64-linux-gnu/pulseaudio`,
  `${CHROMIUM_ROOT}/lib/aarch64-linux-gnu`,
].join(":");

const PORT = 4521;
const root = fileURLToPath(new URL("..", import.meta.url));
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: "pipe" },
);
await new Promise((res) => {
  server.stdout.on("data", (d) => String(d).includes("Local") && res());
});
try {
  const browser = await chromium.launch({
    executablePath: `${CHROMIUM_ROOT}/usr/lib/chromium/chromium`,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    env: { ...process.env, LD_LIBRARY_PATH },
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector(".text-on-path .glyph");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/shot-seed.png" });

  // overflow state
  await page.locator(".layer", { hasText: "Wave" }).click();
  const sizeInput = page.locator("aside label", { hasText: "字号" }).locator("input");
  await sizeInput.fill("48");
  await sizeInput.blur();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/shot-overflow.png" });

  // convert to outlines
  await page.locator("button", { hasText: "转为字形轮廓" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/shot-outline.png" });

  // export dialog
  await page.keyboard.press("Control+z");
  await page.locator('[data-testid="export"]').click();
  await page.waitForSelector(".dialog");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "/tmp/shot-export.png" });

  await browser.close();
} finally {
  server.kill();
}
console.log("screenshots saved");
