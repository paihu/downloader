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
  // wait page loading
  log.debug(`wait page loading...`);
  await page.locator("#page-1").waitFor({ state: "attached" });

  const title = await page.title();
  const subTitle = title.split("|")[0].trim();
  const seriesTitle = title.split("|")[1].split("-")[0].trim();
  const stories = request.loadedUrl?.split("/").pop() ?? "";
  log.info(`${seriesTitle}/${stories}-${subTitle}`, { url: request.loadedUrl });

  const directory = `storage/${process.argv[2]}-${seriesTitle}/${stories}-${subTitle}`;

  const client = await page.context().newCDPSession(page);
  await client.send("Page.enable");
  const tree = await client.send("Page.getResourceTree");

  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }

  try {
    for (let i = 0; true; i++) {
      if (!existsSync(`${directory}/page-${i}.png`)) {
        const bgUrl = page.locator(`#page-${i}`);
        const loading = bgUrl.locator("div");
        if (await loading.isVisible()) {
          log.debug(`wait image loading...`);
          await loading.waitFor({ state: "detached" });
        }
        const blobUrl = await bgUrl.evaluate((e) => {
          // background-image: url("blob:https://...")
          return window.getComputedStyle(e).backgroundImage.split('"')[1];
        });

        if (!blobUrl.startsWith("blob")) {
          if (i === 0) {
            continue;
          }
          break;
        }
        const { content } = await client.send("Page.getResourceContent", {
          frameId: tree.frameTree.frame.id,
          url: blobUrl,
        });
        const buf = Buffer.from(content, "base64");
        await writeFile(`${directory}/page-${i}.png`, buf, "base64");
      }
    }
  } catch (e) {
    log.debug(`${e}`);
  }
});
