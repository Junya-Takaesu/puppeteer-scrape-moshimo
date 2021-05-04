const puppeteer = require('puppeteer');
const fs = require('fs');

const config = require('./config.json');
const cookies = require('./cookies.json');

(async () => {
  let browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions("https://af.moshimo.com/", []); // ブラウザからの API の使用許可のポップアップを無効化 ex: notificationとか

  let page = await browser.newPage();

  try {
    if (!Object.keys(cookies).length) {
      await page.goto("https://af.moshimo.com/af/shop/login");
      await page.waitForSelector('input.input-text[name="account"]');
      await page.type('input.input-text[name="account"]', config.username, {delay: 30});
      await page.type('input.input-text[name="password"]', config.password, {delay: 30});
      await page.click('[name="login"]', {delay: 30});
      await page.waitForNavigation({waitUntil: "networkidle0"});
      await page.waitForSelector('.shop-rank-image');
      let currentCookies = await page.cookies();
      fs.writeFileSync('./cookies.json', JSON.stringify(currentCookies));
    } else {
      await page.setCookie(...cookies); // cookie は期限切れの可能性あり
    }
    await page.goto("https://af.moshimo.com/af/shop/promotion/source/rakuten?promotion_id=54&shop_site_id=398848", { waitUntil: "networkidle2" });
    await page.waitForSelector(".red.bold");
    await page.type('.search-text', "hoge");
    await page.evaluate(async () => {
      const searchTextBox = document.querySelector('.search-text');
      searchTextBox.value = "ruby on rails";
      return;
    });
    await page.click('#search-submit-button');
    await page.waitForSelector(".red.bold");

    let advertising_items_max = 4;
    await page.click('.result-item-list .result-item:nth-child(2) .result-preview img');
    await page.click('#preview-type-2');
    let htmlSnippet = await page.evaluate(async () => {
      return document.querySelector('#active-preview-box .preview-source').value
    });

    console.log(htmlSnippet);

    // browser.close();
  } catch (e) {
    browser.close();
  }
})();