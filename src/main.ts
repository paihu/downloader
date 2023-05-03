// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";
import { router } from "./routes.js";
import { chromium } from "playwright";

const startUrls = ["https://comic.pixiv.net/works/XXX"];

const crawler = new PlaywrightCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
  launchContext: {
    launcher: chromium,
  },
});

await crawler.run(startUrls);
