// 新幹線で豚まんを食べたい: 文言とデータ
window.BS_DATA = {
  // 駅（表示する順）。t はゲーム内の秒（全体 100 秒）
  stations: [
    { t: 0, ja: '新大阪', en: 'Shin-Osaka' },
    { t: 14, ja: '京都', en: 'Kyoto' },
    { t: 40, ja: '名古屋', en: 'Nagoya' },
    { t: 78, ja: '新横浜', en: 'Shin-Yokohama' },
    { t: 92, ja: '品川', en: 'Shinagawa' },
    { t: 100, ja: '東京', en: 'Tokyo' },
  ],
  total: 100,
  buns: 4,          // 豚まんの数
  bitesPerBun: 6,   // 1個あたりの口数
}

window.BS_TXT = {
  ja: {
    title1: '新幹線で', title2: '豚まんを食べたい',
    sub: '隣の人にバレずに、東京までに4個',
    start: '乗車する', how: '遊び方', lang: 'English', best: 'さいこう',
    loading: '豚まんを温めています',
    howTitle: '遊び方',
    howBody: [
      ['食べる', '豚まんを長押しするとかじる。かじるたびに匂いが広がる'],
      ['バレる', '隣の人の「？」が満タンになると注意されて終わり'],
      ['隙', '隣が寝た時・車内販売のコーヒー・富士山・通路のおじさんのシュウマイは食べどき'],
    ],
    close: 'とじる', hold: '長押しでかじる',
    next: '次は', arrive: 'まもなく',
    ev: { sleep: '隣が寝た', wake: '起きた…', wagon: '車内販売のコーヒー', fuji: '富士山だ', shumai: 'おじさんがシュウマイを開けた', door: 'ドアが開いた' },
    sniff: 'ん？', sus2: '…なんか匂う', caught: '…豚まん？', warn: 'あの、ここ新幹線なんで',
    blame: '…シュウマイか',
    resWin: '完食', resCaught: '注意された', resLate: '東京に着いた',
    bunsOf: (a, b) => `豚まん ${a}/${b}個`,
    ticket: '乗車券', from: '新大阪', to: '東京',
    again: 'もう一回', post: 'Xでポスト', save: '画像を保存',
    where: s => `${s}付近で`,
    ranks: [[0, '匂いだけ持ち込んだ人'], [1, '一口勢'], [2, '半分勢'], [3, 'あと一個の人'], [4, '豚まんの鉄人']],
    postText: (n, r) => `新幹線で豚まん${n}個食べた。称号「${r}」 #新幹線で豚まん`,
    credits: '音: Lexcie / Philt3r（CC BY 4.0）/ crueltyinc / rubberduck / StarNinjas / Kenney / bart / Almitory（CC0）',
  },
  en: {
    title1: 'Pork Buns', title2: 'on the Bullet Train',
    sub: 'Eat 4 before Tokyo without your neighbor noticing',
    start: 'Board', how: 'How to play', lang: '日本語', best: 'BEST',
    loading: 'Warming the buns',
    howTitle: 'How to play',
    howBody: [
      ['Eat', 'Hold the bun to take a bite. Every bite spreads the smell'],
      ['Caught', 'When your neighbor\'s ? fills up, you get told off'],
      ['Chances', 'Eat when they nap, when the coffee cart passes, at Mt. Fuji, or when the man across opens his dumplings'],
    ],
    close: 'Close', hold: 'Hold to bite',
    next: 'Next', arrive: 'Arriving',
    ev: { sleep: 'Neighbor dozed off', wake: 'Awake again…', wagon: 'Coffee cart', fuji: 'Mt. Fuji!', shumai: 'The man opened dumplings', door: 'Doors open' },
    sniff: 'Hm?', sus2: '…something smells', caught: '…pork bun?', warn: 'Excuse me, this is a train.',
    blame: '…dumplings, huh',
    resWin: 'ALL EATEN', resCaught: 'TOLD OFF', resLate: 'ARRIVED',
    bunsOf: (a, b) => `${a}/${b} buns`,
    ticket: 'TICKET', from: 'Shin-Osaka', to: 'Tokyo',
    again: 'Play again', post: 'Post on X', save: 'Save image',
    where: s => `near ${s}`,
    ranks: [[0, 'Only Brought the Smell'], [1, 'One-Biter'], [2, 'Halfway Eater'], [3, 'One Bun Short'], [4, 'Pork Bun Iron Chef']],
    postText: (n, r) => `I ate ${n} pork buns on the bullet train. Title: ${r}`,
    credits: 'Sounds: Lexcie / Philt3r (CC BY 4.0) / crueltyinc / rubberduck / StarNinjas / Kenney / bart / Almitory (CC0)',
  },
}
