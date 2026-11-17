// 🧸 도트 인형 v2 (v2.9) — 16×26칸짜리 꼬마 캐릭터를 코드로 그린다 (직접 디자인한 그림 · SVG 네모들 · 내려받는 파일 없음 · 다른 파일을 안 불러오는 순수한 조각).
//   옷 · 머리는 「모양(윤곽) + 무늬」를 겹쳐 만든다. 명암 · 테두리는 그릴 때 자동으로 넣는다 (아래 · 오른쪽 가장자리는 어둡게).
//   겹치는 순서: 뒤쪽 머리 · 망토 · 날개 → 몸 → 하의 → 신발 → 상의 → 앞머리 → 겉옷 → 얼굴 → 장신구 → 손에 든 것 → 다친 곳(빨갛게)
//   글자: s 살 · h 머리카락 · c 옷 색 · a 포인트 색(옷 색을 밝게) · L 옷 색의 밝은 쪽 · w 흰색 · k 짙은 갈색 · g 바닥 그림자
//   이 파일은 욕구 · 옷차림 탭을 켠 채팅에서만 불러온다 (life.js loadDL).
export const W = 16, H = 26;
const E = '.'.repeat(W);
// m(시작 줄, '줄', '줄*반복', …)
function m(start, ...rs) { const a = Array(H).fill(E); let y = start; for (const r of rs) { const i = r.indexOf('*'), row = i < 0 ? r : r.slice(0, i), n = i < 0 ? 1 : Number(r.slice(i + 1)); for (let k = 0; k < n && y < H; k++) a[y++] = row; } return a; }
// 여러 장을 겹친다 (뒤에 온 것이 위)
const U = (...maps) => Array.from({ length: H }, (_, y) => { const row = E.split(''); for (const mp of maps) if (mp) for (let x = 0; x < W; x++) if (mp[y][x] !== '.') row[x] = mp[y][x]; return row.join(''); });
const re = (mp, from, to) => mp.map(r => r.replaceAll(from, to)); // 글자 바꾸기 (같은 윤곽을 다른 색 글자로)

const BODY = m(4, '....ssssssss....', '...ssssssssss...*8', '....ssssssss....', '......ssss......', '....ssssssss....', '...ssssssssss...*3', '...ss.ssss.ss...', '.....ssssss.....', '.....ss..ss.....*3', '....sss..sss....');
const GROUND = m(25, '....gggggggg....');

