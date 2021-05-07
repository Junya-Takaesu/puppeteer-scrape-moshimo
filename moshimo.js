const puppeteer = require('puppeteer');
const fs = require('fs');

const secret = require('./secret.json');
const puppeteer_config = require("./puppeteer_config.json");

const targetDomain = "https://af.moshimo.com";
let browser;
let page;

const setUpBrowser = async () => {
  const browser = await puppeteer.launch(puppeteer_config);
  const context = browser.defaultBrowserContext();
  // ブラウザからの API の使用許可のポップアップを無効化 (notificationとか)
  context.overridePermissions(targetDomain, []);
  return browser;
}

const login = async () => {
  const cookies = require('./cookies.json');

  if (Object.keys(cookies).length) {
    // await page.setCookie(...cookies); // cookie は期限切れの可能性あり
    return cookies;
  }

  const loginPageURL = `${targetDomain}/af/shop/login`;
  const loginFormAccount = 'input.input-text[name="account"]';
  const loginFormPassword = 'input.input-text[name="password"]';
  const loginButton = '[name="login"]';
  const userIconImage = '.shop-rank-image';

  await page.goto(loginPageURL);
  await page.waitForSelector(loginFormAccount);
  await page.type(loginFormAccount, secret.username, {delay: 30});
  await page.type(loginFormPassword, secret.password, {delay: 30});
  await page.click(loginButton, {delay: 30});
  await page.waitForSelector(userIconImage);

  const currentCookies = await await page.cookies();

  fs.writeFileSync('./cookies.json', JSON.stringify(currentCookies));

  return currentCookies;
}

const scrapeAnchorTags = (cookies) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.keys(cookies).length) {
        await page.setCookie(...cookies); // cookie は期限切れの可能性あり
      }
      browser.close();
      return resolve();
    } catch (e) {
      browser.close();
      return reject(e);
    }
  });
}

const main = async() => {
  browser = await setUpBrowser();
  page = await browser.newPage();

  const cookies = await login();

  await scrapeAnchorTags(cookies);
}

main()
  .then(() => {
    console.log("Done scraping successfully");
  })
  .catch( e => {
    console.log(e);
  })