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
  bitesPerBun: 8,   // 1個あたりの口数（1口 0.6 秒）
}

window.BS_TXT = {
  ja: {
    title1: '新幹線で', title2: '豚まんを食べたい',
    sub: '隣の人が見ていない間に、東京までに4個',
    start: '乗車する', how: '遊び方', lang: 'English', best: 'さいこう',
    loading: '豚まんを温めています',
    howTitle: '遊び方',
    howBody: [
      ['食べる', '豚まんを長押しでかじる。指を離すとすぐ隠す'],
      ['見られる', '隣の人がこっちを向いた時に食べていたら終わり。もぐもぐ中の頬もあやしまれる'],
      ['前ぶれ', '向く前にスマホが下がって目が動く。でも途中でやめることもある'],
      ['隙', '居眠り・車内販売・おじさんのシュウマイは食べどき。富士山はみんな窓（こっち）を見る'],
    ],
    close: 'とじる', hold: '長押しでかじる',
    next: '次は', arrive: 'まもなく',
    ev: { sleep: '隣が寝た', wagon: '車内販売がきた', fujiSoon: 'まもなく富士山', fuji: '富士山だ', shumai: 'おじさんがシュウマイを開けた', door: 'ドアが開いた', kid: '後ろに子ども…' },
    sniff: 'ん？', sus2: '…なんか匂う', caught: '…豚まん？', warn: 'あの、ここ新幹線なんで',
    blame: '…シュウマイか', wake: 'ん…', fujiSay: 'おお…富士山',
    kidCaught: 'ママー！ぶたまん食べてる！', safe: 'セーフ',
    resWin: '完食', resCaught: '注意された', resLate: '東京に着いた',
    bunsOf: (a, b) => `豚まん ${a}/${b}個`,
    close2: n => `ギリギリ ${n}回`,
    ticket: '乗車券', from: '新大阪', to: '東京',
    again: 'もう一回', post: 'Xでポスト', save: '画像を保存',
    where: s => `${s}付近で`,
    ranks: [[0, '匂いだけ持ち込んだ人'], [1, '一口勢'], [2, '半分勢'], [3, 'あと一個の人'], [4, '豚まんの鉄人']],
    postText: (n, r, c) => `新幹線で豚まん${n}個食べた。ギリギリ${c}回。称号「${r}」 #新幹線で豚まん`,
    credits: '音: Lexcie / Philt3r（CC BY 4.0）/ ezwa（PD）/ crueltyinc / rubberduck / StarNinjas / Kenney / bart / Almitory（CC0）',
  },
  en: {
    title1: 'Pork Buns', title2: 'on the Bullet Train',
    sub: 'Eat 4 before Tokyo while your neighbor isn\'t looking',
    start: 'Board', how: 'How to play', lang: '日本語', best: 'BEST',
    loading: 'Warming the buns',
    howTitle: 'How to play',
    howBody: [
      ['Eat', 'Hold the bun to bite. Let go to hide it at once'],
      ['Seen', 'If your neighbor turns while you eat, it\'s over. Chewing cheeks look suspicious too'],
      ['Tells', 'Before turning, his phone drops and his eyes slide. Sometimes he stops halfway'],
      ['Chances', 'Naps, the coffee cart and the dumpling man are safe. At Mt. Fuji everyone looks at the window (you)'],
    ],
    close: 'Close', hold: 'Hold to bite',
    next: 'Next', arrive: 'Arriving',
    ev: { sleep: 'Neighbor dozed off', wagon: 'Coffee cart', fujiSoon: 'Mt. Fuji soon', fuji: 'Mt. Fuji!', shumai: 'The man opened dumplings', door: 'Doors open', kid: 'A kid behind you…' },
    sniff: 'Hm?', sus2: '…something smells', caught: '…pork bun?', warn: 'Excuse me, this is a train.',
    blame: '…dumplings, huh', wake: 'Mm…', fujiSay: 'Ooh… Fuji',
    kidCaught: 'Mom! She\'s eating a pork bun!', safe: 'SAFE',
    resWin: 'ALL EATEN', resCaught: 'TOLD OFF', resLate: 'ARRIVED',
    bunsOf: (a, b) => `${a}/${b} buns`,
    close2: n => `${n} close calls`,
    ticket: 'TICKET', from: 'Shin-Osaka', to: 'Tokyo',
    again: 'Play again', post: 'Post on X', save: 'Save image',
    where: s => `near ${s}`,
    ranks: [[0, 'Only Brought the Smell'], [1, 'One-Biter'], [2, 'Halfway Eater'], [3, 'One Bun Short'], [4, 'Pork Bun Iron Chef']],
    postText: (n, r, c) => `I ate ${n} pork buns on the bullet train with ${c} close calls. Title: ${r}`,
    credits: 'Sounds: Lexcie / Philt3r (CC BY 4.0) / ezwa (PD) / crueltyinc / rubberduck / StarNinjas / Kenney / bart / Almitory (CC0)',
  },
}
