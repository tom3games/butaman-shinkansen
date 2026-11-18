// 新幹線で豚まんを食べたい 本体（v2: 見られたら終わり）
// 隣の人は「スマホ → 前ぶれ（目が動く）→ こっちを見る → スマホ」を繰り返す。前ぶれで止めることもある。
// 見られている間に豚まんを持ち上げていたら一気に「？」がたまる。もぐもぐ中の頬も少しずつ。匂いが強いとくんくんして早く向く
;(function () {
  'use strict'
  window.__jsUp = true
  const $ = id => document.getElementById(id)
  const D = window.BS_DATA, TXT = window.BS_TXT
  const STEP = 1 / 60, CHEW_SEC = 0.9
  let BITE_SEC = 0.6
  // 難しさのつまみ（隣の人がスマホを見ている長さ・前ぶれの長さ（最初→最後））
  let G0 = 1.8, G1 = 4.2, T0 = 0.65, T1 = 0.45
  let TOTAL_BITES = D.buns * D.bitesPerBun
  const store = { get(k, d) { try { const v = localStorage.getItem('bs_' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }, set(k, v) { try { localStorage.setItem('bs_' + k, JSON.stringify(v)) } catch (e) {} } }
  const qs = new URLSearchParams(location.search)
  let lang = qs.get('lang') || store.get('lang', null) || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
  if (lang !== 'ja' && lang !== 'en') lang = 'ja'
  const L = () => TXT[lang]

  // ---------- 音 ----------
  Snd.def({ bite: ['snd/bite1.mp3', 'snd/bite2.mp3', 'snd/bite3.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3'], grunt: ['snd/grunt1.mp3', 'snd/grunt2.mp3'], chime: 'snd/chime.mp3', depart: 'snd/depart.mp3', win: 'snd/win.mp3', fail: 'snd/fail.mp3', squeak: 'snd/squeak.mp3', cloth: ['snd/cloth1.mp3', 'snd/cloth2.mp3'], step: ['snd/step4.mp3', 'snd/step5.mp3', 'snd/step7.mp3'] })
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
  const S = { view: 'vTitle', mode: 'idle', t: 0, smell: 0, sus: 0, bites: 0, hold: false, raise: 0, biteAcc: 0, chew: 0, events: [], said: 0, end: null, paused: false, bot: null, log: [], close: 0, lastShown: -9, slow: 0, safeT: 0,
    nb: { st: 'phone', tt: 3, dur: 0, fake: false }, kid: { st: 'off', tt: 0 } }
  window.__soundCalls = () => Snd.played

  function makeEvents() {
    const ev = []
    const put = (k, a, b, dur) => ev.push({ k, t: rr(a, b), dur })
    put('sleep', 8, 20, rr(5, 7)); put('sleep', 50, 66, rr(5, 7))
    put('wagon', 24, 34, 4.5); put('wagon', 80, 88, 4)
    put('fuji', 60, 70, 4.5)
    put('shumai', 36, 46, 5)
    put('cond', 70, 76, 4.2)          // 車掌が通る（見られても平気。足音でドキッとするだけ）
    put('kid', 28, 56, 2.6); put('kid', 62, 92, 2.6)
    for (const st of D.stations.slice(1, -1)) ev.push({ k: 'door', t: st.t, dur: 2.5, st })
    ev.sort((a, b) => a.t - b.t)
    let end = 0   // 重なりをずらす（ドア以外）
    for (const e of ev) { if (e.k === 'door') continue; if (e.t < end + 2.5) e.t = end + 2.5; end = e.t + e.dur }
    return ev.filter(e => e.t + e.dur < D.total - 1)
  }
  const active = k => S.events.find(e => e.k === k && S.t >= e.t && S.t < e.t + e.dur)
  const soon = (k, sec) => S.events.find(e => e.k === k && S.t < e.t && e.t - S.t <= sec)
  const prog = () => Math.min(1, S.t / D.total)

  // 隣の人の見ている先: 'me'（こっち）/'aisle'（通路）/'phone'/'sleep'
  function nbFacing() {
    const s = S.nb.st
    if (s === 'look' || s === 'fuji' || s === 'angry') return 'me'
    if (s === 'aisle') return 'aisle'
    if (s === 'sleep') return 'sleep'
    return 'phone'
  }
  // 危なさ（0〜1）。心臓の音と画面の端の暗さ、bot の判断に使う
  function danger() {
    const s = S.nb.st
    let d = 0.12 + S.sus * 0.5
    if (s === 'tell' || S.kid.st === 'peek') d = 0.85
    if (s === 'sniff') d = Math.max(d, 0.6)
    if (nbFacing() === 'me' || S.kid.st === 'look') d = 1
    if (soon('fuji', 2.5)) d = Math.max(d, 0.7)
    if (s === 'sleep' || s === 'aisle') d = Math.min(d, 0.2 + S.sus * 0.3)
    return Math.min(1, d)
  }

  // ---------- 隣の人 ----------
  function nbGap() { return rr(G0, G1) * (1 - 0.3 * prog()) * (1 - 0.3 * S.sus) }
  function nbTellDur() { return T0 - (T0 - T1) * prog() }
  function nbSet(st, dur) {
    const prev = S.nb.st
    S.nb.st = st; S.nb.dur = dur || 0; S.nb.tt = dur || 0
    if (st === 'tell') { S.nb.fake = rnd() < 0.35; Snd.play('cloth', { vol: .9 }) }
    if ((st === 'look' || st === 'fuji') && prev !== st) onLook()
    S.log.push({ t: +S.t.toFixed(2), nb: st })
  }
  // 見られた瞬間: 直前まで食べていたら「セーフ」
  function onLook() {
    if (S.raise <= 0.3 && S.t - S.lastShown < 0.5 && S.lastShown > 0) {
      S.close++; S.slow = 0.45; S.safeT = 0.9; sayMe(L().safe); Snd.duck(.35, 1)
    }
  }
  function nbTick(dt) {
    const N = S.nb
    // 出来事が優先
    if (active('sleep')) { if (N.st !== 'sleep') nbSet('sleep'); const e = active('sleep'); if (!e.warned && S.t > e.t + e.dur - 1.4) { e.warned = true; say(L().wake, 1200); Snd.play('grunt', { vol: .45, rate: .9 }) } return }
    if (active('wagon') || active('shumai')) { if (N.st !== 'aisle') nbSet('aisle'); return }
    if (active('fuji')) { if (N.st !== 'fuji') { nbSet('fuji'); say(L().fujiSay, 1500) } return }
    if (N.st === 'sleep' || N.st === 'aisle' || N.st === 'fuji') { nbSet('phone', rr(0.9, 2)); return }
    N.tt -= dt
    // 匂いが強いと、くんくんしてから向く
    if (N.st === 'phone' && S.smell > 0.55 && N.tt > 0.9) { nbSet('sniff', 1.3); say(L().sniff, 1000); Snd.play('grunt', { vol: .5 }); return }
    if (N.tt > 0) return
    if (N.st === 'phone') nbSet('tell', nbTellDur())
    else if (N.st === 'sniff') nbSet('tell', nbTellDur() * 0.8)
    else if (N.st === 'tell') N.fake ? nbSet('phone', rr(0.8, 2.2)) : nbSet('look', rr(1.1, 1.9))
    else if (N.st === 'look') nbSet('phone', nbGap())
  }

  // ---------- 後ろの子ども ----------
  function kidTick(dt) {
    const K = S.kid, e = active('kid')
    if (!e) { if (K.st !== 'off') { K.st = 'off'; S.log.push({ t: +S.t.toFixed(2), kid: 'off' }) } return }
    const into = S.t - e.t
    const st = into < 0.9 ? 'peek' : into < e.dur - 0.3 ? 'look' : 'off'
    if (st !== K.st) {
      K.st = st; S.log.push({ t: +S.t.toFixed(2), kid: st })
      if (st === 'peek') { Snd.play('cloth', { vol: .7, rate: 1.3 }); evText(L().ev.kid, 1400) }
      if (st === 'look') onLook()
    }
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
    Snd.loop('rumble', 'snd/rumble.mp3', 0.12); Snd.loop('bgm', 'snd/bgm.mp3', 0.08); Snd.loop('heart', 'snd/heart.mp3', 0.0001, 0.2)
    seed = S.forceSeed || (Date.now() % 2147483646) + 1
    Object.assign(S, { mode: 'play', t: 0, smell: 0.05, sus: 0, bites: 0, hold: false, raise: 0, biteAcc: 0, chew: 0, events: makeEvents(), said: 0, end: null, log: [], close: 0, lastShown: -9, slow: 0, safeT: 0,
      nb: { st: 'phone', tt: rr(2.6, 3.6), dur: 0, fake: false }, kid: { st: 'off', tt: 0 } })
    show('vPlay'); lastSpr = {}; buildRoute(); for (const [id, n] of [['me', 'me-normal'], ['nb', 'nb-phone'], ['oj', 'oj'], ['cond', 'cond']]) spr(id, n); resize(); puffs.length = 0
    for (const e of S.events) e.shown = false
    if (S.bot) up()
  }
  function bite() {
    S.bites++; S.biteAcc = 0; S.chew = CHEW_SEC
    S.smell += 0.1
    Snd.play('bite', { vol: .55, rate: 1.1 })
    for (let i = 0; i < 3; i++) puffs.push(newPuff(true))
    if (S.bites % D.bitesPerBun === 0) { Snd.play('paper', { vol: .4 }); bumpBox() }
    if (S.bites >= TOTAL_BITES) finish('win')
  }
  function say(s, ms = 1200) { const e = $('say'); e.textContent = s; e.classList.add('on'); clearTimeout(say.tm); say.tm = setTimeout(() => e.classList.remove('on'), ms) }
  function sayMe(s) { const e = $('sayMe'); e.textContent = s; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on') }
  function evText(s, ms = 1800) { const e = $('ev'); e.textContent = s; e.classList.add('on'); clearTimeout(evText.tm); evText.tm = setTimeout(() => e.classList.remove('on'), ms) }
  function bumpBox() { const b = $('box'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump') }
  function regionAt(t) {
    const names = lang === 'ja' ? ['京都', '米原', '浜松', '静岡', '新横浜', '品川'] : ['Kyoto', 'Maibara', 'Hamamatsu', 'Shizuoka', 'Shin-Yokohama', 'Shinagawa']
    const cut = [14, 40, 60, 78, 92, 101]; return names[cut.findIndex(c => t < c)]
  }
  function finish(kind, by) {
    if (S.mode !== 'play') return
    S.mode = kind === 'caught' ? 'caught' : 'end'; S.hold = false; $('bBite').classList.remove('hold')
    S.end = { kind, by: by || 'nb', buns: Math.floor(S.bites / D.bitesPerBun), bites: S.bites, t: S.t, where: regionAt(S.t), close: S.close }
    S.log.push({ ev: 'end', ...S.end })
    Snd.setLoopVol('heart', 0.0001, 0.6)
    if (kind === 'caught') {
      if (by !== 'kid') S.nb.st = 'angry'
      $('vPlay').classList.add('shake'); setTimeout(() => $('vPlay').classList.remove('shake'), 500)
      Snd.duck(.3, 2); Snd.play('squeak', { vol: .7, rate: .8 })
      if (by === 'kid') { say(L().kidCaught, 2200); setTimeout(() => { S.nb.st = 'angry'; say(L().caught, 1300) }, 1300) }
      else { say(L().caught, 1500); setTimeout(() => { say(L().warn, 1500); Snd.play('grunt', { vol: .6, rate: .8 }) }, 1500) }
      setTimeout(showResult, 3300)
    } else { setTimeout(showResult, kind === 'win' ? 900 : 1200); if (kind === 'late') { Snd.play('chime', { vol: .7 }); evText(`${L().arrive} ${lang === 'ja' ? '東京' : 'Tokyo'}`) } }
  }
  function rankOf(b) { let r = L().ranks[0][1]; for (const [m, n] of L().ranks) if (b >= m) r = n; return r }
  function showResult() {
    const e = S.end, t = L()
    Snd.loop('rumble', null); Snd.loop('bgm', null); Snd.loop('heart', null)
    Snd.play(e.kind === 'win' ? 'win' : 'fail', { vol: .8 })
    if (e.buns > store.get('best', -1)) store.set('best', e.buns)
    show('vRes')
    $('rTk').textContent = t.ticket; $('rFrom').textContent = t.from; $('rTo').textContent = e.kind === 'caught' ? e.where : t.to
    const d = new Date(); $('rDate').textContent = `${d.getMonth() + 1}.${d.getDate()}`
    $('rBuns').innerHTML = Array.from({ length: D.buns }, (_, i) => `<i class="${i < e.buns ? '' : 'no'}"></i>`).join('')
    $('rNum').textContent = `${t.bunsOf(e.buns, D.buns)}　${t.close2(e.close)}`
    $('rRank').textContent = rankOf(e.buns)
    $('rWhere').textContent = e.kind === 'caught' ? `${t.where(e.where)} ${e.by === 'kid' ? t.kidCaught : t.caught}` : ''
    $('rFace').src = `img/me-${e.kind === 'win' ? 'safe' : e.kind === 'caught' ? 'caught' : 'normal'}.webp`
    const st = $('stamp'); st.textContent = e.kind === 'win' ? t.resWin : e.kind === 'caught' ? t.resCaught : t.resLate
    st.classList.remove('on'); setTimeout(() => st.classList.add('on'), 250)
  }
  function post() {
    const e = S.end; if (!e) return
    const u = 'https://x.com/intent/post?text=' + encodeURIComponent(L().postText(e.buns, rankOf(e.buns), e.close)) + '&url=' + encodeURIComponent('https://tom3games.com/play/butaman-shinkansen/')
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
    g.font = '900 52px "Zen Maru Gothic",sans-serif'; g.fillStyle = '#2b2622'; g.fillText(`${t.bunsOf(e.buns, D.buns)}  ${t.close2(e.close)}`, 0, 120)
    g.strokeStyle = '#c8402e'; g.lineWidth = 10; g.beginPath(); g.arc(300, -200, 90, 0, 7); g.stroke()
    g.fillStyle = '#c8402e'; g.font = '900 40px "Zen Maru Gothic",sans-serif'; g.fillText(e.kind === 'win' ? t.resWin : e.kind === 'caught' ? t.resCaught : t.resLate, 300, -186)
    g.restore()
    g.fillStyle = '#5c544b'; g.font = '700 34px "Zen Maru Gothic",sans-serif'; g.textAlign = 'left'; g.fillText(lang === 'ja' ? '新幹線で豚まんを食べたい  tom3games.com' : 'Pork Buns on the Bullet Train  tom3games.com', 70, 1010)
    c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'butaman-shinkansen.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000) }, 'image/png')
  }

  // ---------- 1コマ ----------
  function tick(dt) {
    if (S.view !== 'vPlay' || S.mode !== 'play') return
    // ギリギリの瞬間だけゆっくり
    if (S.slow > 0) { S.slow -= dt; dt *= 0.4 }
    if (S.safeT > 0) S.safeT -= dt
    S.t += dt
    if (S.bot) botThink(dt)
    for (const e of S.events) if (!e.shown && S.t >= e.t) {
      e.shown = true
      if (e.k === 'door') { Snd.play('chime', { vol: .5 }); evText(`${lang === 'ja' ? e.st.ja : e.st.en}  ${L().ev.door}`) }
      else if (e.k === 'kid') {}
      else { evText(L().ev[e.k]); if (e.k === 'shumai') { Snd.play('paper', { vol: .7, rate: .8 }); setTimeout(() => say(L().blame, 1400), 900) } }
      if (e.k === 'cond') e.steps = 0
    }
    const fs = soon('fuji', 3); if (fs && !fs.told) { fs.told = true; evText(L().ev.fujiSoon, 2400); Snd.play('chime', { vol: .35, rate: 1.2 }) }
    const cd = active('cond'); if (cd) { const n = Math.floor((S.t - cd.t) / 0.55); if (n > cd.steps) { cd.steps = n; const mid = cd.dur / 2, x = (S.t - cd.t - mid) / mid; Snd.play('step', { vol: 0.25 + 0.5 * (1 - Math.abs(x)) }) } }
    nbTick(dt); kidTick(dt)
    // 持ち上げる・隠す
    const want = S.hold ? 1 : 0
    S.raise += (want - S.raise > 0 ? 1 / 0.16 : -1 / 0.2) * dt
    S.raise = Math.max(0, Math.min(1, S.raise))
    if (S.raise > 0.3) S.lastShown = S.t
    if (S.hold && S.raise >= 0.95) { S.biteAcc += dt; S.smell += 0.12 * dt; if (S.biteAcc >= BITE_SEC) bite() }
    if (S.mode !== 'play') return
    if (S.chew > 0) S.chew = Math.max(0, S.chew - dt)
    // 匂い
    if (S.bites < TOTAL_BITES) S.smell += 0.01 * dt
    const masked = active('wagon') || active('shumai')
    S.smell -= S.smell * (active('door') ? 1.1 : masked ? 0.6 : 0.18) * dt
    S.smell = Math.max(0, Math.min(1.4, S.smell))
    // 見られる
    const nbSees = nbFacing() === 'me', kidSees = S.kid.st === 'look'
    if (kidSees && S.raise > 0.3) return finish('caught', 'kid')
    if (nbSees) {
      if (S.raise > 0.3) S.sus += 3.2 * dt
      else if (S.chew > 0) S.sus += 0.7 * dt
      else S.sus -= 0.1 * dt
    }
    if (S.nb.st === 'sniff') S.sus += Math.max(0, S.smell - 0.35) * 0.9 * dt
    if (active('shumai')) S.sus -= 0.25 * dt
    if (!nbSees && S.smell < 0.25) S.sus -= 0.04 * dt
    S.sus = Math.max(0, Math.min(1, S.sus))
    if (S.sus > 0.45 && S.said < 1) { S.said = 1; if (S.nb.st !== 'sniff') say(L().sniff); Snd.play('grunt', { vol: .5 }) }
    if (S.sus > 0.75 && S.said < 2) { S.said = 2; say(L().sus2, 1400); Snd.play('grunt', { vol: .6, rate: .9 }) }
    if (S.sus < 0.25) S.said = 0
    if (S.sus >= 1) return finish('caught', 'nb')
    if (S.t >= D.total) return finish('late')
  }

  // ---------- 配置と匂いの粒 ----------
  const cv = $('smell'), ctx = cv.getContext('2d'); const puffs = []
  let W = 0, H = 0, DPR = 1
  let mouth = { x: 0, y: 0 }
  // 舞台（背景画像 1024x1536 の縦長）を、上の掲示板と下のトレーの間に、横いっぱい・縦は収まる大きさで置く
  function resize() {
    const sc = $('scene').getBoundingClientRect(), st = $('stage')
    const ar = 1024 / 1536
    let w = sc.width, h = w / ar
    if (h < sc.height) { h = sc.height; w = h * ar }   // 縦が余る時は縦に合わせて左右を切る
    st.style.width = w + 'px'; st.style.height = h + 'px'
    st.style.left = (sc.width - w) / 2 + 'px'; st.style.top = (sc.height - h) * 0.62 + 'px'
    DPR = Math.min(2, devicePixelRatio || 1); W = w; H = h; cv.width = W * DPR; cv.height = H * DPR
    placeLabels()
  }
  window.addEventListener('resize', () => { if (S.view === 'vPlay') resize() })
  function newPuff(big) { return { x: mouth.x + rr(-8, 8), y: mouth.y + rr(-6, 6), vx: rr(18, 50), vy: rr(-34, -14), r: big ? rr(10, 16) : rr(6, 10), life: 0, max: rr(2.2, 3.4) } }
  function drawPuffs(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H)
    if (S.mode === 'play' && rnd() < S.smell * 0.25) puffs.push(newPuff(false))
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.life += dt; if (p.life > p.max) { puffs.splice(i, 1); continue }
      p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(p.life * 3 + i) * 0.3; p.r += 9 * dt
      const k = 1 - p.life / p.max
      ctx.globalAlpha = 0.32 * k * Math.min(1, 0.4 + S.smell)
      ctx.fillStyle = '#f3c08f'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // ---------- 見た目の更新 ----------
  let lastSpr = {}
  const SPR_K = 30 / 391          // 舞台の高さに対する % ／シートの画素（主人公 391px = 舞台の 30%）
  const SCL = { me: 1.22, nb: 1, oj: 0.95, cond: 1 }   // 人ごとの大きさ（主人公を見やすく）
  const AX = { 'nb-angry': 62, 'oj-shumai': 42, 'me-safe': 44, 'cond-look': 56, 'nb-sleep': 47 }
  const sizeOf = {}
  function spr(id, name) {
    if (lastSpr[id] === name) return; lastSpr[id] = name; const el = $(id)
    const apply = () => { const h = sizeOf[name]; if (h) el.style.height = (h * SPR_K * (SCL[id] || 1)) + '%'; el.style.setProperty('--ax', (AX[name] || 50) + '%'); placeLabels() }
    if (!sizeOf[name]) { const im = new Image(); im.onload = () => { sizeOf[name] = im.naturalHeight; if (lastSpr[id] === name) apply() }; im.src = `img/${name}.webp` }
    el.src = `img/${name}.webp`; apply(); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop')
  }
  // ？の輪と吹き出しを、隣の人と自分の頭の上に置く
  function placeLabels() {
    const st = $('stage'); if (!st.offsetWidth) return
    const s0 = st.getBoundingClientRect(), n = $('nb').getBoundingClientRect(), m = $('me').getBoundingClientRect()
    const nx = (n.left + n.width / 2 - s0.left) / s0.width * 100, ny = (n.top - s0.top) / s0.height * 100
    const su = $('sus'); su.style.left = Math.min(92, nx + 13) + '%'; su.style.top = (ny + 4) + '%'
    const tm = $('tellMark'); tm.style.left = Math.max(8, nx - 16) + '%'; tm.style.top = (ny + 2) + '%'
    const sy = $('say'); sy.style.left = Math.max(22, Math.min(78, nx)) + '%'; sy.style.top = Math.max(1, ny - 7) + '%'
    const sm = $('sayMe'); sm.style.left = Math.max(16, (m.left + m.width / 2 - s0.left) / s0.width * 100) + '%'; sm.style.top = Math.max(1, (m.top - s0.top) / s0.height * 100 - 6) + '%'
    mouth = { x: m.left - s0.left + m.width * 0.52, y: m.top - s0.top + m.height * 0.42 }
  }
  function render(dt) {
    if (S.view !== 'vPlay') return
    const t = L()
    const next = D.stations.find(s => s.t > S.t) || D.stations[D.stations.length - 1]
    const near = next.t - S.t < 3
    $('lNext').textContent = `${near ? t.arrive : t.next} ${lang === 'ja' ? next.ja : next.en}`
    $('lClock').textContent = `${Math.floor(S.bites / D.bitesPerBun)}/${D.buns}`
    const rm = $('routeMe'); if (rm) rm.style.left = `calc(4px + ${prog()} * (100% - 8px))`
    $('count').textContent = `${Math.floor(S.bites / D.bitesPerBun)}/${D.buns}`
    const box = $('box').children; for (let i = 0; i < D.buns; i++) box[i].classList.toggle('gone', i < Math.floor(S.bites / D.bitesPerBun))
    $('bBite').style.setProperty('--b', `${(S.bites % D.bitesPerBun) / D.bitesPerBun * 70}%`)
    $('susArc').setAttribute('stroke-dasharray', `${(S.sus * 138).toFixed(1)} 200`)
    $('sus').style.opacity = S.sus > 0.04 || S.mode === 'caught' ? 1 : 0.3
    // 窓
    $('fuji').classList.toggle('on', !!(active('fuji') || soon('fuji', 1.2)))
    // 隣の人
    const n = S.nb.st
    const nbName = { phone: 'nb-phone', tell: 'nb-tell', look: 'nb-look', fuji: 'nb-look', sleep: 'nb-sleep', sniff: 'nb-sniff', aisle: 'nb-look', angry: 'nb-angry' }[n] || 'nb-phone'
    spr('nb', nbName); $('nb').classList.toggle('flip', n === 'aisle')
    $('tellMark').classList.toggle('on', n === 'tell' || n === 'sniff')
    // 自分
    let me = 'me-normal'
    if (S.mode === 'caught') me = 'me-caught'
    else if (S.safeT > 0) me = 'me-safe'
    else if (S.raise > 0.45) me = 'me-bite'
    else if ((n === 'tell' || S.kid.st === 'peek') && S.chew > 0) me = 'me-panic'
    else if (S.chew > 0) me = 'me-chew'
    spr('me', me)
    $('me').style.setProperty('--lift', `${-S.raise * 3}%`)
    // おじさん・車掌・子ども
    spr('oj', active('shumai') ? 'oj-shumai' : (S.t > 30 && S.t < 44 && !active('shumai')) ? 'oj-sleep' : 'oj')
    const cd = active('cond'); const cdEl = $('cond')
    if (cd) { const x = (S.t - cd.t) / cd.dur; cdEl.style.display = 'block'; cdEl.style.left = `${110 - x * 150}%`; spr('cond', Math.abs(x - 0.5) < 0.12 ? 'cond-look' : 'cond') } else cdEl.style.display = 'none'
    const kd = $('kid'); kd.className = S.kid.st === 'off' ? '' : S.kid.st
    // 危なさ
    const dg = S.mode === 'caught' ? 1 : danger()
    $('vig').style.opacity = Math.max(0, (dg - 0.3) / 0.7).toFixed(2)
    if (S.mode === 'play') Snd.setLoopVol('heart', 0.02 + dg * dg * 0.6, 0.15)
    drawPuffs(dt)
  }

  // ---------- 入力 ----------
  const bb = $('bBite')
  const down = e => { if (S.mode !== 'play' || S.bot) return; e.preventDefault(); Snd.init(); S.hold = true; bb.classList.add('hold'); try { bb.setPointerCapture(e.pointerId) } catch (er) {} }
  function up() { S.hold = false; bb.classList.remove('hold') }
  bb.addEventListener('pointerdown', down); bb.addEventListener('pointerup', up); bb.addEventListener('pointercancel', up); bb.addEventListener('pointerleave', up)
  window.addEventListener('keydown', e => { if (e.key === ' ' && S.view === 'vPlay' && !S.bot) { e.preventDefault(); if (S.mode === 'play') { S.hold = true; bb.classList.add('hold') } } })
  window.addEventListener('keyup', e => { if (e.key === ' ') up() })

  // ---------- bot（検証用） ----------
  // human: 見えている合図（前ぶれ・こっちを向く・子どもの手・富士山の予告）に 0.3〜0.5 秒遅れて反応する
  function botThink(dt) {
    const B = S.bot
    const dz = B.kind === 'greedy' ? false : (S.nb.st === 'tell' || S.nb.st === 'sniff' || nbFacing() === 'me' || S.kid.st !== 'off' || !!soon('fuji', 1.5))
    if (dz !== B.cur) { B.cur = dz; B.chg = S.t; B.react = B.human ? rr(0.28, 0.5) + (rnd() < 0.15 ? 0.35 : 0) : 0.05 }
    if (S.t - B.chg >= B.react) B.act = B.cur
    let want
    if (B.kind === 'greedy') want = true
    else if (B.kind === 'none') want = false
    else want = !B.act && S.smell < (B.human ? 0.5 : 0.52)
    S.hold = want; bb.classList.toggle('hold', want)
  }

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
    const imgs = ['bg', 'me-normal', 'me-bite', 'me-chew', 'me-panic', 'me-caught', 'me-safe', 'nb-phone', 'nb-tell', 'nb-look', 'nb-sleep', 'nb-sniff', 'nb-angry', 'oj', 'oj-shumai', 'oj-sleep', 'cond', 'cond-look', 'kid'].map(n => `img/${n}.webp`)
    const files = [...new Set(Object.values(Snd.files).flat().concat(['snd/rumble.mp3', 'snd/bgm.mp3', 'snd/heart.mp3']))]
    const all = files.length + imgs.length
    let done = 0; const bar = document.querySelector('#loadBar i'); const tickBar = () => { done++; bar.style.width = (done / all * 100) + '%' }
    const hide = () => { const l = $('loading'); if (!l || l.dataset.gone) return; l.dataset.gone = 1; l.style.opacity = 0; setTimeout(() => l.remove(), 400) }
    setTimeout(hide, 12000)
    await Promise.all([
      ...files.map(u => fetch(u).then(r => r.arrayBuffer()).catch(() => null).then(tickBar)),
      ...imgs.map(u => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = u }).then(tickBar)),
    ])
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
      bot(kind, human = false) { S.bot = kind ? { kind, human, cur: null, chg: 0, react: 0, act: false } : null },
      hold(v) { S.hold = v },
      danger, nbFacing,
      tune(o) { if (o.B) BITE_SEC = o.B; if (o.P) { D.bitesPerBun = o.P; TOTAL_BITES = D.buns * o.P } if (o.G0) G0 = o.G0; if (o.G1) G1 = o.G1; if (o.T0) T0 = o.T0; if (o.T1) T1 = o.T1 },
      showResult,
    },
  }
  // 検査用: ?auto=1 で人並みの速さの bot が通しで遊ぶ（iPhone のシミュレーターで最後まで見るため）
  if (qs.get('auto') === '1') setTimeout(() => { S.bot = { kind: 'smart', human: true, cur: null, chg: 0, react: 0, act: false }; start() }, 1500)
  window.__bsReady = true
})()
