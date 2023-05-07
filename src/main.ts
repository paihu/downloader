// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";
import { router } from "./routes.js";

const startUrls = [`https://comic.pixiv.net/works/${process.argv[2]}`];

const crawler = new PlaywrightCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
  autoscaledPoolOptions:{
    maxConcurrency: 4
  }
});

await crawler.run(startUrls);
