// 新幹線で豚まんを食べたい 本体
// 匂い（smell）がたまり、隣の人が起きていて気が散っていない時に「？」（sus）が増える。sus が 1 で注意されて終わり
;(function () {
  'use strict'
  window.__jsUp = true
  const $ = id => document.getElementById(id)
  const D = window.BS_DATA, TXT = window.BS_TXT
  const STEP = 1 / 60, BITE_SEC = 0.45
  const TOTAL_BITES = D.buns * D.bitesPerBun
  const store = { get(k, d) { try { const v = localStorage.getItem('bs_' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }, set(k, v) { try { localStorage.setItem('bs_' + k, JSON.stringify(v)) } catch (e) {} } }
  const qs = new URLSearchParams(location.search)
  let lang = qs.get('lang') || store.get('lang', null) || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
  if (lang !== 'ja' && lang !== 'en') lang = 'ja'
  const L = () => TXT[lang]

  // ---------- 音 ----------
  Snd.def({ bite: ['snd/bite1.mp3', 'snd/bite2.mp3', 'snd/bite3.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3'], grunt: ['snd/grunt1.mp3', 'snd/grunt2.mp3'], chime: 'snd/chime.mp3', depart: 'snd/depart.mp3', win: 'snd/win.mp3', fail: 'snd/fail.mp3', squeak: 'snd/squeak.mp3' })
  let muted = store.get('mute', false); Snd.setMute(muted)
  const SVG_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
  const SVG_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
  function drawMute() { $('bMute').innerHTML = $('bMute2').innerHTML = muted ? SVG_OFF : SVG_ON }
  function toggleMute() { muted = !muted; store.set('mute', muted); Snd.init(); Snd.setMute(muted); drawMute() }

  // ---------- 乱数（種つき） ----------
  let seed = 1
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const rr = (a, b) => a + (b - a) * rnd()

  // ---------- 状態 ----------
  const S = { view: 'vTitle', mode: 'idle', t: 0, smell: 0, sus: 0, bites: 0, hold: false, biteAcc: 0, events: [], said: 0, end: null, paused: false, bot: null, log: [], blame: 0 }
  window.__soundCalls = () => Snd.played

  function makeEvents() {
    const ev = []
    const put = (k, a, b, dur, extra = {}) => { const t = rr(a, b); ev.push({ k, t, dur, ...extra }) }
    put('sleep', 7, 22, rr(5.5, 7.5)); put('sleep', 48, 70, rr(5.5, 7.5))
    put('wagon', 24, 36, 5); put('wagon', 72, 86, 5)
    put('fuji', 58, 64, 4.5)
    put('shumai', 38, 52, 6)
    for (const st of D.stations.slice(1, -1)) ev.push({ k: 'door', t: st.t, dur: 2.5, st })
    ev.sort((a, b) => a.t - b.t)
    // 重なりをずらす（ドア以外）
    let end = 0
    for (const e of ev) { if (e.k === 'door') continue; if (e.t < end + 2) e.t = end + 2; end = e.t + e.dur }
    return ev
  }
  function active(k) { return S.events.find(e => e.k === k && S.t >= e.t && S.t < e.t + e.dur) }
  // 隣の人の注意の向き: 1 = こちらを気にしうる、0 = 気づかない
  function alertness() {
    if (active('sleep') || active('fuji') || active('shumai')) return 0
    if (active('wagon')) return 0.5
    return 1
  }

  // ---------- 画面 ----------
  const views = ['vTitle', 'vPlay', 'vRes']
  function show(id) { for (const v of views) $(v).hidden = v !== id; S.view = id }
  function applyLang() {
    const t = L(); document.documentElement.lang = lang
    $('tT1').textContent = t.title1; $('tT2').textContent = t.title2; $('tSub').textContent = t.sub
    $('tStart').textContent = t.start; $('tTk').innerHTML = `${t.ticket}<br>${t.from}→${t.to}`
    $('bHow').textContent = t.how; $('bLang').textContent = t.lang; $('loadTxt').textContent = t.loading
    $('howT').textContent = t.howTitle; $('bHowClose').textContent = t.close; $('holdTxt').textContent = t.hold
    $('howList').innerHTML = t.howBody.map(r => `<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')
    $('howCred').textContent = t.credits
    $('bAgain').textContent = t.again; $('bPost').textContent = t.post; $('bSave').textContent = t.save
    const b = store.get('best', null); $('tBest').textContent = b != null ? `${t.best} ${t.bunsOf(b, D.buns)}` : ''
  }

  // 路線の点
  function buildRoute() {
    const r = $('route'); r.querySelectorAll('.st,.me').forEach(e => e.remove())
    for (const st of D.stations) { const d = document.createElement('i'); d.className = 'st'; d.style.left = `calc(4px + ${st.t / D.total} * (100% - 8px))`; r.appendChild(d) }
    const me = document.createElement('div'); me.className = 'me'; me.id = 'routeMe'
    me.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 15q0-6 9-7h6q5 1 6 7v2H2z" fill="#f4f1ea" stroke="#2f5fa8" stroke-width="2"/><path d="M4 16h18" stroke="#2f5fa8" stroke-width="2"/></svg>'
    r.appendChild(me)
  }

  // ---------- 進行 ----------
  function start() {
    Snd.init(); Snd.play('paper', { vol: .9 }); Snd.play('depart', { vol: .5, delay: .2 })
    Snd.loop('rumble', 'snd/rumble.mp3', 0.12); Snd.loop('bgm', 'snd/bgm.mp3', 0.12)
    seed = S.forceSeed || (Date.now() % 2147483646) + 1
    Object.assign(S, { mode: 'play', t: 0, smell: 0.05, sus: 0, bites: 0, hold: false, biteAcc: 0, events: makeEvents(), said: 0, end: null, log: [], blame: 0 })
    show('vPlay'); buildRoute(); resize(); puffs.length = 0
    for (const e of S.events) e.shown = false
  }
  function bite() {
    S.bites++; S.biteAcc = 0
    Snd.play('bite', { vol: .55, rate: 1.1 })
    S.chew = 1; for (let i = 0; i < 3; i++) puffs.push(newPuff(true))
    if (S.bites % D.bitesPerBun === 0) Snd.play('paper', { vol: .4 })
    if (S.bites >= TOTAL_BITES) finish('win')
  }
  function sayText(s, ms = 1200) { const e = $('say'); e.textContent = s; e.classList.add('on'); clearTimeout(sayText.tm); sayText.tm = setTimeout(() => e.classList.remove('on'), ms) }
  function evText(s, ms = 1800) { const e = $('ev'); e.textContent = s; e.classList.add('on'); clearTimeout(evText.tm); evText.tm = setTimeout(() => e.classList.remove('on'), ms) }
  function regionAt(t) {
    const names = lang === 'ja' ? ['京都', '米原', '浜松', '静岡', '新横浜', '品川'] : ['Kyoto', 'Maibara', 'Hamamatsu', 'Shizuoka', 'Shin-Yokohama', 'Shinagawa']
    const cut = [14, 40, 60, 78, 92, 101]; return names[cut.findIndex(c => t < c)]
  }
  function finish(kind) {
    if (S.mode !== 'play') return
    S.mode = kind === 'caught' ? 'caught' : 'end'; S.hold = false; $('bBite').classList.remove('hold')
    S.end = { kind, buns: Math.floor(S.bites / D.bitesPerBun), bites: S.bites, t: S.t, where: regionAt(S.t) }
    S.log.push({ ev: 'end', ...S.end })
    if (kind === 'caught') {
      Snd.duck(.3, 2); Snd.play('squeak', { vol: .7, rate: .8 }); sayText(L().caught, 1500)
      setTimeout(() => { sayText(L().warn, 1500); Snd.play('grunt', { vol: .6, rate: .8 }) }, 1500)
      setTimeout(showResult, 3200)
    } else { setTimeout(showResult, kind === 'win' ? 700 : 1200); if (kind === 'late') { Snd.play('chime', { vol: .7 }); evText(`${L().arrive} ${lang === 'ja' ? '東京' : 'Tokyo'}`) } }
  }
  function rankOf(b) { let r = L().ranks[0][1]; for (const [m, n] of L().ranks) if (b >= m) r = n; return r }
  function showResult() {
    const e = S.end, t = L()
    Snd.loop('rumble', null); Snd.loop('bgm', null)
    Snd.play(e.kind === 'win' ? 'win' : 'fail', { vol: .8 })
    if (e.buns > store.get('best', -1)) store.set('best', e.buns)
    show('vRes')
    $('rTk').textContent = t.ticket; $('rFrom').textContent = t.from; $('rTo').textContent = e.kind === 'caught' ? e.where : t.to
    const d = new Date(); $('rDate').textContent = `${d.getMonth() + 1}.${d.getDate()}`
    $('rBuns').innerHTML = Array.from({ length: D.buns }, (_, i) => `<i class="${i < e.buns ? '' : 'no'}"></i>`).join('')
    $('rNum').textContent = t.bunsOf(e.buns, D.buns)
    $('rRank').textContent = rankOf(e.buns)
    $('rWhere').textContent = e.kind === 'caught' ? `${t.where(e.where)} ${t.caught}` : ''
    const st = $('stamp'); st.textContent = e.kind === 'win' ? t.resWin : e.kind === 'caught' ? t.resCaught : t.resLate
    st.classList.remove('on'); setTimeout(() => st.classList.add('on'), 250)
  }
  function post() {
    const e = S.end; if (!e) return
    const u = 'https://x.com/intent/post?text=' + encodeURIComponent(L().postText(e.buns, rankOf(e.buns))) + '&url=' + encodeURIComponent('https://tom3games.com/play/butaman-shinkansen/')
    window.open(u, '_blank', 'noopener')
  }
  function save() {
    const e = S.end, t = L(); if (!e) return
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d')
    g.fillStyle = '#ece7dc'; g.fillRect(0, 0, 1080, 1080)
    g.save(); g.translate(540, 540); g.rotate(-0.03)
    g.fillStyle = '#d9ecf3'; g.fillRect(-440, -300, 880, 600)
    g.fillStyle = '#2b2622'; g.font = '900 64px "Zen Maru Gothic",sans-serif'; g.textAlign = 'center'
    g.fillText(`${t.from} → ${e.kind === 'caught' ? e.where : t.to}`, 0, -170)
    g.font = '900 96px "Zen Maru Gothic",sans-serif'; g.fillStyle = '#1f427a'; g.fillText(rankOf(e.buns), 0, 10)
    g.font = '900 56px "Zen Maru Gothic",sans-serif'; g.fillStyle = '#2b2622'; g.fillText(t.bunsOf(e.buns, D.buns), 0, 120)
    g.strokeStyle = '#c8402e'; g.lineWidth = 10; g.beginPath(); g.arc(300, -200, 90, 0, 7); g.stroke()
    g.fillStyle = '#c8402e'; g.font = '900 40px "Zen Maru Gothic",sans-serif'; g.fillText(e.kind === 'win' ? t.resWin : e.kind === 'caught' ? t.resCaught : t.resLate, 300, -186)
    g.restore()
    g.fillStyle = '#5c544b'; g.font = '700 34px "Zen Maru Gothic",sans-serif'; g.textAlign = 'left'; g.fillText(lang === 'ja' ? '新幹線で豚まんを食べたい  tom3games.com' : 'Pork Buns on the Bullet Train  tom3games.com', 70, 1010)
    c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'butaman-shinkansen.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000) }, 'image/png')
  }

  // ---------- 1コマ ----------
  let prevAlert = 1
  function tick(dt) {
    if (S.view !== 'vPlay' || S.mode !== 'play') return
    S.t += dt
    if (S.bot) botThink(dt)
    // 出来事の知らせ
    for (const e of S.events) if (!e.shown && S.t >= e.t) {
      e.shown = true
      if (e.k === 'door') { Snd.play('chime', { vol: .5 }); evText(`${lang === 'ja' ? e.st.ja : e.st.en}  ${L().ev.door}`) }
      else { evText(L().ev[e.k]); if (e.k === 'shumai') Snd.play('paper', { vol: .7, rate: .8 }) }
      if (e.k === 'sleep') e.warned = false
    }
    const sl = active('sleep'); if (sl && !sl.warned && S.t > sl.t + sl.dur - 1.4) { sl.warned = true; sayText(lang === 'ja' ? 'ん…' : 'Mm…', 1200) }
    // 食べる
    if (S.hold) { S.biteAcc += dt; S.smell += 0.34 * dt; if (S.biteAcc >= BITE_SEC) bite() }
    if (S.mode !== 'play') return
    if (S.bites < TOTAL_BITES) S.smell += 0.012 * dt   // 開けた箱から少しずつ
    const door = active('door')
    S.smell -= S.smell * (door ? 1.1 : 0.2) * dt
    S.smell = Math.max(0, Math.min(1.4, S.smell))
    const a = alertness()
    if (a > 0) S.sus += Math.max(0, S.smell - 0.3) * 2.4 * a * dt
    if (active('shumai')) S.sus -= 0.25 * dt
    if (S.smell < 0.22) S.sus -= 0.05 * dt
    S.sus = Math.max(0, Math.min(1, S.sus))
    if (S.sus > 0.35 && S.said < 1) { S.said = 1; sayText(L().sniff); Snd.play('grunt', { vol: .5 }) }
    if (S.sus > 0.7 && S.said < 2) { S.said = 2; sayText(L().sus2, 1400); Snd.play('grunt', { vol: .6, rate: .9 }) }
    if (S.sus < 0.2) S.said = 0
    if (active('shumai') && S.blame < 1) { S.blame = 1; setTimeout(() => sayText(L().blame, 1400), 900) }
    if (!active('shumai')) S.blame = 0
    prevAlert = a
    if (S.sus >= 1) return finish('caught')
    if (S.t >= D.total) return finish('late')
    if (S.chew > 0) S.chew = Math.max(0, S.chew - dt * 3)
  }

  // ---------- 匂いの粒 ----------
  const cv = $('smell'), ctx = cv.getContext('2d'); const puffs = []
  let W = 0, H = 0, DPR = 1
  let mouth = { x: 0, y: 0 }
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); const r = $('scene').getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR
    // 口元と隣の人の頭の位置（SVG の座標 200x260 から）
    const m = $('me').getBoundingClientRect(), n = $('nb').getBoundingClientRect()
    mouth = { x: m.left - r.left + m.width * 0.5, y: m.top - r.top + m.height * (150 / 260) }
    const hx = n.left - r.left + n.width * 0.5, hy = n.top - r.top + n.height * (78 / 260)
    const su = $('sus'); su.style.left = (hx + n.width * 0.24) + 'px'; su.style.top = (hy - 6) + 'px'
    const sy = $('say'); sy.style.left = hx + 'px'; sy.style.top = Math.max(4, hy - 70) + 'px'
  }
  window.addEventListener('resize', () => { if (S.view === 'vPlay') resize() })
  function newPuff(big) { return { x: mouth.x + rr(-8, 8), y: mouth.y + rr(-6, 6), vx: rr(18, 46), vy: rr(-30, -14), r: big ? rr(10, 16) : rr(6, 10), life: 0, max: rr(2.2, 3.4) } }
  function drawPuffs(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H)
    if (S.mode === 'play' && rnd() < S.smell * 0.25) puffs.push(newPuff(false))
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.life += dt; if (p.life > p.max) { puffs.splice(i, 1); continue }
      p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(p.life * 3 + i) * 0.3; p.r += 9 * dt
      const k = 1 - p.life / p.max
      ctx.globalAlpha = 0.35 * k * Math.min(1, 0.4 + S.smell)
      ctx.fillStyle = '#f0b98a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // ---------- 見た目の更新 ----------
  const eyesOpen = '<circle cx="85" cy="129" r="3.5"/><circle cx="115" cy="129" r="3.5"/>'
  const eyesSleep = '<path d="M79 130q6 4 12 0M109 130q6 4 12 0" stroke="#2b2622" stroke-width="3" fill="none"/>'
  const eyesLeft = '<circle cx="80" cy="129" r="3.5"/><circle cx="110" cy="129" r="3.5"/>'
  const eyesRight = '<circle cx="90" cy="129" r="3.5"/><circle cx="120" cy="129" r="3.5"/>'
  let lastNb = ''
  function render(dt) {
    if (S.view !== 'vPlay') return
    const t = L()
    // 電光掲示板
    const next = D.stations.find(s => s.t > S.t) || D.stations[D.stations.length - 1]
    const near = next.t - S.t < 3
    $('lNext').textContent = `${near ? t.arrive : t.next} ${lang === 'ja' ? next.ja : next.en}`
    $('lClock').textContent = `${Math.floor(S.bites / D.bitesPerBun)}/${D.buns}`
    const me = $('routeMe'); if (me) me.style.left = `calc(4px + ${Math.min(1, S.t / D.total)} * (100% - 8px))`
    $('count').textContent = `${Math.floor(S.bites / D.bitesPerBun)}/${D.buns}`
    const box = $('box').children; for (let i = 0; i < D.buns; i++) box[i].classList.toggle('gone', i < Math.floor(S.bites / D.bitesPerBun))
    $('bBite').style.setProperty('--b', `${(S.bites % D.bitesPerBun) / D.bitesPerBun * 70}%`)
    // ？の輪
    $('susArc').setAttribute('stroke-dasharray', `${(S.sus * 138).toFixed(1)} 200`)
    $('sus').style.opacity = S.sus > 0.04 || S.mode === 'caught' ? 1 : 0.25
    // 窓
    $('fuji').classList.toggle('on', !!active('fuji'))
    // 隣の人
    let st = 'awake'
    if (S.mode === 'caught') st = 'caught'
    else if (active('sleep')) st = 'sleep'
    else if (active('fuji')) st = 'fuji'
    else if (active('shumai')) st = 'shumai'
    else if (S.sus > 0.35) st = 'sniff'
    if (st !== lastNb) {
      lastNb = st
      $('nbEyes').innerHTML = st === 'sleep' ? eyesSleep : st === 'fuji' || st === 'caught' ? eyesLeft : st === 'shumai' ? eyesRight : eyesOpen
      $('nbMouth').setAttribute('d', st === 'caught' ? 'M94 152q6-8 12 0q-6 8-12 0' : st === 'sleep' ? 'M94 154q6 4 12 0' : 'M90 154h20')
      $('nbPhone').style.opacity = st === 'awake' || st === 'sniff' ? 1 : 0
      $('nbHead').style.transform = st === 'sleep' ? 'rotate(10deg)' : st === 'caught' ? 'rotate(-8deg)' : ''
      $('nbHead').style.transformOrigin = '100px 150px'; $('nbHead').style.transition = 'transform .3s'
    }
    $('nbNose').style.transform = st === 'sniff' || st === 'caught' ? `translateY(${Math.sin(performance.now() / 70) * 1.5}px)` : ''
    $('ojBox').setAttribute('opacity', active('shumai') ? 1 : 0)
    // 自分
    const ch = (S.chew || 0) + (S.hold ? 0.4 : 0)
    $('meCheekL').setAttribute('rx', 9 + ch * 6); $('meCheekR').setAttribute('rx', 9 + ch * 6)
    $('meMouth').setAttribute('d', S.hold ? 'M92 150q8 10 16 0' : 'M92 152q8 6 16 0')
    $('meEyes').innerHTML = S.mode === 'caught' ? '<circle cx="86" cy="130" r="6" fill="#fff" stroke="#2b2622" stroke-width="2"/><circle cx="114" cy="130" r="6" fill="#fff" stroke="#2b2622" stroke-width="2"/><circle cx="86" cy="130" r="2"/><circle cx="114" cy="130" r="2"/>' : S.hold ? '<path d="M80 130q6-5 12 0M108 130q6-5 12 0" stroke="#2b2622" stroke-width="3" fill="none"/>' : '<circle cx="86" cy="130" r="4.5"/><circle cx="114" cy="130" r="4.5"/>'
    drawPuffs(dt)
  }

  // ---------- 入力 ----------
  const bb = $('bBite')
  const down = e => { if (S.mode !== 'play' || S.bot) return; e.preventDefault(); Snd.init(); S.hold = true; bb.classList.add('hold'); try { bb.setPointerCapture(e.pointerId) } catch (er) {} }
  const up = () => { S.hold = false; bb.classList.remove('hold') }
  bb.addEventListener('pointerdown', down); bb.addEventListener('pointerup', up); bb.addEventListener('pointercancel', up); bb.addEventListener('pointerleave', up)
  window.addEventListener('keydown', e => { if (e.key === ' ' && S.view === 'vPlay' && !S.bot) { e.preventDefault(); if (S.mode === 'play') { S.hold = true; bb.classList.add('hold') } } })
  window.addEventListener('keyup', e => { if (e.key === ' ') up() })

  // ---------- bot（検証用） ----------
  function botThink(dt) {
    const B = S.bot; B.t -= dt; if (B.t > 0) return
    B.t = B.human ? rr(0.45, 0.75) : 0.05
    const a = alertness()
    const safe = a === 0 || (a < 0.5 && S.smell < 0.6)
    let want
    if (B.kind === 'greedy') want = true                     // ずっと食べる
    else if (B.kind === 'shy') want = safe && S.sus < 0.1 && a === 0   // 確実な隙だけ
    else want = safe ? S.sus < 0.9 : (S.smell < 0.3 && S.sus < 0.45)  // 隙で食べ、普段は匂いが薄い時に少し
    S.hold = want; bb.classList.toggle('hold', want)
  }

  // ---------- タイトルの文字の流れ ----------
  // ---------- ループ ----------
  let last = performance.now(), acc = 0
  function frame() {
    const now = performance.now(), d = Math.min(0.25, (now - last) / 1000); last = now
    if (!S.paused) { acc += d; while (acc >= STEP) { tick(STEP); acc -= STEP } }
    render(d)
    requestAnimationFrame(frame)
  }

  // ---------- ボタン ----------
  $('bStart').addEventListener('click', start)
  $('bAgain').addEventListener('click', start)
  $('bHow').addEventListener('click', () => { $('vHow').hidden = false })
  $('bHowClose').addEventListener('click', () => { $('vHow').hidden = true })
  $('vHow').addEventListener('click', e => { if (e.target.id === 'vHow') $('vHow').hidden = true })
  $('bLang').addEventListener('click', () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('lang', lang); applyLang() })
  $('bMute').addEventListener('click', toggleMute); $('bMute2').addEventListener('click', toggleMute)
  $('bPost').addEventListener('click', post); $('bSave').addEventListener('click', save)
  document.addEventListener('pointerdown', () => Snd.init(), { passive: true })

  drawMute(); applyLang(); show('vTitle'); requestAnimationFrame(frame)
  ;(async () => {
    const files = [...new Set(Object.values(Snd.files).flat().concat(['snd/rumble.mp3', 'snd/bgm.mp3']))]
    let done = 0; const bar = document.querySelector('#loadBar i')
    const hide = () => { const l = $('loading'); if (!l || l.dataset.gone) return; l.dataset.gone = 1; l.style.opacity = 0; setTimeout(() => l.remove(), 400) }
    setTimeout(hide, 12000)
    await Promise.all(files.map(u => fetch(u).then(r => r.arrayBuffer()).catch(() => null).then(() => { done++; bar.style.width = (done / files.length * 100) + '%' })))
    try { await document.fonts.ready } catch (e) {}
    hide()
  })()

  window.butaman = {
    S, D,
    dbg: {
      pause(v = true) { S.paused = v; last = performance.now() },
      step(n = 1) { for (let i = 0; i < n; i++) tick(STEP) },
      render() { render(0) },
      start(sd) { S.forceSeed = sd || 0; start(); S.forceSeed = 0 },
      bot(kind, human = false) { S.bot = kind ? { t: 0, kind, human } : null },
      hold(v) { S.hold = v },
      showResult,
    },
  }
  window.__bsReady = true
})()
