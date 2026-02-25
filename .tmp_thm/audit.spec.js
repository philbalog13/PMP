const { test, chromium, devices } = require('playwright/test');
const fs = require('fs');
const path = require('path');

const outDir = 'c:/Users/ASUS-GEORGES-GXT/Downloads/PMP/.tmp_thm/playwright';
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'home', url: 'https://tryhackme.com/' },
  { name: 'pricing', url: 'https://tryhackme.com/r/pricing' },
  { name: 'login', url: 'https://tryhackme.com/login' },
  { name: 'signup', url: 'https://tryhackme.com/signup' },
  { name: 'blog', url: 'https://tryhackme.com/r/resources/blog' },
  { name: 'hacktivities', url: 'https://tryhackme.com/hacktivities' },
  { name: 'business', url: 'https://tryhackme.com/business' }
];

async function collectForContext(browser, contextName, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const results = [];

  for (const target of targets) {
    const page = await context.newPage();
    const start = Date.now();

    try {
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(2000);

      const shotPath = path.join(outDir, `${target.name}-${contextName}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      const data = await page.evaluate(() => {
        const getText = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

        const navItems = Array.from(document.querySelectorAll('header a[href], nav a[href]'))
          .map(a => ({ text: getText(a), href: a.getAttribute('href') || '' }))
          .filter(x => x.text || x.href)
          .slice(0, 40);

        const h1 = Array.from(document.querySelectorAll('h1')).map(getText).filter(Boolean);
        const h2 = Array.from(document.querySelectorAll('h2')).map(getText).filter(Boolean).slice(0, 25);

        const bodyStyle = getComputedStyle(document.body);
        const rootStyle = getComputedStyle(document.documentElement);

        const allCtas = Array.from(document.querySelectorAll('a, button')).map(el => {
          const text = getText(el);
          return { el, text, lower: text.toLowerCase() };
        }).filter(x => x.text.length > 0);

        const ctaCandidate = allCtas.find(x =>
          ['get started', 'start', 'join', 'sign up', 'try for free', 'subscribe', 'learn', 'start learning'].some(k => x.lower.includes(k))
        ) || allCtas[0];

        const ctaStyle = ctaCandidate ? getComputedStyle(ctaCandidate.el) : null;

        const paint = performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: Math.round(p.startTime) }));
        const nav = performance.getEntriesByType('navigation')[0];

        return {
          title: document.title,
          finalUrl: location.href,
          metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
          headings: { h1, h2 },
          counts: {
            links: document.querySelectorAll('a[href]').length,
            buttons: document.querySelectorAll('button,[role="button"]').length,
            forms: document.querySelectorAll('form').length,
            inputs: document.querySelectorAll('input,select,textarea').length,
            images: document.querySelectorAll('img,svg').length
          },
          navItems,
          cta: ctaCandidate ? {
            text: ctaCandidate.text,
            backgroundColor: ctaStyle.backgroundColor,
            color: ctaStyle.color,
            borderRadius: ctaStyle.borderRadius,
            fontWeight: ctaStyle.fontWeight,
            fontSize: ctaStyle.fontSize,
            padding: ctaStyle.padding
          } : null,
          bodyStyle: {
            fontFamily: bodyStyle.fontFamily,
            color: bodyStyle.color,
            backgroundColor: bodyStyle.backgroundColor,
            fontSize: bodyStyle.fontSize,
            lineHeight: bodyStyle.lineHeight
          },
          cssVars: {
            hackerGreen: rootStyle.getPropertyValue('--hacker-green').trim() || null,
            darkblue: rootStyle.getPropertyValue('--darkblue').trim() || null,
            loggedOutBg: rootStyle.getPropertyValue('--logged-out-bg').trim() || null,
            navbarMainHeight: rootStyle.getPropertyValue('--navbar-main-height').trim() || null
          },
          paint,
          timing: nav ? {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
            loadEventEnd: Math.round(nav.loadEventEnd),
            transferSize: nav.transferSize,
            encodedBodySize: nav.encodedBodySize
          } : null,
          hasThemeToggle: !!Array.from(document.querySelectorAll('button,a')).find(el => /theme|dark|light/i.test(getText(el))),
          hasSkipLink: !!Array.from(document.querySelectorAll('a[href]')).find(a => /^#/.test(a.getAttribute('href') || '') && /skip/i.test(getText(a)))
        };
      });

      results.push({
        target: target.name,
        context: contextName,
        totalTimeMs: Date.now() - start,
        screenshot: shotPath,
        ...data
      });
    } catch (e) {
      results.push({ target: target.name, context: contextName, error: String(e) });
    } finally {
      await page.close();
    }
  }

  await context.close();
  return results;
}

test('audit-ui-ux', async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await collectForContext(browser, 'desktop', { viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const mobile = await collectForContext(browser, 'mobile', { ...devices['iPhone 13'], locale: 'en-US' });
  await browser.close();

  const output = {
    generatedAt: new Date().toISOString(),
    desktop,
    mobile
  };

  const outFile = path.join(outDir, 'audit.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log('AUDIT_FILE=' + outFile);
});
