import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
const PORT = await new Promise(r => { const s = createServer(); s.listen(0, () => { const n = s.address().port; s.close(() => r(n)) }) })
const sv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${PORT}/`); break } catch (e) {} await new Promise(r => setTimeout(r, 100)) }
const [w, h] = (process.argv[2] || '390x844').split('x').map(Number)
const b = await chromium.launch(MUTE_LAUNCH); const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 2 }); await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__bsReady && !document.getElementById('loading'), null, { timeout: 15000 })
await p.screenshot({ path: `shots/v2-${w}-title.png` })
const scenes = JSON.parse(process.argv[3] || '[]')
for (const [name, js] of scenes) { await p.evaluate(js); await p.waitForTimeout(350); await p.screenshot({ path: `shots/v2-${w}-${name}.png` }) }
console.log('errs', errs.length, errs.slice(0, 3)); await b.close(); sv.kill()
