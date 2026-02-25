const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
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

  const browser = await chromium.launch({ headless: true });

  async function inspect(contextName, contextOptions) {
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
          const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: text(a), href: a.getAttribute('href') || ''
          }));
          const nav = Array.from(document.querySelectorAll('header a[href], nav a[href]')).map(a => ({
            text: text(a), href: a.getAttribute('href') || ''
          }));
          const h1 = Array.from(document.querySelectorAll('h1')).map(text).filter(Boolean);
          const h2 = Array.from(document.querySelectorAll('h2')).map(text).filter(Boolean);
          const buttons = Array.from(document.querySelectorAll('button,[role="button"],a')).map(el => text(el)).filter(Boolean);

          const bodyStyle = getComputedStyle(document.body);
          const rootStyle = getComputedStyle(document.documentElement);

          const candidateCta = Array.from(document.querySelectorAll('button, a')).find(el => {
            const t = text(el).toLowerCase();
            return ['start', 'get started', 'join', 'login', 'sign up', 'try for free', 'start learning', 'subscribe'].some(k => t.includes(k));
          });
          const ctaStyle = candidateCta ? getComputedStyle(candidateCta) : null;

          const paint = performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: Math.round(p.startTime) }));
          const navTiming = performance.getEntriesByType('navigation')[0];

          return {
            title: document.title,
            location: location.href,
            metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
            headings: { h1, h2: h2.slice(0, 20) },
            counts: {
              links: document.querySelectorAll('a[href]').length,
              buttons: document.querySelectorAll('button,[role="button"]').length,
              inputs: document.querySelectorAll('input,select,textarea').length,
              images: document.querySelectorAll('img,svg').length
            },
            navigationItems: nav.slice(0, 30),
            topLinks: links.slice(0, 40),
            body: {
              fontFamily: bodyStyle.fontFamily,
              color: bodyStyle.color,
              backgroundColor: bodyStyle.backgroundColor,
              lineHeight: bodyStyle.lineHeight
            },
            rootVars: {
              darkblue: rootStyle.getPropertyValue('--darkblue').trim() || null,
              hackerGreen: rootStyle.getPropertyValue('--hacker-green').trim() || null,
              loggedOutBg: rootStyle.getPropertyValue('--logged-out-bg').trim() || null,
              navbarHeight: rootStyle.getPropertyValue('--navbar-main-height').trim() || null
            },
            cta: candidateCta ? {
              text: text(candidateCta),
              background: ctaStyle.backgroundColor,
              color: ctaStyle.color,
              borderRadius: ctaStyle.borderRadius,
              fontWeight: ctaStyle.fontWeight,
              padding: ctaStyle.padding
            } : null,
            paint,
            navTiming: navTiming ? {
              domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd),
              loadEventEnd: Math.round(navTiming.loadEventEnd),
              transferSize: navTiming.transferSize,
              encodedBodySize: navTiming.encodedBodySize
            } : null,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            hasThemeToggle: !!Array.from(document.querySelectorAll('button,[role="button"],a')).find(el => /theme|dark|light/i.test(text(el)))
          };
        });

        const totalTimeMs = Date.now() - start;
        results.push({ target: target.name, context: contextName, ...data, totalTimeMs, screenshot: shotPath });
      } catch (err) {
        results.push({ target: target.name, context: contextName, error: String(err) });
      } finally {
        await page.close();
      }
    }

    await context.close();
    return results;
  }

  const desktop = await inspect('desktop', { viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const mobile = await inspect('mobile', { ...devices['iPhone 13'], locale: 'fr-FR' });

  const combined = { generatedAt: new Date().toISOString(), desktop, mobile };
  fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify(combined, null, 2));
  console.log(path.join(outDir, 'audit.json'));

  await browser.close();
})();
