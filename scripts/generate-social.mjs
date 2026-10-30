import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const font = (await readFile(resolve('public/fonts/fraunces-latin.woff2'))).toString('base64');
  const bodyFont = (await readFile(resolve('public/fonts/dm-sans-latin.woff2'))).toString('base64');
  const hamster = await readFile(resolve('public/favicon.svg'), 'utf8');
  await page.setContent(`<!doctype html><html lang="en"><head><style>
    @font-face{font-family:Fraunces;src:url(data:font/woff2;base64,${font})} @font-face{font-family:DM;src:url(data:font/woff2;base64,${bodyFont})}
    *{box-sizing:border-box}body{margin:0;background:#f9f6ed;color:#342e26;font-family:DM,sans-serif;width:1200px;height:630px;padding:58px 68px;position:relative;overflow:hidden}
    header{display:flex;gap:14px;align-items:center;font-size:26px;font-weight:700}header svg{width:48px;height:48px}h1{font-family:Fraunces,serif;font-size:75px;line-height:1.06;letter-spacing:-3px;width:660px;margin:65px 0 22px;font-weight:700}p{font-size:25px;line-height:1.5;max-width:540px;color:#726858;margin:0}.tag{display:inline-flex;align-items:center;gap:24px;background:#b7442e;color:#fffaf0;font-weight:600;padding:16px 24px;border-radius:10px;font-size:23px;margin-top:30px}.scene{position:absolute;right:-75px;top:70px;transform:rotate(-8deg);width:500px;height:570px;border-radius:48%;background:#e0e7b9;border:12px solid #f1e3bc}footer{position:absolute;bottom:38px;left:68px;font-size:18px;color:#726858}
    </style></head><body><header>${hamster}Squeek Courier</header><h1>Small paws.<br>Big deliveries.</h1><p>A tiny seed delivery game,<br>in rhythm with a real hamster.</p><div class="tag">Play a little. Deliver a lot. <span>→</span></div>
    <svg class="scene" viewBox="0 0 500 570" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M-40 400C120 430 42 188 256 220S330 450 540 340" stroke="#f1e3bc" stroke-width="65"/><g fill="#afc386"><circle cx="68" cy="105" r="40"/><circle cx="410" cy="170" r="38"/><circle cx="88" cy="492" r="36"/></g><g fill="#8da465"><circle cx="40" cy="120" r="30"/><circle cx="390" cy="183" r="30"/><circle cx="68" cy="505" r="25"/></g><ellipse cx="256" cy="340" rx="85" ry="20" fill="#c4cc98"/><rect x="207" y="240" width="97" height="90" rx="7" fill="#fff4d6"/><path d="m189 248 67-60 69 60H189Z" fill="#bd6044"/><rect x="240" y="284" width="29" height="46" rx="14" fill="#91a471"/><g fill="#dabd76"><rect x="217" y="270" width="14" height="18" rx="3"/><rect x="280" y="270" width="14" height="18" rx="3"/></g><g transform="translate(241 421)"><ellipse cy="28" rx="50" ry="13" fill="#b4c291"/><rect x="-49" y="-6" width="35" height="37" rx="7" fill="#b0743a"/><ellipse rx="42" ry="40" fill="#d7aa70"/><circle cx="-26" cy="-33" r="15" fill="#c79865"/><circle cx="26" cy="-33" r="15" fill="#c79865"/><circle cx="-26" cy="-34" r="8" fill="#e8bea0"/><circle cx="26" cy="-34" r="8" fill="#e8bea0"/><ellipse cy="15" rx="33" ry="26" fill="#fff0d1"/><ellipse cx="-15" cy="-4" rx="4" ry="6" fill="#342e26"/><ellipse cx="15" cy="-4" rx="4" ry="6" fill="#342e26"/><ellipse cy="7" rx="6" ry="4" fill="#a36f54"/><path d="M0 11v9m-7 4 7-4 7 4" stroke="#a36f54" stroke-width="2" stroke-linecap="round"/></g><g fill="#efc65c" stroke="#ad7a2f" stroke-width="2"><path d="M130 217c-26 25-21 42 0 43 21-1 26-18 0-43Z" transform="rotate(-25 130 240)"/><path d="M374 380c-26 25-21 42 0 43 21-1 26-18 0-43Z" transform="rotate(35 374 400)"/><path d="M270 80c-26 25-21 42 0 43 21-1 26-18 0-43Z" transform="rotate(15 270 100)"/></g><path d="m92 334 9-26 19-9 19 14 5 26-27 9Z" fill="#9ba18c"/></svg><footer>Free to play · 60-second routes · No wallet needed</footer></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir('public', { recursive: true });
  await page.screenshot({ path: 'public/social-card.png' });
  console.log('Generated public/social-card.png (1200 × 630)');
} finally { await browser.close(); }
