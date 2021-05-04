const puppeteer = require('puppeteer');
const fs = require('fs');

const config = require('./config.json');
const cookies = require('./cookies.json');

const puppeteer_config = {
  headless: false,
  defaultViewport: null,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--start-maximized'
  ]
};

const setUpBrowser = async () => {
  const browser = await puppeteer.launch(puppeteer_config);
  const context = browser.defaultBrowserContext();
  // ブラウザからの API の使用許可のポップアップを無効化 (notificationとか)
  context.overridePermissions("https://af.moshimo.com/", []);
  return browser;
}

const login = async () => {
  const loginPageURL = "https://af.moshimo.com/af/shop/login";
  const loginFormAccount = 'input.input-text[name="account"]';
  const loginFormPassword = 'input.input-text[name="password"]';
  const loginButton = '[name="login"]';
  const userIconImage = '.shop-rank-image';

  await page.goto(loginPageURL);
  await page.waitForSelector(loginFormAccount);
  await page.type(loginFormAccount, config.username, {delay: 30});
  await page.type(loginFormPassword, config.password, {delay: 30});
  await page.click(loginButton, {delay: 30});
  await page.waitForNavigation({waitUntil: "networkidle0"}); // これが無いと・・・？
  await page.waitForSelector(userIconImage);

  const currentCookies = await page.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(currentCookies));

  return;
}

// ---------------------------------------------------------------------- //

let browser;
let page;

const main = () => {

  return new Promise(async (resolve, reject) => {
    browser = await setUpBrowser();
    page = await browser.newPage();

    const keywords = ["ruby on rails"];

    try {
      if (!Object.keys(cookies).length) {
        await login();
      } else {
        await page.setCookie(...cookies); // cookie は期限切れの可能性あり
      }

      return resolve(browser);
    } catch (e) {
      return reject([e, browser]);
    }
  });
}

main()
  .then(browser => {
    console.log("Done successfully");
    browser.close();
  })
  .catch(([e, browser]) => {
    console.error(e);
    browser.close();
  });