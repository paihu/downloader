import { createPlaywrightRouter, sleep } from "crawlee";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page,enqueueLinks, log }) => {
  await page.waitForSelector("div[role=listitem]")
  log.info(`enqueueing new URLs`);
  await enqueueLinks({
    globs: ["https://comic.pixiv.net/viewer/stories/**"],
    label: "detail",
  });
});

router.addHandler("detail", async ({ request, page, log }) => {
  page.setDefaultTimeout(1000);
  const title = await page.title();
  const subTitle = title.split("|")[0].trim();
  const seriesTitle = title.split("|")[1].split("-")[0].trim();
  const stories = request.loadedUrl?.split("/").pop() ?? "";
  log.info(`${seriesTitle}/${stories}-${subTitle}`, { url: request.loadedUrl });
  await sleep(5000);
  try {
    for (let i = 0; true; i++) {
      if (!existsSync(seriesTitle)) {
        await mkdir(seriesTitle);
      }
      if (!existsSync(`${seriesTitle}/${stories}-${subTitle}`)) {
        await mkdir(`${seriesTitle}/${stories}-${subTitle}`);
      }
      if (!existsSync(`${seriesTitle}/${stories}-${subTitle}/page-${i}.png`)) {
        const bgUrl = await page.locator(`#page-${i}`);
        const buf = await bgUrl.screenshot();
        await writeFile(
          `${seriesTitle}/${stories}-${subTitle}/page-${i}.png`,
          buf
        );
      }
    }
  } catch (e) {
    log.info(`${e}`);
  }
});
