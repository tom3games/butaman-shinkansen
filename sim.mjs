import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
const PORT = await new Promise(r => { const s = createServer(); s.listen(0, () => { const n = s.address().port; s.close(() => r(n)) }) })
const sv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${PORT}/`); break } catch (e) {} await new Promise(r => setTimeout(r, 100)) }
const b = await chromium.launch(MUTE_LAUNCH); const ctx = await b.newContext({ locale: 'ja-JP' }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__bsReady)
const N = +(process.argv[2] || 30)
const TUNE = JSON.parse(process.argv[3] || '{}')
const r = await p.evaluate(([N, TUNE]) => {
  const d = butaman.dbg; d.tune(TUNE); const _ = 0
  const S = butaman.S, res = {}
  for (const [kind, human] of [['smart', false], ['smart', true], ['greedy', false], ['none', false]]) {
    const rows = [], by = {}, buns = [0, 0, 0, 0, 0]; let close = 0, looks = 0, fakes = 0, tells = 0, tsum = 0
    for (let sd = 1; sd <= N; sd++) {
      d.bot(kind, human); d.start(sd * 7919); d.pause(); let n = 0
      while (S.mode === 'play' && n < 60 * 130) { d.step(1); n++ }
      const e = S.end; buns[e.buns]++; tsum += e.t; by[e.kind + (e.kind === 'caught' ? ':' + e.by : '')] = (by[e.kind + (e.kind === 'caught' ? ':' + e.by : '')] || 0) + 1; close += e.close
      for (const l of S.log) { if (l.nb === 'look') looks++; if (l.nb === 'tell') tells++ }
    }
    res[kind + (human ? '-human' : '')] = { buns: buns.join(' '), by, close: (close / N).toFixed(1), endT: (tsum / N).toFixed(0), tellsPerRun: (tells / N).toFixed(1), looksPerRun: (looks / N).toFixed(1) }
  }
  d.bot(null); return res
}, [N, TUNE])
console.log(JSON.stringify(r, null, 1)); await b.close(); sv.kill()
