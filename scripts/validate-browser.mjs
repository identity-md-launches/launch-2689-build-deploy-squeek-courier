import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const out = resolve('test/scratch/browser-validation');
await mkdir(out, { recursive: true });
const root = resolve('dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.txt':'text/plain' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname.startsWith('/preview/') ? pathname.slice(9) : pathname.slice(1);
    const file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep) && file !== root) throw Error('Invalid path');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type':mime[extname(file)] ?? 'application/octet-stream' }); res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const checks = [], screenshots = [];
function record(name, details = '') { checks.push({name, passed:true, details}); console.log(`PASS ${name}: ${details}`); }
function fixture(running = false, observedAt = new Date().toISOString()) {
  return { schemaVersion:1, measurement: { freshness:'online', observedAt,
    staleAfterSeconds:120, coreStatus:running ? 'SPINNING':'IDLE', rpmMilli:running ? 42500:0 } };
}
async function timer(page) {return parseInt(await page.getByTestId('timer').textContent());}
async function screenshot(page, name, fullPage = false) {
  await page.screenshot({path:resolve(out, name + '.png'),fullPage}); screenshots.push(name + '.png');
}
async function advance(page, milliseconds) { await page.clock.runFor(milliseconds); }
async function run(browserType, name) {
  let browser;
  try { browser = await browserType.launch({headless:true}); }
  catch (error) { checks.push({name:`${name} launch`,passed:false,limitation:true,details:String(error).slice(0,3000)}); console.log(`LIMITATION ${name}: ${String(error).slice(0,500)}`); return; }
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const page = await context.newPage();
    const consoleErrors = [], localFailures = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('response', response => {if(response.url().startsWith(url) && response.status() >= 400) localFailures.push(response.url());});
    let live = 'rest'; let observedAt = null;
    await page.route('https://api.squeekchain.com/v1/status', async route => {
      if(live === 'fail') return route.fulfill({status:503,contentType:'application/json',body:'{"error":"temporarily unavailable"}'});
      if(live === 'malformed') return route.fulfill({status:200,contentType:'application/json',body:'{"schemaVersion":1,"measurement":{}}'});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(live === 'run', observedAt ?? new Date().toISOString()))});
    });
    await page.clock.install({time:new Date()});
    await page.goto(url); await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button',{name:'Start delivering',exact:true}).waitFor({state:'visible'});
    assert.equal(await page.getByRole('button',{name:'Start delivering',exact:true}).isEnabled(),true);
    assert.equal(await page.getByRole('button',{name:'Start delivering',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(183, 68, 46)','enabled primary action must show its accent fill');
    assert.equal(await page.evaluate(() => document.fonts.check('700 40px Fraunces')),true);
    record(`${name} export loads at /preview/`, 'local fonts loaded; live IDLE response enables start');
    const social = await page.getAttribute('meta[property="og:image"]', 'content');
    assert.equal((await context.request.get(new URL(social,url).href)).status(),200);
    record(`${name} metadata assets`, 'share image and relative assets resolve');
    await screenshot(page,`${name}-desktop`);
    for (const width of [320,390,768,900,1120,1440]) {
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`overflow at ${width}`);
      if(width === 390) {
        const action = await page.getByRole('button',{name:'Start delivering',exact:true}).boundingBox();
        const canvas = await page.locator('canvas').boundingBox();
        assert.ok(action.y + action.height < 844); assert.ok(canvas.y < 844);
        const field = await page.locator('.field-wrap').boundingBox(); assert.ok(field.height < field.width * .65 + 80, 'game field must keep a compact mobile height after resizing');
        await screenshot(page,`${name}-390-ready`);
      }
    }
    record(`${name} responsive layout`, 'no overflow at 320, 390, 768, 900, 1120, 1440; start above fold at 390');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'How to play'}).focus(); await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor({state:'visible'});
    assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)),true);
    const modalAudit = await new AxeBuilder({page}).analyze(); assert.deepEqual(modalAudit.violations.map(v=>v.id),[]);
    await screenshot(page,`${name}-help`); await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').isVisible(),false);
    assert.equal(await page.getByRole('button',{name:'How to play'}).evaluate(el=>el===document.activeElement),true);
    record(`${name} help dialog`, 'Enter opens; focus inside; Escape closes; focus restored; axe zero violations');
    await page.selectOption('#play-mode','practice-rest');
    await page.getByRole('button',{name:'Start practice run',exact:true}).click();
    assert.equal(await page.locator('#play-mode').isDisabled(),true);
    assert.equal(await page.locator('canvas').evaluate(el=>el===document.activeElement),true);
    const before = await page.locator('canvas').evaluate(el=>el.toDataURL());
    await page.keyboard.down('ArrowRight'); await advance(page,1200); await page.keyboard.up('ArrowRight');
    const after = await page.locator('canvas').evaluate(el=>el.toDataURL()); assert.notEqual(after,before);
    assert.ok(await timer(page) < 60);
    await page.keyboard.press('Space'); const pausedTime = await timer(page);
    await advance(page,2200); assert.equal(await timer(page),pausedTime);
    await page.getByRole('button',{name:'Resume delivery'}).click(); await advance(page,1100); assert.ok(await timer(page)<pausedTime);
    record(`${name} keyboard movement and pause`, 'arrow changes scene; Space freezes clock; resume continues; mode locked');
    const right = page.getByRole('button',{name:'Move right',exact:true});
    await right.scrollIntoViewIfNeeded(); const rightBox = await right.boundingBox();
    await page.mouse.move(rightBox.x+rightBox.width/2,rightBox.y+rightBox.height/2); await page.mouse.down(); await advance(page,250);
    await right.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true}); await page.mouse.up();
    assert.equal(await right.evaluate(el=>el.classList.contains('is-held')),false);
    await page.getByRole('button',{name:'Pause game'}).click(); await page.getByRole('button',{name:'End run and choose mode'}).click();
    record(`${name} touch controls`, 'pointer hold; pointercancel releases; end-run restores picker');
    live='fail'; await context.setOffline(true); await page.selectOption('#play-mode','practice-run');
    await page.getByRole('button',{name:'Start practice run',exact:true}).click(); await advance(page,61_000);
    assert.equal(await page.getByRole('button',{name:'Play again',exact:true}).isVisible(),true); assert.equal(await timer(page),0);
    assert.equal(await page.getByRole('button',{name:'Play again',exact:true}).evaluate(el=>el===document.activeElement),true);
    const records = await page.evaluate(()=>JSON.parse(localStorage.getItem('squeek-courier.records.v1')));
    assert.ok('practice-run' in records && 'live' in records); await screenshot(page,`${name}-completed`);
    record(`${name} offline full run and replay`, '60 active seconds end at zero; replay focused; local records persisted');
    await page.getByRole('button',{name:'Play again',exact:true}).click();
    await page.keyboard.press('Escape'); await page.getByRole('button',{name:'End run and choose mode'}).click();
    await context.setOffline(false); live='rest'; observedAt=await page.evaluate(()=>new Date().toISOString());
    await page.selectOption('#play-mode','live'); await page.getByRole('button',{name:'Refresh live signal',exact:true}).click();
    await advance(page,300); await page.getByRole('button',{name:'Start delivering',exact:true}).click();
    await advance(page,1200); const runningTime = await timer(page);
    live='fail'; await page.evaluate(()=>window.dispatchEvent(new Event('offline'))); await advance(page,1100);
    assert.equal(await page.getByRole('heading',{name:'Waiting for the wheel.'}).isVisible(),true);
    const waitingTime = await timer(page); await advance(page,2500); assert.equal(await timer(page),waitingTime); assert.ok(waitingTime<=runningTime);
    record(`${name} unavailable signal`, 'offline immediately pauses live game and timer; retry and exit available');
    live='run'; observedAt=await page.evaluate(()=>new Date().toISOString());
    await page.getByRole('button',{name:'Retry live signal',exact:true}).click(); await advance(page,1400);
    assert.equal(await page.getByRole('heading',{name:'Squeektoshi is running'}).isVisible(),true); assert.ok(await timer(page)<waitingTime);
    record(`${name} fresh recovery`, 'SPINNING response resumes existing clock and updates visible rhythm');
    observedAt=await page.evaluate(()=>new Date(Date.now()-31_000).toISOString());
    await page.getByRole('button',{name:'Refresh live signal',exact:true}).click(); await advance(page,300);
    assert.equal(await page.getByRole('heading',{name:'Waiting for the wheel.'}).isVisible(),true);
    const staleTime=await timer(page); await advance(page,2500); assert.equal(await timer(page),staleTime);
    record(`${name} stale source`, 'HTTP success with stale observations cannot advance timer');
    live='malformed'; await page.getByRole('button',{name:'Retry live signal',exact:true}).click(); await advance(page,300);
    assert.equal(await page.getByRole('heading',{name:'Waiting for the wheel.'}).isVisible(),true);
    live='fail'; await page.getByRole('button',{name:'Retry live signal',exact:true}).click(); await advance(page,300);
    assert.equal(await page.getByRole('heading',{name:'Waiting for the wheel.'}).isVisible(),true);
    record(`${name} malformed and HTTP failure`, 'invalid schema and 503 both remain paused'); await screenshot(page,`${name}-signal-paused`);
    await page.getByRole('button',{name:'End run and choose mode'}).click(); await page.selectOption('#play-mode','practice-rest');
    await page.emulateMedia({reducedMotion:'reduce'});
    const audit = await new AxeBuilder({page}).analyze(); assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations===Infinity).length),0);
    record(`${name} accessibility and reduced motion`, 'axe zero violations on ready and dialog; no endless reduced-motion animation');
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    assert.ok((await page.getByRole('button',{name:'Start practice run',exact:true}).boundingBox()).width>0);
    const overlayFits = await page.evaluate(()=>{const f=document.querySelector('.field-wrap').getBoundingClientRect();const p=document.querySelector('.start-panel').getBoundingClientRect();return p.top>=f.top && p.bottom<=f.bottom;}); assert.equal(overlayFits,true,'enlarged overlay must stay inside field'); await screenshot(page,`${name}-text-200`);
    record(`${name} 200% text`, 'no horizontal document overflow; action rendered (text enlargement, not native zoom)');
    assert.deepEqual(consoleErrors,[]); assert.deepEqual(localFailures,[]);
    record(`${name} resource integrity`, 'zero page errors and zero failed local resources'); await context.close();
  } finally {await browser.close();}
}
try {await run(chromium,'chromium');await run(webkit,'webkit');}
catch(error){checks.push({name:'interaction suite',passed:false,details:String(error.stack??error)});console.error(error);process.exitCode=1;}
finally {await writeFile(resolve(out,'results.json'),JSON.stringify({checks,screenshots},null,2));await new Promise(resolve=>server.close(resolve));console.log(`Recorded ${checks.filter(c=>c.passed).length} passing checks, ${checks.filter(c=>!c.passed).length} failures/limitations`);}
