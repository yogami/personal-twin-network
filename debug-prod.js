
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    console.log('Navigating to https://personal-twin-network-production.up.railway.app/dashboard');

    // Go to Dashboard directly
    await page.goto('https://personal-twin-network-production.up.railway.app/dashboard');

    // Wait a bit for JS execution
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page Title:', title);

    const content = await page.content();
    console.log('Page Content Length:', content.length);

    // Check for specific texts
    const hasAnna = content.includes('Anna');
    const hasMax = content.includes('Max');
    console.log('Contains Anna:', hasAnna);
    console.log('Contains Max:', hasMax);

    // Check for loading spinner or error text
    const isLoading = content.includes('loading-screen');
    console.log('Is Loading:', isLoading);

    // Take a screenshot (optional, but good for debug if we could see it, here we rely on logs)
    // Check visible text
    const bodyText = await page.innerText('body');
    console.log('Body Text Preview:', bodyText.substring(0, 500).replace(/\n/g, ' '));

    await browser.close();
})();
