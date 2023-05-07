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
  page.setDefaultTimeout(1000);
  // picture size 722 x 1024
  await page.setViewportSize({ width: 1444, height: 1024 });

  const target = page.locator(".fixed.top-0.left-0.w-screen");
  if (await target.isVisible()) {
    await page
      .locator("div.h-full")
      .first()
      .click({ position: { x: 500, y: 722 } });
    await target.waitFor({ state: "detached" });
  }

  const title = await page.title();
  const subTitle = title.split("|")[0].trim();
  const seriesTitle = title.split("|")[1].split("-")[0].trim();
  const stories = request.loadedUrl?.split("/").pop() ?? "";
  log.info(`${seriesTitle}/${stories}-${subTitle}`, { url: request.loadedUrl });
  await sleep(5000);

  const directory = `${process.argv[2]}-${seriesTitle}/${stories}-${subTitle}`;

  try {
    for (let i = 0; true; i++) {
      if (!existsSync(directory)) {
        await mkdir(directory, { recursive: true });
      }
      if (!existsSync(`${directory}/page-${i}.png`)) {
        const bgUrl = await page.locator(`#page-${i}`);
        const buf = await bgUrl.screenshot();
        await writeFile(`${directory}/page-${i}.png`, buf);
      }
    }
  } catch (e) {
    log.info(`${e}`);
  }
});
