const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const secret = require('./secret.json');
const puppeteer_config = require("./puppeteer_config.json");

const targetDomain = "https://af.moshimo.com";
const snippetsDir = `snippets-${new Date().toISOString()}`;

const setUpBrowser = async () => {
  const browser = await puppeteer.launch(puppeteer_config);
  const context = browser.defaultBrowserContext();
  // ブラウザからの API の使用許可のポップアップを無効化 (notificationとか)
  context.overridePermissions(targetDomain, []);
  return browser;
}

const login = async (page) => {
  const cookies = require('./cookies.json');

  if (Object.keys(cookies).length) {
    console.log("Preexisting cookies found, skip log in");
    return cookies; //cookie は期限切れの可能性あり
  }

  console.log(`Logging into ${targetDomain}`);

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
  console.log(`Logged into ${targetDomain}`);
  return currentCookies;
}

const generateHTML = async (searchWord, htmlSnippets) => {
  let html = "";
  htmlSnippets.forEach((snippet) => {
    html += `
      <div class="text-center me-2 mb-2 d-inline-block shadow-lg rounded border border-3">
        ${snippet}
      </div>
    `;
  });
  await fs.promises.writeFile(`${snippetsDir}/_${searchWord}.html`, html);
  console.log(`Generated: ${snippetsDir}/_${searchWord}.html`);
}

const scrapeBySearchWord = (browser, page, searchWord, cookies, limit = 5) => {
  const htmlSnippets = [];
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.keys(cookies).length) {
        await page.setCookie(...cookies); // cookie は期限切れの可能性あり
      } else {
        return reject("Cookies MUST be provided to search the website.");
      }

      await page.goto(`${targetDomain}/af/shop/promotion/source/rakuten?promotion_id=54&shop_site_id=398848`, { waitUntil: "networkidle2" });
      await page.waitForSelector(".red.bold");
      await page.evaluate(() => document.querySelector('.search-text').value = "");
      await page.type(".search-text", searchWord);
      await page.click('#search-submit-button');
      await page.waitForSelector(".red.bold");

      for(let i = 1; i <= limit; i++) {
        await page.click(`.result-item-list .result-item:nth-child(${i}) .result-preview img`);
        await page.click('#preview-type-2');
        htmlSnippets.push(await page.evaluate(async () => {
          return document.querySelector('#active-preview-box .preview-source').value
        }));
        await page.waitForSelector("#fancybox-close", {visible: true})
        await page.click("#fancybox-close");
        await page.waitForSelector('#fancybox-overlay', {hidden: true});
        console.log(`Scraped ${i}/${limit} for ${searchWord}`);
      }
      generateHTML(searchWord, htmlSnippets);
      browser.close();
      return resolve();
    } catch (e) {
      browser.close();
      return reject(e);
    }
  });
}

const scrapeSnippets = async(searchWord) => {
  console.log(`Start scraping for ${searchWord}`);

  const browser = await setUpBrowser();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  const cookies = await login(page);
  await scrapeBySearchWord(browser, page, searchWord, cookies);
  console.log(`Ended scraping for ${searchWord}`);
}

const main = () => {

  const keywords = ["ruby", "php", "python","javascript", "ruby on rails", "css", "linux", "docker", "react.js", "vue.js", "node.js"];

  fs.mkdir(path.join(__dirname, snippetsDir), err => {
    if(err) throw err;
    console.log(`Created a directory called "${snippetsDir}"`);
  });

  const promises = keywords.map(keyword => {
    return new Promise(async (resolve, reject) => {
      try {
        await scrapeSnippets(keyword);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  Promise.all(promises)
    .then(() => {
      console.log("Done successfully");
    })
    .catch(e => {
      console.error(e);
    });
}

main();