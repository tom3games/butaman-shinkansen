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
const p = await open(chromium)
// 遊び方ごとの分布（種12個）
const sim = await p.evaluate(() => {
  const d = butaman.dbg, S = butaman.S, res = {}
  for (const [kind, human] of [['smart', false], ['smart', true], ['greedy', false], ['shy', false], [null, false]]) {
    const rows = []
    for (let sd = 1; sd <= 12; sd++) { d.start(sd * 7919); d.pause(); d.bot(kind, human); let n = 0; while (S.mode === 'play' && n < 60 * 120) { d.step(1); n++ } rows.push(S.end ? S.end.kind[0] + S.end.buns : '?') }
    res[(kind || 'none') + (human ? '-human' : '')] = rows.join(' ')
  }
  d.bot(null); return res
})
out.push(JSON.stringify(sim, null, 1))
// 画面: タイトル・遊ぶ（途中）・注意された・結果 ×3サイズ
for (const [w, h] of [[360, 640], [390, 844], [430, 932]]) {
  const q = await open(chromium, { width: w, height: h })
  await q.screenshot({ path: `shots/${w}-title.png` })
  await q.evaluate(() => { butaman.dbg.start(4242); butaman.dbg.pause(); butaman.dbg.bot('smart'); butaman.dbg.step(60 * 30); butaman.dbg.bot(null); butaman.S.hold = true; butaman.dbg.step(40); butaman.dbg.render() })
  await q.waitForTimeout(200); await q.screenshot({ path: `shots/${w}-play.png` })
  const fit = await q.evaluate(() => ({ sh: document.documentElement.scrollHeight, H: innerHeight, bad: [...document.querySelectorAll('#vPlay button, #led, #tray')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 }).map(e => e.id) }))
  await q.evaluate(() => { butaman.S.sus = 1; butaman.dbg.step(2); butaman.dbg.render() }); await q.waitForTimeout(500); await q.screenshot({ path: `shots/${w}-caught.png` })
  await q.evaluate(() => { butaman.dbg.pause(false) }); await q.waitForTimeout(3800); await q.screenshot({ path: `shots/${w}-res.png` })
  const fit2 = await q.evaluate(() => ({ sh: document.documentElement.scrollHeight, H: innerHeight, view: butaman.S.view }))
  out.push(`${w}x${h} play ${JSON.stringify(fit)} res ${JSON.stringify(fit2)} errs ${q.errs.length} ${q.errs.slice(0, 2)}`)
  await q.b.close()
}
// WebKit で開いて始められる
const k = await open(webkit); await k.click('#bStart'); await k.waitForTimeout(400); const km = await k.evaluate(() => ({ mode: butaman.S.mode, mute: window.__muteOk ? window.__muteOk() : 'n/a' })); out.push('webkit ' + JSON.stringify(km) + ' errs ' + k.errs.length); await k.b.close()
// 本物の指で長押しすると食べる
const t = await open(chromium); await t.click('#bStart'); const bx = await t.locator('#bBite').boundingBox()
await t.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await t.mouse.down(); await t.waitForTimeout(1500); await t.mouse.up()
out.push('hold bites ' + await t.evaluate(() => butaman.S.bites) + ' errs ' + t.errs.length); await t.b.close()
await p.b.close(); sv.kill(); console.log(out.join('\n'))