// ───── 머리 모양 ─────
const cap = m(3, '....hhhhhhhh....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..*2');
const capBig = m(2, '....hhhhhhhh....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '.hhhhhhhhhhhhhh.*2');
const capFlat = m(4, '....hhhhhhhh....', '...hhhhhhhhhh...', '...h........h...');
const fFull = m(7, '..hhhhhhhhhhhh..', '..hh........hh..'), fPart = m(7, '..hhhh....hhhh..', '..hh........hh..'), fSide = m(7, '..hhhhhhhh..hh..', '..hhhh......hh..');
const fZig = m(7, '..hhh.hh.hh.hh..', '..hh........hh..'), fWisp = m(7, '..hhh.h..h.hhh..', '..hh........hh..'), fNone = m(7, '..hh........hh..');
const sEar = m(8, '..hh........hh..*2'), sChin = m(8, '..hh........hh..*4'), sBob = m(8, '..hh........hh..*5', '..hhh......hhh..'), sHime = m(8, '..hhh......hhh..*4');
const bLong = m(8, '..hhhhhhhhhhhh..*11', '...hhhhhhhhhh...'), bMid = m(8, '..hhhhhhhhhhhh..*8', '...hhhhhhhhhh...');
const bWavy = m(8, '..hhhhhhhhhhhh..*3', '.hhhhhhhhhhhhhh.*2', '..hhhhhhhhhhhh..*2', '.hhhhhhhhhhhhhh.*2', '..hhhhhhhhhhhh..*2', '...hh.hhhh.hh...');
const tails = m(6, 'hh............hh*2', 'hhh..........hhh', 'hh............hh*6', '.h............h.');
const braids = m(10, '.hh..........hh.*3', '.aa..........aa.', '.hh..........hh.*3', '..h..........h..');
const pony = m(5, '..............hh', '.............hhh*2', '..............hh*5', '..............h.');
const ponyHigh = U(m(1, '.........hhh....', '..........hhh...', '...........hhh..'), m(4, '............hhh.', '.............hh.*4', '.............h..'));
const bun = m(1, '......hhhh......', '.....hhhhhh.....'), buns2 = m(2, '.hhh........hhh.*2');
const spikes = m(1, '...h..h..h..h...', '..hhh.hhhhh.hhh.'), mohawk = m(0, '.......hh.......*4'), ahoge = m(1, '.......h........', '........h.......');
const afro = m(1, '....hhhhhhhh....', '..hhhhhhhhhhhh..', '.hhhhhhhhhhhhhh.', 'hhhhhhhhhhhhhhhh*4', 'hhh..........hhh*2', '.hh..........hh.');
const curls = m(8, '.hhh........hhh.', '..hh........hh..', '.hhh........hhh.', '..hh........hh..', '.hhh........hhh.');
export const HAIRS = {
    short: { n: '짧은 머리', f: U(cap, fZig, sEar) }, sidepart: { n: '가르마', f: U(cap, fSide, sEar) }, bowl: { n: '바가지', f: U(cap, fFull, sEar) },
    bob: { n: '단발', f: U(cap, fFull, sBob) }, bobpart: { n: '가르마 단발', f: U(cap, fPart, sBob) }, midi: { n: '중단발', f: U(cap, fWisp, sChin), b: bMid },
    long: { n: '긴 생머리', f: U(cap, fFull, sChin), b: bLong }, longpart: { n: '긴 가르마', f: U(cap, fPart, sChin), b: bLong }, hime: { n: '공주 컷', f: U(cap, fFull, sHime), b: bLong },
    wavy: { n: '웨이브', f: U(capBig, fSide, sChin), b: bWavy }, curly: { n: '곱슬', f: U(capBig, fWisp, curls) }, afro: { n: '아프로', f: U(afro, fNone) },
    tails: { n: '양갈래', f: U(cap, fFull, sEar, tails) }, braids: { n: '땋은 머리', f: U(cap, fPart, sEar, braids) }, pony: { n: '옆 포니테일', f: U(cap, fSide, sEar, pony) },
    ponyhigh: { n: '높은 포니테일', f: U(cap, fWisp, sEar, ponyHigh) }, bun: { n: '올림머리', f: U(cap, fPart, sEar, bun) }, buns: { n: '당고머리', f: U(cap, fFull, sEar, buns2) },
    spiky: { n: '삐죽 머리', f: U(cap, fZig, sEar, spikes) }, ahoge: { n: '바보털', f: U(cap, fZig, sEar, ahoge) }, slick: { n: '올백', f: U(cap, fNone, sEar) },
    mohawk: { n: '모히칸', f: U(capFlat, mohawk) }, buzz: { n: '스포츠', f: capFlat }, none: { n: '없음', f: m(0) },
};

// ───── 표정 ─────
const P = (...pts) => { const g = Array.from({ length: H }, () => E.split('')); for (const [y, x, ch] of pts) g[y][x] = ch; return g.map(r => r.join('')); };
const eyes = [[8, 5, 'e'], [9, 5, 'e'], [8, 10, 'e'], [9, 10, 'e']], blush = [[10, 4, 'b'], [10, 11, 'b']], shut = [[9, 4, 'e'], [9, 5, 'e'], [9, 6, 'e'], [9, 9, 'e'], [9, 10, 'e'], [9, 11, 'e']];
const arc = [[8, 5, 'e'], [9, 4, 'e'], [9, 6, 'e'], [8, 10, 'e'], [9, 9, 'e'], [9, 11, 'e']];
const mSmile = [[11, 6, 'm'], [12, 7, 'm'], [12, 8, 'm'], [11, 9, 'm']], mFlat = [[11, 7, 'm'], [11, 8, 'm']], mFrown = [[12, 6, 'm'], [11, 7, 'm'], [11, 8, 'm'], [12, 9, 'm']], mOpen = [[11, 7, 'm'], [11, 8, 'm'], [12, 7, 'm'], [12, 8, 'p']];
const FACE = {
    smile: P(...eyes, ...blush, ...mSmile), happy: P(...arc, ...blush, ...mOpen), neutral: P(...eyes, ...mFlat),
    sad: P(...eyes, [7, 4, 'e'], [6, 5, 'e'], [6, 10, 'e'], [7, 11, 'e'], ...mFrown), angry: P(...eyes, [6, 4, 'e'], [7, 5, 'e'], [7, 10, 'e'], [6, 11, 'e'], [11, 6, 'm'], [11, 7, 'm'], [11, 8, 'm'], [11, 9, 'm']),
    surprised: P(...eyes, [7, 5, 'e'], [7, 10, 'e'], [11, 7, 'm'], [11, 8, 'm'], [12, 7, 'm'], [12, 8, 'm']), sleepy: P(...shut, [11, 7, 'm'], [6, 12, 't'], [5, 13, 't']),
    wink: P([8, 5, 'e'], [9, 5, 'e'], [9, 9, 'e'], [9, 10, 'e'], [9, 11, 'e'], ...blush, ...mSmile), cry: P(...shut, [10, 5, 't'], [11, 5, 't'], [10, 10, 't'], [11, 10, 't'], ...mFrown),
    dizzy: P([8, 4, 'e'], [8, 6, 'e'], [9, 5, 'e'], [10, 4, 'e'], [10, 6, 'e'], [8, 9, 'e'], [8, 11, 'e'], [9, 10, 'e'], [10, 9, 'e'], [10, 11, 'e'], [11, 6, 'm'], [12, 7, 'm'], [11, 8, 'm'], [12, 9, 'm'], [6, 12, 't'], [7, 12, 't']),
    love: P([8, 4, 'p'], [8, 6, 'p'], [9, 4, 'p'], [9, 5, 'p'], [9, 6, 'p'], [10, 5, 'p'], [8, 9, 'p'], [8, 11, 'p'], [9, 9, 'p'], [9, 10, 'p'], [9, 11, 'p'], [10, 10, 'p'], ...mSmile),
    smirk: P(...eyes, [11, 7, 'm'], [11, 8, 'm'], [10, 9, 'm']), shy: P([9, 5, 'e'], [9, 10, 'e'], [10, 3, 'b'], [10, 4, 'b'], [10, 5, 'b'], [10, 10, 'b'], [10, 11, 'b'], [10, 12, 'b'], [11, 7, 'm']),
    tongue: P(...arc, ...blush, [11, 7, 'm'], [11, 8, 'm'], [12, 8, 'p']),
};
export const FACES = { auto: '기분 따라', smile: '미소', happy: '활짝', neutral: '무표정', sad: '슬픔', angry: '화남', surprised: '놀람', sleepy: '졸림', wink: '윙크', cry: '눈물', dizzy: '어질', love: '하트', smirk: '씨익', shy: '수줍', tongue: '메롱' };
const MOOD_FACE = ['dizzy', 'sad', 'neutral', 'smile', 'happy'];

// ───── 옷 ─────
const tee = m(15, '....cccccccc....', '...cccccccccc...', '.....cccccc.....*3'), long = m(15, '....cccccccc....', '...cccccccccc...*3', '.....cccccc.....');
const tank = m(15, '.....cccccc.....*5'), crop = m(15, '....cccccccc....', '...cccccccccc...', '.....cccccc.....');
const stripes = m(17, '.....aaaaaa.....', E, '.....aaaaaa.....'), collar = m(15, '.....ww..ww.....'), buttons = m(16, '.......k........*4'), pocket = m(18, '......LLLL......');
const hem = m(19, '.....aaaaaa.....'), cuffs = m(18, '...aa......aa...'), belt = m(19, '.....kkakkk.....'), tie = m(15, '.......aa.......*3', '.......a........');
const vee = m(15, '.......ss.......'), heart = m(17, '......a.a.......', '......aaa.......', '.......a........'), star = m(17, '.......a........', '......aaa.......', '.......a........');
const skirtPart = m(20, '....cccccccc....', '...cccccccccc...*2'), skirtLong = m(20, '....cccccccc....', '...cccccccccc...*3', '..cccccccccccc..');
const TOPS = {
    tee: ['반팔', tee], long: ['긴팔', long], tank: ['민소매', tank], crop: ['크롭', crop], stripe: ['줄무늬 반팔', U(tee, stripes)], stripelong: ['줄무늬 긴팔', U(long, stripes)],
    shirt: ['셔츠', U(long, collar, buttons)], polo: ['폴로', U(tee, collar)], hoodie: ['후드티', U(long, pocket, m(15, '......k..k......*2'))], sweater: ['스웨터', U(long, hem, cuffs)],
    turtle: ['목폴라', U(long, m(14, '......cccc......'))], vneck: ['브이넥', U(tee, vee)], hearttee: ['하트 티', U(tee, heart)], startee: ['별 티', U(long, star)],
    overalls: ['멜빵', U(re(tee, 'c', 'w'), m(15, '.....c....c.....*2', '.....cccccc.....*3'))], apron: ['앞치마', U(tee, m(16, '......wwww......', '.....wwwwww.....*3'))],
    sailor: ['세일러', U(tee, m(15, '....wwwwwwww....', '.....ww..ww.....'), m(16, '.......aa.......', '.......a........'))], suit: ['정장', U(long, m(15, '.....kwwwwk.....', '......kwwk......'), tie)],
    kimono: ['기모노 · 한복', U(long, m(15, '.....a....a.....', '......a..a......', '.......aa.......'), m(19, '.....aaaaaa.....'))], armor: ['갑옷', U(tee, m(16, '.....LLLLLL.....'), m(18, '.....kkkkkk.....'))],
    chain: ['사슬 갑옷', U(tee, m(16, '.....k.k.k......', '......k.k.k.....', '.....k.k.k......', '......k.k.k.....'))], tunic: ['튜닉', U(tee, belt)],
    dress: ['원피스', U(tee, skirtPart)], longdress: ['긴 드레스', U(long, skirtLong)], sundress: ['끈 원피스', U(tank, skirtPart, hem)], offshoulder: ['오프숄더', m(16, '...cccccccccc...*3', '.....cccccc.....')],
};
const pants = m(20, '.....cccccc.....', '.....cc..cc.....*3'), shorts = m(20, '.....cccccc.....', '.....cc..cc.....'), wide = m(20, '.....cccccc.....', '....ccc..ccc....*3');
const skirt = m(20, '....cccccccc....', '...cccccccccc...'), longskirt = m(20, '....cccccccc....', '...cccccccccc...*3'), mini = m(20, '....cccccccc....');
const beltB = m(20, '.....kkakkk.....');
const BOTTOMS = {
    pants: ['바지', pants], jeans: ['청바지', U(pants, m(23, '.....LL..LL.....'))], slacks: ['슬랙스', U(pants, beltB)], cargo: ['카고 바지', U(pants, m(21, '.....L....L.....'))],
    sweat: ['트레이닝 바지', U(pants, m(21, '.....a....a.....*3'))], patched: ['기운 바지', U(pants, m(22, '.....aa.........'))], greaves: ['다리 갑옷', U(pants, m(22, '.....LL..LL.....'), beltB)],
    shorts: ['반바지', shorts], shortscuff: ['접은 반바지', U(shorts, m(21, '.....LL..LL.....'))], swim: ['수영복', U(shorts, m(20, '.....aaaaaa.....'))],
    wide: ['통바지', wide], hakama: ['하카마', U(wide, m(20, '.....aaaaaa.....'))], skirt: ['치마', skirt], pleated: ['주름치마', U(skirt, m(21, '....L..LL..L....'))],
    plaid: ['체크 치마', U(skirt, m(21, '...a..a..a..a...'))], frill: ['프릴 치마', U(skirt, m(22, '...wwwwwwwwww...'))], mini: ['미니스커트', mini], tights: ['치마 + 스타킹', U(skirt, m(22, '.....kk..kk.....*2'))],
    longskirt: ['긴 치마', longskirt], tiered: ['티어드 치마', U(longskirt, m(21, '...aaaaaaaaaa...'), m(23, '...aaaaaaaaaa...'))],
};
const jacket = m(15, '...ccc....ccc...', '..cccc....cccc..*4'), coatLow = m(20, '....cc....cc....*2'), coatLong = m(20, '....cc....cc....*4');
const robe = m(15, '...cccccccccc...', '..cccccccccccc..*4', '....cccccccc....*4'), capeB = m(14, '...cccccccccc...', '..cccccccccccc..*8', '...cccccccccc...');
const hoodRing = m(2, '....cccccccc....', '...cc......cc...', '..cc........cc..*9', '...c........c...'), clasp = m(14, '......cccc......');
const OUTERS = {
    coat: ['코트', U(jacket, coatLow)], longcoat: ['롱코트', U(jacket, coatLong)], trench: ['트렌치코트', U(jacket, coatLong, m(19, '..kkkk....kkkk..'))], labcoat: ['가운', U(jacket, coatLong, m(17, '..cL........Lc..'))],
    jacket: ['재킷', jacket], blazer: ['블레이저', U(jacket, m(16, '.....k....k.....*2'))], denim: ['청재킷', U(jacket, m(19, '..aa........aa..'), m(16, '....L......L....'))], cardigan: ['가디건', U(jacket, m(16, '.....k....k.....*4'))],
    parka: ['파카', U(jacket, coatLow, m(15, '...www....www...'))], puffer: ['패딩', U(m(15, '..cccc....cccc..', '.ccccc....ccccc.*3', '..cccc....cccc..'), m(17, '.LLLLL....LLLLL.'))], vest: ['조끼', m(15, '.....cc..cc.....*5')],
    haori: ['하오리', U(jacket, coatLow, m(15, '.....a....a.....*7'))], robe: ['로브', U(robe, m(19, '..kkkkkaakkkkk..'))], poncho: ['판초 · 우비', m(14, '.....cccccc.....', '...cccccccccc...', '..cccccccccccc..*2', '...cccccccccc...', '....cccccccc....')],
    shawl: ['숄', m(14, '....cccccccc....', '...cccccccccc...', '...ccc....ccc...')], cape: ['망토', clasp, capeB], cloak: ['후드 망토', U(hoodRing, clasp, m(15, '...ccc....ccc...', '..ccc......ccc..*5')), capeB],
    raincoat: ['후드 우비', U(hoodRing, jacket, coatLow)], pauldron: ['견갑', U(m(15, '..cccc....cccc..', '..ccL......Lcc..'))], scarfcoat: ['목도리 코트', U(jacket, coatLow, m(13, '....aaaaaaaa....*2', '.........aa.....*3'))],
};
const SHOESET = {
    shoes: ['신발', m(23, '.....cc..cc.....', '....ccc..ccc....')], sneakers: ['운동화', m(23, '.....cc..cc.....', '....www..www....')], hightop: ['하이탑', m(22, '.....cc..cc.....*2', '....www..www....')],
    boots: ['부츠', m(22, '.....cc..cc.....*2', '....ccc..ccc....')], tall: ['롱부츠', m(21, '.....cc..cc.....*3', '....ccc..ccc....')], rain: ['장화', U(m(22, '.....cc..cc.....*2', '....ccc..ccc....'), m(22, '.....LL..LL.....'))],
    fur: ['털 부츠', U(m(22, '.....cc..cc.....*2', '....ccc..ccc....'), m(22, '.....ww..ww.....'))], work: ['작업화', U(m(22, '.....cc..cc.....*2', '....kkk..kkk....'), m(23, '.....aa..aa.....'))],
    sandals: ['샌들', m(23, '.....a....a.....', '....ccc..ccc....')], slippers: ['슬리퍼', m(24, '....ccc..ccc....')], loafers: ['로퍼', U(m(23, '.....cc..cc.....', '....ccc..ccc....'), m(23, '.....a....a.....'))],
    heels: ['구두', m(23, '.....cc..cc.....', '....cc.kk.cc....')], geta: ['게다', m(23, '.....a....a.....', '....kkk..kkk....')], socks: ['양말', m(22, '.....cc..cc.....*2', '....ccc..ccc....')],
    kneesocks: ['긴 양말 + 신발', U(m(21, '.....ww..ww.....*2'), m(23, '.....cc..cc.....', '....ccc..ccc....'))], sabatons: ['철 장화', U(m(21, '.....cc..cc.....*3', '....ccc..ccc....'), m(22, '.....LL..LL.....'))],
};
const ACCS = {
    cap: ['야구 모자', m(2, '....cccccccc....', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccccc')], beanie: ['비니', U(m(2, '....cccccccc....', '...cccccccccc...', '..cccccccccccc..*2', '..aaaaaaaaaaaa..'), m(1, '.......ww.......'))],
    straw: ['챙 넓은 모자', m(2, '.....cccccc.....', '....cccccccc....', '....aaaaaaaa....', 'cccccccccccccccc', '.cccccccccccccc.')], tophat: ['실크햇', m(0, '.....cccccc.....*4', '.....aaaaaa.....', '...cccccccccc...')],
    witch: ['마녀 모자', m(0, '.......cc.......', '......ccc.......', '.....cccc.......', '....cccccc......', '...ccaaaaaacc...', '.cccccccccccccc.')], beret: ['베레모', m(2, '......ccccccc...', '....ccccccccccc.', '...ccccccccccc..')],
    helmet: ['투구 · 헬멧', U(m(2, '....cccccccc....', '...cccccccccc...', '..cccccccccccc..*3', '..cc........cc..*2'), m(3, '.......LL.......*3'))], bandana: ['두건', m(4, '...cccccccccc...', '..cccccccccccc..', '.............cc.')],
    crown: ['왕관', m(1, '....c..cc..c....', '....cccccccc....', '....caccacca....')], tiara: ['티아라', m(4, '.....ccaacc.....')], headband: ['머리띠', m(5, '..cccccccccccc..')],
    ribbon: ['리본', m(2, '..........cc.cc.', '...........ccc..', '..........cc.cc.')], flower: ['꽃', m(4, '...........cac..', '..........caaac.', '...........cac..')],
    catears: ['고양이 귀', m(1, '...c........c...', '..ccc......ccc..', '..caac....caac..')], bunny: ['토끼 귀', m(0, '....cc....cc....*2', '....ca....ac....', '....cc....cc....')], horns: ['뿔', m(2, '..c..........c..', '..cc........cc..', '...c........c...')],
    halo: ['천사 고리', m(0, '.....cccccc.....', '....c......c....', '.....cccccc.....')], glasses: ['안경', m(7, '...cccc..cccc...', '...c..cccc..c...', '...c..c..c..c...', '...cccc..cccc...')],
    shades: ['선글라스', m(8, '...cccccccccc...', '...cccc..cccc...')], eyepatch: ['안대', U(m(6, '...cccccccccc...'), m(7, '.........ccc....*3'))], mask: ['마스크', m(10, '...cccccccccc...*2', '....cccccccc....')],
    scarf: ['목도리', m(13, '....cccccccc....*2', '.........cc.....*3')], necklace: ['목걸이', m(15, '......c..c......', '.......aa.......')], bowtie: ['나비넥타이', m(15, '.....cc.acc.....')],
    earrings: ['귀걸이', m(10, '..c..........c..*2')], wings: ['날개', null, m(13, 'cc............cc', 'ccc..........ccc*2', '.cc..........cc.')], backpack: ['배낭', m(15, '....a......a....*3'), m(14, '..cccccccccccc..*5')],
};
const WEAPONS = {
    sword: ['검', m(7, '..............c.*9', '.............aaa', '..............k.*3')], dagger: ['단검', m(13, '..............c.*3', '.............aaa', '..............k.*2')], axe: ['도끼', m(9, '.............ccc', '............cccc', '.............ccc', '..............k.*8')],
    hammer: ['망치', m(9, '............cccc*2', '..............k.*9')], staff: ['지팡이', m(4, '.............aaa', '.............aca', '.............aaa', '..............k.*15')], wand: ['요술봉', m(12, '..............a.', '.............aaa', '..............a.', '..............c.*5')],
    spear: ['창', m(3, '..............c.', '.............ccc', '..............c.', '..............k.*17')], bow: ['활', m(9, '............cc..', '..............c.', '..............cw*6', '..............c.', '............cc..')], gun: ['권총', m(17, '............cccc', '............k...')],
    rifle: ['소총', m(11, '..............c.*6', '.............ck.', '.............k..*2')], shield: ['방패', m(14, '............cccc', '...........ccacc', '...........caaac', '...........ccacc', '............ccc.')], pickaxe: ['곡괭이', m(9, '...........ccccc', '..........c...k.', '..............k.*9')],
    hoe: ['괭이 · 삽', m(9, '.............ccc', '..............k.*10')], trowel: ['모종삽 · 도구', m(14, '..............c.', '.............ccc', '..............c.', '..............k.*3')], rod: ['낚싯대', m(5, '............k...', '.............k..', '..............k.*13')],
    can: ['물뿌리개', m(16, '............c...', '.............ccc', '............cccc', '.............ccc')], basket: ['바구니', m(15, '.............kk.', '............k..k', '............cccc*2', '............aaaa')], bag: ['가방', m(13, '.............k..*3', '............cccc*3')],
    book: ['책', m(16, '............cccc', '............cwwc', '............cccc')], lantern: ['등불', m(14, '..............k.', '.............ccc', '.............cac', '.............ccc')], umbrella: ['우산', m(3, '............cccc', '..........cccccc', '.........ccccccc', '..............k.*16')],
    torch: ['횃불', m(10, '..............a.', '.............aaa', '..............k.*8')], bouquet: ['꽃다발', m(13, '............aca.', '.............a..', '..............k.*5')], broom: ['빗자루', m(6, '..............k.*10', '.............ccc*3')],
};
const pack = (o) => Object.fromEntries(Object.entries(o).map(([id, [n, f, b]]) => [id, { n, f: f ?? m(0), b }]));
export const SHAPES = { top: pack(TOPS), bottom: pack(BOTTOMS), outer: pack(OUTERS), shoes: pack(SHOESET), acc: pack(ACCS), weapon: pack(WEAPONS) };
export const KIND_NAMES = { top: '상의', bottom: '하의', outer: '겉옷', shoes: '신발', acc: '장신구', weapon: '손에 든 것' };
export const shapeName = (kind, id) => SHAPES[kind]?.[id]?.n ?? id;

// 칸 이름 → 종류
export function slotKind(slot) {
    const t = String(slot);
    if (/무기|손|weapon|hand/i.test(t)) return 'weapon';
    if (/겉|외투|outer|coat/i.test(t)) return 'outer';
    if (/하의|바지|bottom|pants|legs/i.test(t)) return 'bottom';
    if (/신발|발|shoe|feet|boot/i.test(t)) return 'shoes';
    if (/상의|옷|top|shirt|body/i.test(t)) return 'top';
    return 'acc';
}
// 물건 이름 → 모양 (위에서부터 먼저 맞는 것)
const GUESS = {
    outer: [['cloak', /후드 ?망토|hooded cloak|cloak|hooded cape/i], ['raincoat', /우비|raincoat/i], ['cape', /망토|케이프|cape|mantle/i], ['robe', /로브|robe|gown/i], ['poncho', /판초|poncho/i], ['trench', /트렌치|trench/i], ['labcoat', /가운|lab ?coat/i], ['longcoat', /롱코트|long coat|overcoat|duster/i],
        ['parka', /파카|parka|anorak/i], ['puffer', /패딩|puffer|down jacket/i], ['blazer', /블레이저|blazer|suit jacket/i], ['denim', /청자켓|청재킷|denim/i], ['cardigan', /가디건|cardigan/i], ['vest', /조끼|vest|waistcoat/i], ['haori', /하오리|haori|두루마기/i], ['shawl', /숄|shawl|stole/i], ['pauldron', /견갑|pauldron|shoulder/i], ['jacket', /자켓|재킷|점퍼|jacket|jumper|bomber|windbreaker/i]],
    top: [['longdress', /드레스|gown|ball/i], ['sundress', /끈 ?원피스|sundress/i], ['dress', /원피스|dress/i], ['chain', /사슬|chain ?mail/i], ['armor', /갑옷|흉갑|armor|armour|plate|cuirass/i], ['kimono', /기모노|한복|유카타|저고리|kimono|hanbok|yukata/i], ['apron', /앞치마|apron/i], ['suit', /정장|수트|suit|tuxedo/i],
        ['sailor', /세일러|교복|sailor|uniform/i], ['overalls', /멜빵|overall|dungaree/i], ['hoodie', /후드티|후디|hoodie/i], ['turtle', /목폴라|터틀|turtleneck/i], ['sweater', /스웨터|니트|sweater|knit|pullover/i], ['shirt', /셔츠|블라우스|shirt|blouse/i], ['polo', /폴로|카라|polo/i], ['tunic', /튜닉|tunic/i],
        ['tank', /민소매|나시|탱크|tank|sleeveless|camisole/i], ['crop', /크롭|crop/i], ['stripe', /줄무늬|stripe/i], ['long', /긴팔|long ?sleeve/i]],
    bottom: [['tiered', /티어드|tiered/i], ['longskirt', /긴 ?치마|롱스커트|long skirt|maxi/i], ['pleated', /주름|플리츠|pleat/i], ['plaid', /체크|plaid|tartan|kilt/i], ['frill', /프릴|frill|ruffle/i], ['mini', /미니|mini/i], ['tights', /스타킹|타이츠|tights|stocking/i], ['skirt', /치마|스커트|skirt/i],
        ['swim', /수영|swim|trunks/i], ['shorts', /반바지|shorts/i], ['hakama', /하카마|hakama/i], ['wide', /통바지|와이드|wide|baggy/i], ['jeans', /청바지|jeans|denim/i], ['cargo', /카고|cargo/i], ['sweat', /트레이닝|츄리닝|sweat|track|jogger/i], ['slacks', /슬랙스|정장 ?바지|slacks|trousers/i], ['greaves', /각반|greaves|leg armor/i]],
    shoes: [['sabatons', /철 ?장화|sabaton/i], ['rain', /장화|rain ?boot|wellies/i], ['fur', /털|fur|ugg/i], ['work', /작업화|안전화|work ?boot/i], ['tall', /롱부츠|long boot|knee|thigh/i], ['boots', /부츠|boot/i], ['hightop', /하이탑|high ?top/i], ['sneakers', /운동화|스니커|sneaker|trainer|running/i],
        ['sandals', /샌들|sandal/i], ['slippers', /슬리퍼|slipper|flip/i], ['loafers', /로퍼|loafer/i], ['heels', /구두|하이힐|heel|pump|dress shoe/i], ['geta', /게다|나막신|geta|clog/i], ['kneesocks', /긴 ?양말|knee ?sock/i], ['socks', /양말|sock/i]],
    acc: [['straw', /밀짚|챙|straw|sun ?hat|brim/i], ['witch', /마녀|wizard hat|witch/i], ['tophat', /실크햇|top ?hat/i], ['beret', /베레|beret/i], ['beanie', /비니|beanie|knit cap/i], ['helmet', /투구|헬멧|helmet|helm/i], ['bandana', /두건|반다나|bandana|kerchief/i], ['cap', /모자|hat|cap/i],
        ['crown', /왕관|crown/i], ['tiara', /티아라|tiara/i], ['headband', /머리띠|headband/i], ['ribbon', /리본|ribbon|bow\b/i], ['flower', /꽃|flower/i], ['catears', /고양이 ?귀|cat ?ear/i], ['bunny', /토끼 ?귀|bunny|rabbit/i], ['horns', /뿔|horn/i], ['halo', /고리|halo/i],
        ['shades', /선글라스|sunglass|shades/i], ['glasses', /안경|glasses|spectacle/i], ['eyepatch', /안대|eyepatch/i], ['mask', /마스크|복면|가면|mask/i], ['scarf', /목도리|스카프|머플러|scarf|muffler/i], ['bowtie', /나비넥타이|bow ?tie/i], ['necklace', /목걸이|펜던트|necklace|pendant|amulet|charm/i],
        ['wings', /날개|wing/i], ['backpack', /배낭|백팩|backpack|rucksack/i], ['earrings', /귀걸이|earring/i]],
    weapon: [['dagger', /단검|단도|나이프|dagger|knife/i], ['axe', /도끼|axe/i], ['hammer', /망치|해머|hammer|mace/i], ['wand', /요술봉|완드|wand/i], ['staff', /지팡이|스태프|staff|cane/i], ['spear', /창|spear|lance|halberd/i], ['bow', /활|bow/i], ['rifle', /소총|라이플|rifle|shotgun|musket/i], ['gun', /총|gun|pistol|revolver/i],
        ['shield', /방패|shield/i], ['pickaxe', /곡괭이|pickaxe/i], ['hoe', /괭이|삽|hoe|shovel|spade/i], ['trowel', /모종삽|trowel|도구|tool|wrench|screwdriver/i], ['rod', /낚싯대|fishing|rod/i], ['can', /물뿌리개|watering/i], ['basket', /바구니|basket/i], ['book', /책|book|tome|grimoire/i], ['lantern', /등불|랜턴|lantern|lamp/i],
        ['umbrella', /우산|umbrella|parasol/i], ['torch', /횃불|torch/i], ['bouquet', /꽃다발|bouquet/i], ['broom', /빗자루|broom/i], ['bag', /가방|주머니|소포|bag|pouch|parcel|sack|satchel/i], ['sword', /검|칼|sword|blade|katana|saber/i]],
};
const FIRST = { outer: 'coat', top: 'tee', bottom: 'pants', shoes: 'shoes', acc: 'earrings', weapon: 'sword' };
export const guessShape = (kind, name) => (GUESS[kind] ?? []).find(([, rx]) => rx.test(String(name)))?.[0] ?? FIRST[kind] ?? 'earrings';

export const COLORS = ['#e2524a', '#e8853a', '#e8b93a', '#f2df8a', '#5aa85a', '#9ac86a', '#3aa3a3', '#4a8fe2', '#8ac6f2', '#5a6ad6', '#9a6ad6', '#c9a0e8', '#e26aa8', '#f5b6c8', '#8a6a4a', '#c9b38a', '#f4f1ea', '#aab2bd', '#6b7280', '#2f3138'];
const COLOR_WORD = [[/검|까만|black|dark/i, 19], [/흰|하얀|white/i, 16], [/빨|붉|red|crimson|scarlet/i, 0], [/주황|orange/i, 1], [/금|gold/i, 2], [/노랑|노란|밀짚|yellow|straw/i, 3], [/연두|lime/i, 5], [/초록|녹|green/i, 4], [/청록|민트|teal|mint/i, 6], [/하늘|sky|light blue/i, 8], [/남색|navy|indigo/i, 9], [/파랑|파란|blue/i, 7],
    [/연보라|lavender|lilac/i, 11], [/보라|purple|violet/i, 10], [/연분홍|light pink/i, 13], [/분홍|핑크|pink|rose/i, 12], [/갈색|가죽|brown|leather|wood/i, 14], [/캔버스|베이지|린넨|canvas|beige|linen|tan|khaki/i, 15], [/은|철|강철|silver|iron|steel|metal/i, 17], [/회색|grey|gray/i, 18]];
export function guessColor(name, kind = '') {
    const t = String(name), hit = COLOR_WORD.find(([rx]) => rx.test(t)); if (hit) return COLORS[hit[1]];
    if (kind === 'weapon') return COLORS[17];
    let h = 0; for (const ch of t) h = (h * 31 + ch.codePointAt(0)) % 9973;
    return COLORS[h % 16];
}
export const SKINS = ['#ffe3cc', '#f8cfa8', '#e3ae82', '#bd8558', '#8a5a3c', '#5e3d2a', '#cfe8c8', '#d6dcf5'];
export const HAIR_COLORS = ['#2f2a2a', '#5a3a26', '#8a5a34', '#c98a4a', '#e8c36a', '#f4ead0', '#d24a3a', '#e8853a', '#e88aa8', '#9a6ad6', '#4a6fd6', '#4aa3d6', '#5aa86a', '#aab2bd'];
export const EYE_COLORS = ['#2f2a2a', '#5a3a26', '#3a6fd6', '#3a9a5a', '#9a5ad6', '#d24a3a', '#c98a2a', '#4aa3a3'];

const rgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hexOf = (a) => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const shade = (hex, k) => hexOf(rgb(hex).map(v => v * k));
const tint = (hex, k) => hexOf(rgb(hex).map(v => v + (255 - v) * k));
// 한 장을 칠한다: 아래 · 오른쪽 가장자리는 어둡게, 위 · 왼쪽 가장자리는 조금 어둡게 (flat = 명암 없이)
function paint(grid, map, pal, flat = false) {
    if (!map) return;
    const has = (y, x) => y >= 0 && y < H && x >= 0 && x < W && map[y][x] !== '.';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const base = pal[map[y][x]]; if (!base) continue;
        let k = 1; if (!flat) { if (!has(y + 1, x) || !has(y, x + 1)) k = 0.72; else if (!has(y - 1, x) || !has(y, x - 1)) k = 0.9; }
        grid[y][x] = k === 1 ? base : shade(base, k);
    }
}
const clothPal = (c) => ({ c, a: tint(c, 0.55), L: tint(c, 0.3), w: '#f4f1ea', k: '#5a4636', s: null });
export const HURT_PARTS = { head: '머리', torso: '몸통', arms: '팔', legs: '다리' };
const inPart = (part, y, x) => (part === 'head' ? y >= 4 && y <= 13 : part === 'torso' ? y >= 15 && y <= 20 && x >= 5 && x <= 10 : part === 'arms' ? y >= 15 && y <= 19 && (x <= 4 || x >= 11) : part === 'legs' ? y >= 21 && y <= 24 : false);
// look = { skin, hair, hairColor, eye, face } · wear = [{ kind, shape, color }] · mood 0~4 · hurt = ['head' …]
export function dollSVG(look = {}, wear = [], mood = 3, cls = '', hurt = []) {
    const grid = Array.from({ length: H }, () => Array(W).fill(''));
    const skin = look.skin || SKINS[0], hc = look.hairColor || HAIR_COLORS[1], hair = HAIRS[look.hair] ?? HAIRS.short;
    const of = (kind) => { const x = wear.find(v => v.kind === kind); return x && SHAPES[kind]?.[x.shape] ? { s: SHAPES[kind][x.shape], pal: { ...clothPal(x.color), s: skin } } : null; };
    const top = of('top'), bottom = of('bottom'), outer = of('outer'), shoes = of('shoes'), acc = of('acc'), weapon = of('weapon');
    const hairPal = { h: hc, a: tint(hc, 0.5) };
    paint(grid, hair.b, hairPal); if (outer?.s.b) paint(grid, outer.s.b, outer.pal); if (acc?.s.b) paint(grid, acc.s.b, acc.pal);
    paint(grid, BODY, { s: skin });
    if (bottom) paint(grid, bottom.s.f, bottom.pal); else if (!top || !/dress/.test(wear.find(v => v.kind === 'top')?.shape ?? '')) paint(grid, shorts, clothPal('#8a8f98'));
    if (shoes) paint(grid, shoes.s.f, shoes.pal);
    if (top) paint(grid, top.s.f, top.pal); else paint(grid, tee, clothPal('#f4f1ea'));
    paint(grid, hair.f, hairPal);
    if (outer) paint(grid, outer.s.f, outer.pal);
    const face = FACE[look.face] ?? FACE[MOOD_FACE[Math.max(0, Math.min(4, Math.round(mood)))]];
    paint(grid, face, { e: look.eye || '#2f2a2a', m: '#8a4a44', b: '#f7a8a8', t: '#6ab7f0', p: '#f06a9a' }, true);
    if (acc) paint(grid, acc.s.f, acc.pal);
    if (weapon) paint(grid, weapon.s.f, weapon.pal);
    let out = '<rect x="4" y="25" width="8" height="1" fill="#000" opacity=".16"/>', red = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
        const c = grid[y][x]; if (!c) { x++; continue; }
        let n = 1; while (x + n < W && grid[y][x + n] === c) n++;
        out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`; x += n;
    }
    for (const part of hurt) for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
        if (!grid[y][x] || !inPart(part, y, x)) { x++; continue; }
        let n = 1; while (x + n < W && grid[y][x + n] && inPart(part, y, x + n)) n++;
        red += `<rect x="${x}" y="${y}" width="${n}" height="1"/>`; x += n;
    }
    return `<svg class="ss-px ${cls}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${out}${red ? `<g class="ss-px-hurt" fill="#e02a2a">${red}</g>` : ''}</svg>`;
}
// 상태 이름에서 다친 곳 찾기 (부상 · 상처 · 골절 … + 부위)
export function hurtParts(names = []) {
    const out = new Set();
    for (const n of names) {
        const t = String(n); if (!/부상|상처|다침|다친|골절|출혈|화상|베임|찢|멍|삐|wound|injur|hurt|broken|fractur|bleed|burn|cut|bruise|sprain|gash/i.test(t)) continue;
        let any = false;
        if (/머리|이마|얼굴|눈|head|face|skull|eye|forehead/i.test(t)) { out.add('head'); any = true; }
        if (/팔|손|어깨|arm|hand|wrist|shoulder|elbow|finger/i.test(t)) { out.add('arms'); any = true; }
        if (/다리|발|무릎|허벅|leg|foot|knee|ankle|thigh/i.test(t)) { out.add('legs'); any = true; }
        if (/가슴|배|몸통|옆구리|갈비|등|허리|chest|torso|stomach|rib|back|side|abdomen|waist/i.test(t) || !any) out.add('torso');
    }
    return [...out];
}
