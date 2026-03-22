const puppeteer = require('puppeteer');
(async () => {
    let browser = await puppeteer.launch({ args: ['--enable-unsafe-webgpu']});
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('requestfailed', request => {
        console.log('404 URL:', request.url());
    });
    
    let fileUrl = 'http://127.0.0.1:8081/learning-neural-rendering/modules/01-ray-marching.html';
    console.log('Loading', fileUrl);
    await page.goto(fileUrl);
    
    await page.waitForSelector('#btn-compile');
    await page.click('#btn-compile');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();
})();
