const { chromium, devices } = require('playwright');

(async() => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pages = [
    { name: 'login', url: 'https://tryhackme.com/login' },
    { name: 'signup', url: 'https://tryhackme.com/signup' },
    { name: 'home', url: 'https://tryhackme.com/' },
    { name: 'pricing', url: 'https://tryhackme.com/r/pricing' },
  ];

  for (const p of pages) {
    const page = await context.newPage();
    await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

      const inputs = Array.from(document.querySelectorAll('input,select,textarea')).map(el => {
        const id = el.getAttribute('id');
        let labelText = '';
        if (id) {
          const l = document.querySelector(`label[for="${id}"]`);
          if (l) labelText = text(l);
        }
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) labelText = text(parentLabel);
        }
        return {
          type: el.getAttribute('type') || el.tagName.toLowerCase(),
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          label: labelText,
          required: el.required || el.getAttribute('aria-required') === 'true'
        };
      });

      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a')).map(el => {
        const t = text(el);
        if (!t) return null;
        return {
          text: t,
          role: el.tagName.toLowerCase(),
          href: el.getAttribute('href') || ''
        };
      }).filter(Boolean).slice(0, 40);

      const menuBtn = Array.from(document.querySelectorAll('button,[role="button"]')).find(el => /menu/i.test(text(el)) || el.getAttribute('aria-label')?.toLowerCase().includes('menu'));

      return {
        title: document.title,
        forms: document.querySelectorAll('form').length,
        inputs,
        buttons,
        hasAriaMenuButton: !!menuBtn,
        landmarks: {
          header: document.querySelectorAll('header').length,
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          footer: document.querySelectorAll('footer').length
        }
      };
    });

    console.log('PAGE=' + p.name);
    console.log(JSON.stringify(data));
    await page.close();
  }

  const mctx = await browser.newContext({ ...devices['iPhone 13'] });
  const mpage = await mctx.newPage();
  await mpage.goto('https://tryhackme.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await mpage.waitForTimeout(1200);
  const mobileNav = await mpage.evaluate(() => {
    const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const menuCandidates = Array.from(document.querySelectorAll('button,[role="button"]')).map(el => ({
      text: text(el),
      aria: el.getAttribute('aria-label') || '',
      className: el.className || ''
    }));
    return menuCandidates.slice(0,20);
  });
  console.log('PAGE=home-mobile-menu-candidates');
  console.log(JSON.stringify(mobileNav));

  await mctx.close();
  await context.close();
  await browser.close();
})();
