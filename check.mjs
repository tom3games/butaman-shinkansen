import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const PORT = await new Promise(r => { const s = createServer(); s.listen(0, () => { const n = s.address().port; s.close(() => r(n)) }) })
const sv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
for (let i = 0; i < 60; i++) { try { if ((await (await fetch(`http://localhost:${PORT}/`)).text()).includes('butaman')) break } catch (e) {} await new Promise(r => setTimeout(r, 100)) }
const out = []
async function open(B, vp) { const b = await B.launch(B === chromium ? MUTE_LAUNCH : {}); const ctx = await b.newContext({ locale: 'ja-JP', viewport: vp || { width: 390, height: 844 }, hasTouch: true }); await muteContext(ctx); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()) }); await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__bsReady && !document.getElementById('loading'), null, { timeout: 15000 }); p.b = b; return p }
// 画面: 各場面 ×3サイズ。同時に出ている文字の数と、はみ出しも数える
const SC = {
  play: "d.start(4242);d.pause();d.step(60*2);d.render()",
  bite: "S.hold=true;d.step(50);d.render()",
  tell: "S.hold=false;d.step(30);S.nb.st='tell';S.nb.tt=5;d.render()",
  look: "S.nb.st='look';S.nb.tt=5;S.chew=0.5;d.render()",
  sleep: "S.t=S.events.find(e=>e.k==='sleep').t+0.5;d.step(2);d.render()",
  kid: "S.t=S.events.find(e=>e.k==='kid').t+1.2;S.nb.st='phone';S.nb.tt=9;d.step(2);d.render()",
  fuji: "S.t=S.events.find(e=>e.k==='fuji').t+1;d.step(2);d.render()",
  shumai: "S.t=S.events.find(e=>e.k==='shumai').t+1.5;d.step(2);d.render()",
  cond: "S.t=S.events.find(e=>e.k==='cond').t+2.1;d.step(2);d.render()",
  caught: "S.t=30;S.nb.st='look';S.nb.tt=5;S.hold=true;S.raise=1;d.step(30);d.render()",
}
for (const [w, h] of [[360, 640], [390, 844], [430, 932]]) {
  const q = await open(chromium, { width: w, height: h })
  await q.screenshot({ path: `shots/${w}-title.png` })
  const info = []
  for (const [name, js] of Object.entries(SC)) {
    await q.evaluate(js => { const d = butaman.dbg, S = butaman.S; new Function('d', 'S', js)(d, S) }, js)
    await q.waitForTimeout(name === 'kid' ? 450 : 250); await q.screenshot({ path: `shots/${w}-${name}.png` })
    info.push(name + ':' + await q.evaluate(() => { const on = [...document.querySelectorAll('#say.on,#sayMe.on,#ev.on')].length; const sh = document.documentElement.scrollHeight - innerHeight; const out = [...document.querySelectorAll('#vPlay button, #led, #tray')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 }).map(e => e.id); return `txt${on}/scroll${sh}/out[${out}]` }))
  }
  await q.evaluate(() => butaman.dbg.pause(false)); await q.waitForTimeout(3800); await q.screenshot({ path: `shots/${w}-res.png` })
  const fit2 = await q.evaluate(() => ({ sh: document.documentElement.scrollHeight - innerHeight, view: butaman.S.view, out: [...document.querySelectorAll('#vRes button, #tk')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < 0 }).map(e => e.id) }))
  out.push(`${w}x${h} ${info.join(' ')} res ${JSON.stringify(fit2)} errs ${q.errs.length} ${q.errs.slice(0, 2)}`)
  await q.b.close()
}
// WebKit で開いて始められる
const k = await open(webkit); await k.click('#bStart'); await k.waitForTimeout(400); const km = await k.evaluate(() => ({ mode: butaman.S.mode, mute: window.__muteOk ? window.__muteOk() : 'n/a' })); out.push('webkit ' + JSON.stringify(km) + ' errs ' + k.errs.length); await k.b.close()
// 本物の指で長押しすると食べる
const t = await open(chromium); await t.click('#bStart'); const bx = await t.locator('#bBite').boundingBox()
await t.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await t.mouse.down(); await t.waitForTimeout(1500); const mid = await t.evaluate(() => ({ raise: butaman.S.raise, spr: document.getElementById('me').src.split('/').pop() })); await t.mouse.up(); await t.waitForTimeout(400)
out.push('hold bites ' + await t.evaluate(() => butaman.S.bites) + ' mid ' + JSON.stringify(mid) + ' after ' + await t.evaluate(() => butaman.S.raise.toFixed(2)) + ' errs ' + t.errs.length); await t.b.close()
sv.kill(); console.log(out.join('\n'))
