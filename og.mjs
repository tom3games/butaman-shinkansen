import './mute-auto.mjs'
// og.png: 豚まんにかぶりついた瞬間、隣の人の目だけがこっちに動く＋題名。node og.mjs
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium } from 'playwright'
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
const ROOT = import.meta.dirname
const PORT = await new Promise(r => { const s = createServer(); s.listen(0, () => { const n = s.address().port; s.close(() => r(n)) }) })
const sv = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
for (let i = 0; i < 60; i++) { try { if ((await (await fetch(`http://localhost:${PORT}/`)).text()).includes('butaman')) break } catch (e) {} await new Promise(r => setTimeout(r, 100)) }
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 430, height: 700 }, deviceScaleFactor: 2 }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__bsReady && !document.getElementById('loading'), null, { timeout: 15000 })
await p.evaluate(() => { const d = butaman.dbg, S = butaman.S; d.start(777); d.pause(); S.events = []; S.t = 62; S.bites = 21; S.hold = true; d.step(30); S.smell = .6; S.sus = 0.55; S.nb.st = 'tell'; S.nb.tt = 9; d.render(); document.getElementById('bMute2').style.display = 'none' })
await p.waitForTimeout(400)
const shot = await p.locator('#scene').screenshot({ type: 'png' })
await p.setViewportSize({ width: 1200, height: 630 })
await p.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Zen+Maru+Gothic:wght@900&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;background:#ece7dc;font-family:"Zen Maru Gothic",sans-serif;color:#2b2622}
img{position:absolute;left:0;top:0;height:630px;width:570px;object-fit:cover;object-position:left center;box-shadow:6px 0 18px rgba(0,0,0,.15)}
.led{position:absolute;left:600px;top:60px;width:560px;background:#141110;border-radius:8px;padding:14px 22px;font-family:"DotGothic16";font-size:30px;color:#ff9a1f;text-shadow:0 0 8px rgba(255,150,30,.6)}
.a{position:absolute;left:600px;top:170px;font-weight:900;font-size:64px;color:#2f5fa8}
.b{position:absolute;left:596px;top:250px;font-weight:900;font-size:76px;letter-spacing:-.03em;white-space:nowrap}
.s{position:absolute;left:602px;top:400px;font-weight:900;font-size:36px;color:#5c544b;line-height:1.4}
</style></head><body><img src="data:image/png;base64,${shot.toString('base64')}"><div class="led">次は 新横浜　匂いにご注意ください</div><div class="a">新幹線で</div><div class="b">豚まんを食べたい</div><div class="s">隣がこっちを向く前に、隠せ。<br>東京までに豚まん4個。</div></body></html>`)
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
await p.screenshot({ path: ROOT + '/og.png' }); await b.close(); sv.kill()
execFileSync('sips', ['-z', '630', '1200', ROOT + '/og.png'], { stdio: 'ignore' }); console.log('og.png')
