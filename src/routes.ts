import { createPlaywrightRouter, sleep } from "crawlee";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, enqueueLinks, log }) => {
  await page.waitForSelector("div[role=listitem]");
  log.info(`enqueueing new URLs`);
  await enqueueLinks({
    globs: ["https://comic.pixiv.net/viewer/stories/**"],
    label: "detail",
  });
});

router.addHandler("detail", async ({ request, page, log }) => {
  // picture size 722 x 1024
  await page.setViewportSize({ width: 1444, height: 1024 });

  // wait page loading
  log.debug(`wait page loading...`);
  await page.locator("#page-1").waitFor({ state: "attached" });

  // wait close page layout notice
  log.debug(`wait close page layout notice...`);
  await page
    .locator("span", { hasText: /(縦|横)読み/ })
    .waitFor({ state: "detached" });

  // when menu is open, close it
  log.debug(`when menu is open, close it...`);
  const target = page.locator(".fixed.top-0.left-0.w-screen");
  if (await target.isVisible()) {
    // click page center
    await page.mouse.click(722, 500, { delay: 50 });
    await target.waitFor({ state: "detached" });
  }

  const title = await page.title();
  const subTitle = title.split("|")[0].trim();
  const seriesTitle = title.split("|")[1].split("-")[0].trim();
  const stories = request.loadedUrl?.split("/").pop() ?? "";
  log.info(`${seriesTitle}/${stories}-${subTitle}`, { url: request.loadedUrl });

  const directory = `${process.argv[2]}-${seriesTitle}/${stories}-${subTitle}`;

  try {
    for (let i = 0; true; i++) {
      if (!existsSync(directory)) {
        await mkdir(directory, { recursive: true });
      }
      if (!existsSync(`${directory}/page-${i}.png`)) {
        const bgUrl = page.locator(`#page-${i}`);
        const loading = bgUrl.locator("div");
        if (await loading.isVisible()) {
          log.debug(`wait image loading...`);
          await loading.waitFor({ state: "detached" });
        }
        const buf = await bgUrl.screenshot();
        await writeFile(`${directory}/page-${i}.png`, buf);
      }
    }
  } catch (e) {
    log.info(`${e}`);
  }
});
