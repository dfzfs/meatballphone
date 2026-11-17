// 🧸 도트 인형 v5 (v2.9) — 32×40칸짜리 2등신 꼬마 캐릭터를 코드로 그린다 (직접 디자인한 그림 · 내려받는 파일 없음 · 다른 파일을 안 불러오는 순수한 조각).
//   모양 하나하나를 네모 · 타원 · 선 · 다각형으로 「그려서」 칸에 찍는다 → 명암 · 테두리는 칠할 때 자동 (테두리 · 그늘 · 바탕 · 밝은 띠 4단계).
//   다 그린 그림은 작은 PNG(data URL) 한 장이 된다 — 한 번 그린 것은 기억해 둔다.
//   겹치는 순서: 뒤쪽 머리 · 망토 · 날개 → 몸 → 하의 → 신발 → 상의 → 앞머리 → 겉옷 → 얼굴 → 장신구 → 손에 든 것 (+ 다친 곳은 빨간 그림 한 장 더)
//   글자: s 살 · h 머리카락 · c 옷 색 (이 셋은 자동 명암) / a 포인트 색 · L 옷 색의 밝은 쪽 · D 어두운 쪽 · w 흰색 · k 짙은 갈색 · e 눈 · W 눈빛 · m 입 · b 볼 · t 눈물 · p 분홍
//   이 파일은 욕구 · 옷차림 탭을 켠 채팅에서만 불러온다 (life.js loadDL).
export const W = 32, H = 40;
const MID = W - 1; // 좌우 대칭: x → 31 − x

// ───── 그리는 도구 ─────
const Y0 = 23, KY = 0.6, KX = 0.75;
function pen(hand = false) {
    const g = Array.from({ length: H }, () => Array(W).fill(''));
    let sym = false;
    const set = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
    const d = {
        g,
        x(x, y, ch) { set(x, y, ch); if (sym) set(MID - x, y, ch); },
        r(x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d.x(x + i, y + j, ch); },
        // 타원 (y0~y1 줄만)
        e(cx, cy, rx, ry, ch, y0 = -99, y1 = 99) { for (let y = Math.max(0, Math.ceil(cy - ry)); y <= Math.min(H - 1, Math.floor(cy + ry)); y++) { if (y < y0 || y > y1) continue; for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0001) d.x(x, y, ch); } },
        // 고리 (바깥 타원 − 안쪽 타원)
        o(cx, cy, rx, ry, irx, iry, ch, y0 = -99, y1 = 99) { for (let y = Math.max(0, Math.ceil(cy - ry)); y <= Math.min(H - 1, Math.floor(cy + ry)); y++) { if (y < y0 || y > y1) continue; for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) { const out = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0001, inn = ((x - cx) / irx) ** 2 + ((y - cy) / iry) ** 2 <= 1.0001; if (out && !inn) d.x(x, y, ch); } } },
        l(x0, y0, x1, y1, ch, t = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) d.x(x + a, y + b, ch); } },
        // 다각형 채우기
        p(pts, ch) { const ys = pts.map(q => q[1]); for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1)); } xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) d.x(x, y, ch); } },
        // 지우기
        c(x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d.x(x + i, y + j, ''); },
        // 왼쪽만 그리면 오른쪽에도 똑같이
        S(fn) { sym = true; fn(d); sym = false; },
    };
    // 꼬마(2등신) 비율: 모양은 예전 키 큰 몸 기준 좌표로 그리고, 찍을 때 목 아래(23줄~)만 납작 · 좁게 옮긴다. 머리 쪽은 그대로.
    const o = { ...d }; let raw = false;
    const run = (fn) => { const was = raw; raw = true; try { fn(); } finally { raw = was; } };
    const ty = hand ? (v) => 30.7 + (v - 35.5) * 0.8 : (v) => (v < Y0 ? v : Y0 + (v - Y0) * KY);
    const ex = hand ? (e) => Math.round(25 + (e - 27) * 0.85) : (e) => 16 + Math.sign(e - 16) * Math.round(Math.abs(e - 16) * KX - 0.001); // 칸 가장자리
    const cx_ = hand ? (v) => 24.5 + (v - 26.5) * 0.85 : (v) => 15.5 + (v - 15.5) * KX; // 칸 가운데
    const low = (y) => hand || y >= Y0 - 1, kx = hand ? 0.85 : KX;
    d.x = (x, y, ch) => { if (raw) return o.x(x, y, ch); const b = low(y); run(() => o.x(b ? Math.floor(cx_(x) + 0.5 + 1e-6) : x, Math.floor(ty(y + 0.5) + 1e-6), ch)); };
    d.r = (x, y, w, h, ch) => { const b = low(y), x0 = b ? ex(x) : x, x1 = b ? ex(x + w) : x + w, y0 = Math.round(ty(y)), y1 = Math.round(ty(y + h)); run(() => o.r(Math.min(x0, x1), y0, Math.max(1, Math.abs(x1 - x0)), Math.max(1, y1 - y0), ch)); };
    d.c = (x, y, w, h) => d.r(x, y, w, h, '');
    const ell = (cx, cy, rx, ry) => { if (!hand && cy + ry < Y0) return [cx, cy, rx, ry, 1]; const b = low(cy - ry), t = ty(cy + 0.5 - ry), u = ty(cy + 0.5 + ry); return [b ? cx_(cx) : cx, (t + u) / 2 - 0.5, b ? Math.max(0.6, rx * kx) : rx, Math.max(0.6, (u - t) / 2), (u - t) / 2 / ry]; };
    const rows = (y0, y1) => [y0 <= -99 ? y0 : Math.round(ty(y0)), y1 >= 99 ? y1 : Math.max(Math.round(ty(y0)), Math.round(ty(y1 + 1)) - 1)];
    d.e = (cx, cy, rx, ry, ch, y0 = -99, y1 = 99) => { const [a, b, c, e] = ell(cx, cy, rx, ry), [r0, r1] = rows(y0, y1); run(() => o.e(a, b, c, e, ch, r0, r1)); };
    d.o = (cx, cy, rx, ry, irx, iry, ch, y0 = -99, y1 = 99) => { const [a, b, c, e, k] = ell(cx, cy, rx, ry), [r0, r1] = rows(y0, y1); run(() => o.o(a, b, c, e, irx * (c / rx), iry * k, ch, r0, r1)); };
    const pt = (x, y, b) => [b ? cx_(x) : x, ty(y + 0.5) - 0.5];
    d.l = (x0, y0, x1, y1, ch, t = 1) => { const b = low(Math.min(y0, y1)), A = pt(x0, y0, b), B = pt(x1, y1, b); run(() => o.l(A[0], A[1], B[0], B[1], ch, t)); };
    d.p = (pts, ch) => { const b = low(Math.min(...pts.map(q => q[1]))); run(() => o.p(pts.map(q => pt(q[0], q[1], b)), ch)); };
    return d;
}
const draw = (fn, hand = false) => { if (!fn) return null; const d = pen(hand); fn(d); return d.g; };

// ───── 몸 ─────
const BODY = (d) => {
    d.e(15.5, 13, 8.6, 7.6, 's'); d.e(15.5, 16, 8.6, 6.5, 's'); d.S(() => d.r(6, 13, 1, 3, 's')); // 머리 (턱은 조금 좁게) · 귀
    d.r(14, 21, 4, 3, 's');
    d.e(15.5, 26.5, 6.4, 3.6, 's', 23, 26); d.p([[9.6, 26], [21.4, 26], [20.6, 35], [10.4, 35]], 's'); // 둥근 어깨 · 허리로 살짝 좁아지는 몸통
    d.S(() => { d.r(7, 24, 3, 11, 's'); d.c(7, 24, 1, 1); d.e(8, 35.4, 1.6, 1.5, 's'); }); // 바깥으로 살짝 벌어진 팔 · 둥근 손
    d.r(11, 35, 10, 2, 's'); d.e(15.5, 36.5, 5.4, 1.8, 's');
    d.S(() => { d.r(11, 37, 4, 8, 's'); d.e(12.4, 44.8, 2.8, 1.5, 's'); }); // 다리 · 둥근 발
};

// ───── 머리 모양 ─────
const capN = (d) => d.e(15.5, 12.5, 9.5, 8.5, 'h', 3, 12), capBig = (d) => d.e(15.5, 12.5, 11, 10.5, 'h', 1, 12), capFlat = (d) => d.e(15.5, 13, 8.9, 7.8, 'h', 5, 9);
const fFull = (d) => d.r(7, 13, 18, 2, 'h'), fZig = (d) => { d.r(7, 13, 18, 1, 'h'); for (let x = 7; x <= 24; x++) if (x % 3) d.x(x, 14, 'h'); for (let x = 8; x <= 24; x += 3) d.x(x, 15, 'h'); };
const fPart = (d) => d.S(() => d.p([[6, 13], [14, 13], [9, 16], [6, 17]], 'h')), fSide = (d) => { d.p([[6, 13], [22, 13], [13, 16], [6, 18]], 'h'); d.r(22, 13, 3, 2, 'h'); };
const fWisp = (d) => { d.r(7, 13, 18, 1, 'h'); d.S(() => d.r(8, 14, 3, 2, 'h')); d.r(15, 14, 2, 1, 'h'); }, fNone = (d) => d.S(() => d.r(6, 13, 2, 2, 'h'));
const sEar = (d) => d.S(() => d.r(5, 13, 2, 5, 'h')), sChin = (d) => d.S(() => d.r(4, 13, 3, 10, 'h')), sBob = (d) => d.S(() => { d.r(4, 13, 4, 11, 'h'); d.r(5, 24, 3, 1, 'h'); }), sHime = (d) => d.S(() => d.r(4, 13, 5, 9, 'h'));
const bLong = (d) => { d.r(5, 10, 22, 26, 'h'); d.r(6, 36, 20, 1, 'h'); }, bMid = (d) => { d.r(5, 10, 22, 17, 'h'); d.r(6, 27, 20, 1, 'h'); };
const bWavy = (d) => { for (let y = 10; y <= 37; y++) { const w = Math.floor(y / 3) % 2 ? 2 : 0; d.r(5 - w / 2 - (y > 24 ? 1 : 0), y, 22 + w + (y > 24 ? 2 : 0), 1, 'h'); } };
const tails = (d) => d.S(() => { d.e(3.5, 17, 2.6, 8, 'h'); d.r(4, 9, 3, 3, 'h'); d.r(4, 10, 3, 1, 'a'); });
const lowTails = (d) => d.S(() => { d.e(5.5, 28, 2.6, 8, 'h'); d.r(4, 21, 3, 1, 'a'); });
const braids = (d) => d.S(() => { d.r(4, 19, 3, 15, 'h'); d.x(5, 34, 'h'); for (const y of [22, 26, 30]) d.r(4, y, 3, 1, 'D'); d.r(4, 32, 3, 1, 'a'); });
const ponySide = (d) => { d.e(27.5, 19, 3, 9, 'h'); d.r(24, 10, 3, 3, 'h'); d.r(25, 11, 2, 2, 'a'); }, ponyHigh = (d) => { d.e(26, 7, 3.5, 4, 'h'); d.e(28, 16, 2.6, 8, 'h'); d.r(23, 8, 2, 2, 'a'); };
const bun = (d) => d.e(15.5, 3.5, 4.5, 3.6, 'h'), buns2 = (d) => d.S(() => d.e(7.5, 4.5, 3.6, 3.6, 'h'));
const spikes = (d) => { for (let k = 0; k < 4; k++) d.p([[6 + 5 * k, 8], [8.5 + 5 * k, 0], [11 + 5 * k, 8]], 'h'); }, mohawk = (d) => { d.r(14, 1, 4, 10, 'h'); d.e(15.5, 2, 2.6, 2, 'h'); };
const ahoge = (d) => { d.l(15, 5, 13, 1, 'h', 2); d.l(13, 1, 17, 2, 'h'); }, afro = (d) => { d.e(15.5, 10, 13, 10.5, 'h', 0, 16); d.S(() => d.r(3, 16, 4, 4, 'h')); };
const curls = (d) => d.S(() => { for (let i = 0; i < 4; i++) d.e(4.5, 14.5 + i * 3.6, 2.6, 2.3, 'h'); });
const drills = (d) => d.S(() => { for (let i = 0; i < 5; i++) d.e(4 + (i % 2), 16 + i * 4, 2.4, 2.2, 'h'); });
const H_ = (n, f, b) => [n, (d) => f.forEach(fn => fn(d)), b ? (d) => b.forEach(fn => fn(d)) : null];
const HAIR_DEF = {
    short: H_('짧은 머리', [capN, fZig, sEar]), sidepart: H_('가르마', [capN, fSide, sEar]), bowl: H_('바가지', [capN, fFull, sEar]),
    bob: H_('단발', [capN, fFull, sBob]), bobpart: H_('가르마 단발', [capN, fPart, sBob]), midi: H_('중단발', [capN, fWisp, sChin], [bMid]),
    long: H_('긴 생머리', [capN, fFull, sChin], [bLong]), longpart: H_('긴 가르마', [capN, fPart, sChin], [bLong]), hime: H_('공주 컷', [capN, fFull, sHime], [bLong]),
    wavy: H_('웨이브', [capBig, fSide, sChin], [bWavy]), curly: H_('곱슬', [capBig, fWisp, curls]), afro: H_('아프로', [afro, fNone]),
    tails: H_('양갈래', [capN, fFull, sEar, tails]), lowtails: H_('낮은 양갈래', [capN, fPart, sEar, lowTails]), braids: H_('땋은 머리', [capN, fPart, sEar, braids]),
    drills: H_('롤 머리', [capN, fFull, sEar, drills]), pony: H_('옆 포니테일', [capN, fSide, sEar, ponySide]), ponyhigh: H_('높은 포니테일', [capN, fWisp, sEar, ponyHigh]),
    bun: H_('올림머리', [capN, fPart, sEar, bun]), buns: H_('당고머리', [capN, fFull, sEar, buns2]), spiky: H_('삐죽 머리', [capN, fZig, sEar, spikes]),
    ahoge: H_('바보털', [capN, fZig, sEar, ahoge]), slick: H_('올백', [capN, fNone, sEar]), mohawk: H_('모히칸', [capFlat, mohawk]), buzz: H_('스포츠', [capFlat]), none: H_('없음', []),
};

// ───── 표정 ─────
const eOpen = (d) => { d.S(() => { d.r(10, 15, 3, 1, 'e'); d.r(10, 16, 3, 1, 'j'); d.r(10, 17, 3, 1, 'i'); d.r(10, 18, 3, 1, 'I'); d.x(9, 15, 'e'); }); d.x(10, 16, 'W'); d.x(19, 16, 'W'); }, eArc = (d) => d.S(() => { d.x(9, 17, 'e'); d.r(10, 16, 3, 1, 'e'); d.x(13, 17, 'e'); });
const eShut = (d) => d.S(() => d.r(9, 17, 4, 1, 'e')), eWide = (d) => d.S(() => { d.r(10, 14, 3, 5, 'W'); d.r(10, 14, 3, 1, 'e'); d.r(11, 16, 1, 2, 'e'); }), eDown = (d) => d.S(() => { d.r(10, 16, 3, 1, 'e'); d.r(10, 17, 3, 2, 'i'); });
const eX = (d) => d.S(() => { d.l(10, 15, 12, 17, 'e'); d.l(12, 15, 10, 17, 'e'); }), eHeart = (d) => d.S(() => { d.x(10, 15, 'p'); d.x(12, 15, 'p'); d.r(9, 16, 5, 1, 'p'); d.r(10, 17, 3, 1, 'p'); d.x(11, 18, 'p'); });
const blush = (d) => d.S(() => d.r(8, 19, 2, 1, 'b')), blushBig = (d) => d.S(() => d.r(8, 19, 2, 2, 'b'));
const brSad = (d) => d.S(() => d.l(9, 14, 12, 13, 'e')), brMad = (d) => d.S(() => d.l(9, 13, 12, 14, 'e'));
const mSmile = (d) => { d.x(14, 20, 'm'); d.x(17, 20, 'm'); d.r(15, 21, 2, 1, 'm'); }, mFlat = (d) => d.r(15, 21, 2, 1, 'm'), mFrown = (d) => { d.r(15, 20, 2, 1, 'm'); d.x(14, 21, 'm'); d.x(17, 21, 'm'); };
const mOpen = (d) => { d.r(14, 20, 4, 1, 'm'); d.r(15, 21, 2, 1, 'p'); }, mO = (d) => d.r(15, 20, 2, 2, 'm'), mSmirk = (d) => { d.r(15, 21, 2, 1, 'm'); d.x(17, 20, 'm'); };
const mTongue = (d) => { d.r(14, 20, 4, 1, 'm'); d.r(15, 21, 2, 1, 'p'); }, mWavy = (d) => { for (let i = 0; i < 4; i++) d.x(14 + i, 21 - (i % 2), 'm'); }, mCat = (d) => { d.x(13, 20, 'm'); d.x(14, 21, 'm'); d.x(15, 20, 'm'); d.x(16, 20, 'm'); d.x(17, 21, 'm'); d.x(18, 20, 'm'); };
const tears = (d) => d.S(() => d.r(11, 18, 1, 3, 't')), sweat = (d) => { d.r(24, 9, 1, 3, 't'); d.x(25, 11, 't'); };
const F_ = (...fs) => (d) => fs.forEach(fn => fn(d));
const FACE_DEF = {
    smile: F_(eOpen, blush, mSmile), happy: F_(eArc, blush, mOpen), neutral: F_(eOpen, mFlat), sad: F_(eOpen, brSad, mFrown), angry: F_(eOpen, brMad, mFlat),
    surprised: F_(eWide, mO), sleepy: F_(eShut, mFlat), wink: F_((d) => { d.r(10, 15, 3, 1, 'e'); d.r(10, 16, 3, 1, 'j'); d.r(10, 17, 3, 1, 'i'); d.r(10, 18, 3, 1, 'I'); d.x(9, 15, 'e'); d.x(10, 16, 'W'); d.x(18, 17, 'e'); d.r(19, 16, 3, 1, 'e'); d.x(22, 17, 'e'); }, blush, mSmile), cry: F_(eShut, tears, mFrown),
    dizzy: F_(eX, mWavy, sweat), love: F_(eHeart, blush, mSmile), smirk: F_(eOpen, mSmirk), shy: F_(eDown, blushBig, mFlat), tongue: F_(eArc, blush, mTongue), cat: F_(eOpen, blush, mCat),
    worried: F_(eOpen, brSad, mWavy, sweat),
};
export const FACES = { auto: '기분 따라', smile: '미소', happy: '활짝', neutral: '무표정', sad: '슬픔', angry: '화남', surprised: '놀람', sleepy: '졸림', wink: '윙크', cry: '눈물', dizzy: '어질', love: '하트', smirk: '씨익', shy: '수줍', tongue: '메롱', cat: '고양이 입', worried: '걱정' };
const MOOD_FACE = ['dizzy', 'sad', 'neutral', 'smile', 'happy'];

// ───── 옷: 조각 ─────
const torso = (d, y1 = 35) => { d.r(12, 23, 8, 1, 'c'); d.r(10, 24, 12, y1 - 23, 'c'); };
const slS = (d) => d.S(() => { d.r(7, 24, 3, 4, 'c'); d.c(7, 24, 1, 1); }), slL = (d) => d.S(() => { d.r(7, 24, 3, 11, 'c'); d.r(7, 34, 3, 1, 'D'); d.c(7, 24, 1, 1); }), slPuff = (d) => d.S(() => d.e(8, 26, 2.6, 3, 'c'));
const neckV = (d) => d.p([[13, 23], [18, 23], [15.5, 27]], 's'), collarW = (d) => d.S(() => d.p([[12, 23], [15, 23], [13, 26]], 'w'));
const btn3 = (d) => { for (const y of [27, 30, 33]) d.x(15, y, 'k'); }, stripesT = (d) => { d.r(10, 27, 12, 2, 'a'); d.r(10, 31, 12, 2, 'a'); };
const flare = (d, y1, w) => d.p([[10, 35], [21, 35], [21 + w, y1], [10 - w, y1]], 'c');
const heartAt = (d, x, y, ch) => { d.x(x, y, ch); d.x(x + 2, y, ch); d.r(x - 1, y + 1, 5, 1, ch); d.r(x, y + 2, 3, 1, ch); d.x(x + 1, y + 3, ch); };
const TOPS = {
    tee: ['반팔', (d) => { torso(d); slS(d); }], long: ['긴팔', (d) => { torso(d); slL(d); }], tank: ['민소매', (d) => { d.r(11, 25, 10, 11, 'c'); d.S(() => d.r(11, 23, 2, 2, 'c')); }],
    crop: ['크롭', (d) => { torso(d, 30); slS(d); }], stripe: ['줄무늬 반팔', (d) => { torso(d); slS(d); stripesT(d); }], stripelong: ['줄무늬 긴팔', (d) => { torso(d); slL(d); stripesT(d); d.S(() => { d.r(7, 27, 3, 2, 'a'); d.r(7, 31, 3, 2, 'a'); }); }],
    shirt: ['셔츠', (d) => { torso(d); slL(d); collarW(d); btn3(d); }], polo: ['폴로', (d) => { torso(d); slS(d); collarW(d); d.x(15, 26, 'k'); d.x(15, 28, 'k'); }],
    hoodie: ['후드티', (d) => { torso(d); slL(d); d.p([[12, 30], [19, 30], [20, 34], [11, 34]], 'D'); d.r(14, 24, 1, 4, 'w'); d.r(17, 24, 1, 4, 'w'); d.S(() => d.p([[11, 23], [14, 23], [12, 25]], 'D')); }, (d) => d.e(15.5, 22, 8, 4, 'c')],
    sweater: ['스웨터', (d) => { torso(d); slL(d); d.r(10, 34, 12, 2, 'D'); d.r(13, 22, 6, 2, 'D'); for (let x = 11; x <= 20; x += 3) d.r(x, 26, 1, 7, 'L'); }], turtle: ['목폴라', (d) => { torso(d); slL(d); d.r(13, 20, 6, 4, 'c'); d.r(13, 21, 6, 1, 'D'); }],
    vneck: ['브이넥', (d) => { torso(d); slS(d); neckV(d); }], hearttee: ['하트 티', (d) => { torso(d); slS(d); heartAt(d, 14, 27, 'a'); }], startee: ['별 티', (d) => { torso(d); slL(d); d.r(15, 26, 2, 5, 'a'); d.r(13, 28, 6, 1, 'a'); d.x(14, 30, 'a'); d.x(17, 30, 'a'); }],
    overalls: ['멜빵', (d) => { d.r(11, 23, 10, 1, 'w'); d.r(10, 24, 12, 12, 'w'); d.S(() => d.r(7, 24, 3, 4, 'w')); d.r(12, 28, 8, 8, 'c'); d.S(() => { d.r(12, 23, 2, 5, 'c'); d.x(12, 28, 'a'); }); d.r(14, 31, 4, 3, 'D'); }],
    apron: ['앞치마', (d) => { torso(d); slS(d); d.r(12, 26, 8, 10, 'w'); d.S(() => d.l(12, 26, 14, 23, 'w')); d.r(14, 30, 4, 3, 'L'); }],
    sailor: ['세일러', (d) => { d.r(11, 23, 10, 1, 'w'); d.r(10, 24, 12, 12, 'w'); d.S(() => { d.r(7, 24, 3, 4, 'w'); d.r(7, 27, 3, 1, 'c'); }); d.p([[10, 23], [21, 23], [15.5, 30]], 'c'); d.p([[13, 23], [18, 23], [15.5, 27]], 's'); d.p([[15.5, 28], [18, 32], [13, 32]], 'a'); }],
    suit: ['정장', (d) => { torso(d); slL(d); d.p([[13, 23], [18, 23], [15.5, 31]], 'w'); d.r(15, 24, 2, 6, 'a'); d.S(() => d.l(13, 23, 15, 31, 'D')); d.x(15, 33, 'k'); }],
    kimono: ['기모노 · 한복', (d) => { torso(d); d.S(() => d.r(5, 24, 5, 9, 'c')); d.l(12, 23, 18, 29, 'a', 2); d.l(19, 23, 16, 26, 'a', 2); d.r(10, 31, 12, 4, 'a'); d.r(14, 32, 4, 2, 'D'); }],
    armor: ['갑옷', (d) => { torso(d); d.S(() => { d.e(8, 25, 3.2, 2.6, 'c'); d.r(7, 28, 3, 5, 'k'); }); d.r(12, 25, 8, 3, 'L'); d.r(10, 30, 12, 1, 'D'); d.r(15, 24, 1, 12, 'D'); d.r(10, 34, 12, 1, 'D'); }],
    chain: ['사슬 갑옷', (d) => { torso(d); slS(d); for (let y = 24; y <= 35; y++) for (let x = 10 + (y % 2); x <= 21; x += 2) d.x(x, y, 'L'); d.r(10, 33, 12, 2, 'k'); }],
    tunic: ['튜닉', (d) => { torso(d, 38); slS(d); neckV(d); d.r(10, 33, 12, 2, 'k'); d.r(15, 33, 2, 2, 'a'); }],
    dress: ['원피스', (d) => { torso(d); slS(d); flare(d, 41, 3); d.r(10, 33, 12, 1, 'D'); }], longdress: ['긴 드레스', (d) => { torso(d); slL(d); flare(d, 45, 5); d.r(5, 44, 22, 1, 'a'); d.r(10, 33, 12, 1, 'a'); }],
    sundress: ['끈 원피스', (d) => { d.r(11, 25, 10, 11, 'c'); d.S(() => d.r(12, 23, 1, 2, 'c')); flare(d, 41, 4); d.r(6, 40, 20, 1, 'a'); }], offshoulder: ['오프숄더', (d) => { d.r(10, 27, 12, 9, 'c'); d.r(7, 26, 18, 3, 'c'); d.r(7, 28, 18, 1, 'D'); }],
    blouse: ['퍼프 블라우스', (d) => { torso(d); slPuff(d); d.S(() => d.p([[15, 24], [12, 22], [12, 27]], 'a')); d.r(15, 24, 2, 2, 'D'); }], jersey: ['운동복 상의', (d) => { torso(d); slS(d); d.S(() => d.r(10, 24, 1, 12, 'a')); d.r(14, 27, 1, 5, 'w'); d.r(16, 27, 2, 1, 'w'); d.r(17, 28, 1, 2, 'w'); d.r(16, 29, 2, 1, 'w'); d.r(16, 30, 1, 2, 'w'); d.r(16, 31, 2, 1, 'w'); }],
    raglan: ['래글런', (d) => { torso(d); d.S(() => { d.r(7, 24, 3, 11, 'a'); d.l(10, 24, 12, 23, 'a'); }); }], plaidshirt: ['체크 셔츠', (d) => { torso(d); slL(d); collarW(d); for (const y of [26, 30, 34]) d.r(10, y, 12, 1, 'a'); for (const x of [12, 15, 19]) d.r(x, 24, 1, 12, 'a'); }],
    maid: ['메이드복', (d) => { torso(d); slPuff(d); flare(d, 41, 3); d.r(12, 26, 8, 13, 'w'); collarW(d); d.r(8, 41, 16, 1, 'w'); }], waistcoat: ['조끼 + 셔츠', (d) => { d.r(11, 23, 10, 1, 'w'); d.r(10, 24, 12, 12, 'w'); d.S(() => d.r(7, 24, 3, 11, 'w')); d.S(() => d.p([[10, 24], [14, 24], [15, 36], [10, 36]], 'c')); d.x(15, 29, 'k'); d.x(15, 32, 'k'); }],
};
const hips = (d) => d.r(10, 35, 12, 3, 'c'), legs = (d, y1 = 43) => d.S(() => d.r(11, 38, 4, y1 - 37, 'c')), beltK = (d) => { d.r(10, 35, 12, 1, 'k'); d.r(15, 35, 2, 1, 'a'); };
const skirtP = (d, y1, w) => d.p([[10, 35], [21, 35], [21 + w, y1], [10 - w, y1]], 'c');
const BOTTOMS = {
    pants: ['바지', (d) => { hips(d); legs(d); }], jeans: ['청바지', (d) => { hips(d); legs(d); d.S(() => { d.r(11, 43, 4, 1, 'L'); d.r(11, 36, 2, 1, 'L'); }); d.r(15, 36, 1, 2, 'D'); }], slacks: ['슬랙스', (d) => { hips(d); legs(d); beltK(d); d.S(() => d.r(13, 38, 1, 6, 'D')); }],
    cargo: ['카고 바지', (d) => { hips(d); legs(d); d.S(() => { d.r(10, 39, 3, 3, 'D'); d.r(10, 39, 3, 1, 'L'); }); }], sweat: ['트레이닝 바지', (d) => { hips(d); legs(d); d.S(() => { d.r(11, 35, 1, 9, 'w'); d.r(11, 43, 4, 1, 'D'); }); }],
    patched: ['기운 바지', (d) => { hips(d); legs(d); d.r(11, 40, 3, 3, 'a'); d.r(18, 38, 2, 2, 'a'); }], greaves: ['다리 갑옷', (d) => { hips(d); legs(d); beltK(d); d.S(() => { d.r(11, 39, 4, 3, 'L'); d.r(11, 42, 4, 1, 'D'); }); }],
    shorts: ['반바지', (d) => { hips(d); legs(d, 39); }], shortscuff: ['접은 반바지', (d) => { hips(d); legs(d, 40); d.S(() => d.r(11, 40, 4, 1, 'L')); }], swim: ['수영복', (d) => { hips(d); legs(d, 39); d.r(10, 35, 12, 1, 'a'); d.r(15, 36, 2, 2, 'w'); }],
    capri: ['7부 바지', (d) => { hips(d); legs(d, 41); d.S(() => d.r(11, 41, 4, 1, 'D')); }], wide: ['통바지', (d) => { hips(d); d.S(() => d.p([[10, 38], [15, 38], [15, 44], [8, 44]], 'c')); }],
    hakama: ['하카마', (d) => { d.r(10, 34, 12, 2, 'a'); hips(d); d.S(() => { d.p([[10, 38], [15, 38], [15, 44], [7, 44]], 'c'); d.l(12, 38, 10, 44, 'D'); }); }], bloomers: ['호박 바지', (d) => { hips(d); d.S(() => { d.e(12.5, 39.5, 3.4, 2.6, 'c'); d.r(11, 42, 4, 1, 'w'); }); }],
    skirt: ['치마', (d) => skirtP(d, 40, 3)], pleated: ['주름치마', (d) => { skirtP(d, 40, 3); for (let x = 9; x <= 22; x += 3) d.l(x < 16 ? x + 2 : x - 1, 36, x, 40, 'D'); }], plaid: ['체크 치마', (d) => { skirtP(d, 40, 3); d.r(8, 38, 16, 1, 'a'); for (const x of [11, 15, 19]) d.r(x, 35, 1, 6, 'a'); }],
    frill: ['프릴 치마', (d) => { skirtP(d, 39, 3); for (let x = 6; x <= 25; x++) d.x(x, 40 + (x % 2), 'w'); d.r(7, 40, 18, 1, 'w'); }], mini: ['미니스커트', (d) => skirtP(d, 38, 2)], tights: ['치마 + 스타킹', (d) => { d.S(() => d.r(11, 38, 4, 6, 'k')); skirtP(d, 40, 3); }],
    longskirt: ['긴 치마', (d) => skirtP(d, 44, 4)], tiered: ['티어드 치마', (d) => { skirtP(d, 44, 5); d.r(8, 38, 16, 1, 'a'); d.r(7, 41, 18, 1, 'a'); d.r(5, 44, 22, 1, 'a'); }],
};
const sides = (d, y1 = 35) => d.S(() => d.r(10, 23, 4, y1 - 22, 'c')), slO = (d) => d.S(() => { d.r(6, 24, 4, 11, 'c'); d.r(6, 34, 4, 1, 'D'); d.c(6, 24, 1, 1); }), lapel = (d) => d.S(() => d.l(13, 23, 12, 29, 'D'));
const capeB = (d) => d.p([[8, 22], [23, 22], [27, 44], [4, 44]], 'c'), hoodF = (d) => d.o(15.5, 13, 11, 10.5, 8.8, 8.4, 'c', 2, 22), hoodB = (d) => d.e(15.5, 13, 11, 10.5, 'c', 2, 24);
const OUTERS = {
    jacket: ['재킷', (d) => { sides(d); slO(d); lapel(d); }], blazer: ['블레이저', (d) => { sides(d); slO(d); d.S(() => d.p([[13, 23], [14, 23], [14, 30], [11, 26]], 'D')); d.x(13, 32, 'a'); }],
    denim: ['청재킷', (d) => { sides(d); slO(d); d.S(() => { d.r(6, 33, 4, 2, 'a'); d.r(10, 23, 3, 2, 'a'); d.r(11, 28, 2, 2, 'L'); }); }], cardigan: ['가디건', (d) => { sides(d, 37); slO(d); d.S(() => { for (const y of [26, 30, 34]) d.x(13, y, 'k'); d.r(10, 36, 4, 2, 'D'); }); }],
    coat: ['코트', (d) => { sides(d, 40); slO(d); lapel(d); }], longcoat: ['롱코트', (d) => { sides(d, 44); slO(d); lapel(d); }], trench: ['트렌치코트', (d) => { sides(d, 44); slO(d); lapel(d); d.S(() => { d.r(10, 31, 4, 2, 'k'); d.x(12, 27, 'k'); }); }],
    labcoat: ['가운', (d) => { sides(d, 43); slO(d); lapel(d); d.S(() => d.r(11, 36, 2, 3, 'D')); }], parka: ['파카', (d) => { sides(d, 40); slO(d); d.S(() => { d.e(11.5, 23.5, 3, 1.6, 'w'); d.r(6, 34, 4, 1, 'w'); }); }, hoodB],
    puffer: ['패딩', (d) => { d.S(() => { d.r(9, 23, 5, 14, 'c'); d.r(5, 24, 5, 11, 'c'); for (const y of [27, 31, 35]) d.r(5, y, 9, 1, 'D'); }); }], vest: ['조끼', (d) => { sides(d, 36); d.S(() => d.x(13, 29, 'k')); }],
    haori: ['하오리', (d) => { sides(d, 41); d.S(() => { d.r(4, 24, 6, 10, 'c'); d.r(13, 23, 1, 19, 'a'); d.r(4, 33, 6, 1, 'D'); }); }], robe: ['로브', (d) => { d.r(11, 23, 10, 1, 'c'); d.r(9, 24, 14, 21, 'c'); slO(d); d.r(15, 24, 1, 21, 'D'); d.r(9, 32, 14, 2, 'k'); d.r(15, 32, 2, 2, 'a'); }],
    poncho: ['판초', (d) => { d.p([[15.5, 21], [26, 35], [5, 35]], 'c'); d.r(6, 33, 20, 1, 'a'); d.p([[13, 22], [18, 22], [15.5, 25]], 's'); }], shawl: ['숄', (d) => { d.p([[15.5, 22], [24, 29], [7, 29]], 'c'); d.p([[13, 22], [18, 22], [15.5, 25]], 's'); for (let x = 8; x <= 23; x += 2) d.x(x, 30, 'a'); }],
    cape: ['망토', (d) => { d.S(() => d.r(8, 23, 4, 3, 'c')); d.r(14, 23, 4, 2, 'a'); }, capeB], cloak: ['후드 망토', (d) => { hoodF(d); d.S(() => d.r(8, 23, 4, 12, 'c')); d.r(14, 23, 4, 2, 'a'); }, (d) => { hoodB(d); capeB(d); }],
    raincoat: ['후드 우비', (d) => { hoodF(d); d.r(11, 23, 10, 1, 'c'); d.r(9, 24, 14, 17, 'c'); slO(d); d.r(15, 24, 1, 17, 'D'); for (const y of [27, 31, 35]) d.x(16, y, 'a'); }, hoodB],
    pauldron: ['견갑', (d) => d.S(() => { d.e(8, 25, 3.6, 3, 'c'); d.r(6, 25, 5, 1, 'L'); d.r(7, 27, 4, 1, 'D'); })], scarfcoat: ['목도리 코트', (d) => { sides(d, 40); slO(d); d.r(11, 21, 10, 3, 'a'); d.r(18, 24, 3, 9, 'a'); d.r(18, 32, 3, 1, 'D'); }],
    bomber: ['야구 점퍼', (d) => { sides(d); d.S(() => { d.r(6, 24, 4, 11, 'a'); d.r(6, 34, 4, 1, 'D'); d.r(10, 34, 4, 2, 'D'); d.r(10, 23, 3, 1, 'D'); }); }], kappa: ['어깨 망토', (d) => { d.p([[15.5, 21], [24, 30], [7, 30]], 'c'); d.p([[13, 22], [18, 22], [15.5, 24]], 's'); d.r(15, 24, 2, 2, 'a'); d.r(7, 30, 18, 1, 'D'); }],
};
const shoeB = (d) => d.S(() => { d.r(10, 43, 5, 3, 'c'); }), sole = (d, ch) => d.S(() => d.r(10, 45, 5, 1, ch)), shaft = (d, y0) => d.S(() => d.r(11, y0, 4, 43 - y0, 'c'));
const SHOESET = {
    shoes: ['신발', (d) => { shoeB(d); sole(d, 'k'); }], sneakers: ['운동화', (d) => { shoeB(d); sole(d, 'w'); d.S(() => { d.r(10, 44, 2, 1, 'w'); d.x(13, 43, 'w'); }); }], hightop: ['하이탑', (d) => { shaft(d, 41); shoeB(d); sole(d, 'w'); d.S(() => { d.x(12, 42, 'w'); d.x(13, 43, 'w'); d.r(10, 44, 2, 1, 'w'); }); }],
    boots: ['부츠', (d) => { shaft(d, 40); shoeB(d); sole(d, 'k'); }], tall: ['롱부츠', (d) => { shaft(d, 37); shoeB(d); sole(d, 'k'); d.S(() => d.r(11, 37, 4, 1, 'D')); }], rain: ['장화', (d) => { shaft(d, 39); shoeB(d); sole(d, 'D'); d.S(() => d.r(11, 39, 4, 1, 'L')); }],
    fur: ['털 부츠', (d) => { shaft(d, 40); shoeB(d); sole(d, 'k'); d.S(() => d.r(10, 39, 6, 2, 'w')); }], work: ['작업화', (d) => { shaft(d, 41); shoeB(d); d.S(() => { d.r(9, 45, 6, 1, 'k'); d.x(12, 42, 'a'); d.x(13, 43, 'a'); d.r(10, 43, 2, 2, 'D'); }); }],
    sandals: ['샌들', (d) => { sole(d, 'c'); d.S(() => { d.r(11, 43, 3, 1, 'c'); d.x(12, 44, 'c'); }); }], slippers: ['슬리퍼', (d) => d.S(() => { d.r(10, 44, 5, 2, 'c'); d.r(13, 44, 2, 1, 'D'); })],
    loafers: ['로퍼', (d) => { d.S(() => { d.r(10, 44, 5, 2, 'c'); d.r(11, 44, 3, 1, 'a'); }); sole(d, 'k'); }], heels: ['구두', (d) => d.S(() => { d.r(10, 44, 4, 1, 'c'); d.r(10, 45, 2, 1, 'c'); d.r(13, 43, 2, 2, 'c'); d.x(14, 45, 'k'); })],
    geta: ['게다', (d) => d.S(() => { d.r(9, 44, 6, 1, 'k'); d.x(10, 45, 'k'); d.x(13, 45, 'k'); d.l(12, 44, 11, 42, 'a'); d.l(12, 44, 14, 42, 'a'); })], socks: ['양말', (d) => { shaft(d, 41); d.S(() => { d.r(10, 43, 5, 3, 'c'); d.r(11, 41, 4, 1, 'a'); }); }],
    kneesocks: ['긴 양말 + 신발', (d) => { d.S(() => { d.r(11, 38, 4, 5, 'w'); d.r(11, 38, 4, 1, 'a'); }); shoeB(d); sole(d, 'k'); }], sabatons: ['철 장화', (d) => { shaft(d, 38); shoeB(d); sole(d, 'k'); d.S(() => { d.r(11, 38, 4, 1, 'L'); d.r(11, 41, 4, 1, 'D'); d.r(10, 43, 5, 1, 'L'); }); }],
    mary: ['메리제인', (d) => { d.S(() => { d.r(10, 44, 5, 2, 'c'); d.r(11, 43, 4, 1, 'c'); d.r(11, 43, 3, 1, 'w'); }); }], skates: ['스케이트', (d) => { shaft(d, 41); shoeB(d); d.S(() => { d.r(9, 46, 7, 1, 'L'); d.x(12, 42, 'w'); }); }],
};
const ACCS = {
    cap: ['야구 모자', (d) => { d.e(15.5, 9, 9.6, 6.6, 'c', 2, 9); d.r(15, 9, 14, 2, 'c'); d.r(15, 10, 14, 1, 'D'); d.r(15, 2, 2, 1, 'a'); }], beanie: ['비니', (d) => { d.e(15.5, 10, 9.6, 8, 'c', 2, 9); d.r(6, 9, 20, 3, 'a'); d.e(15.5, 1.5, 2.2, 1.6, 'w'); }],
    straw: ['챙 넓은 모자', (d) => { d.e(15.5, 11, 15.4, 2.6, 'c'); d.e(15.5, 8, 7.2, 6, 'c', 2, 8); d.r(8, 7, 16, 2, 'a'); }], tophat: ['실크햇', (d) => { d.r(9, 0, 14, 9, 'c'); d.r(9, 6, 14, 2, 'a'); d.r(5, 9, 22, 2, 'c'); }],
    witch: ['마녀 모자', (d) => { d.p([[15, 0], [17, 0], [23, 9], [8, 9]], 'c'); d.r(9, 7, 14, 2, 'a'); d.e(15.5, 10.5, 14, 2.2, 'c'); d.r(15, 7, 2, 2, 'w'); }], beret: ['베레모', (d) => { d.e(17, 6.5, 10, 4.5, 'c'); d.r(15, 1, 1, 2, 'c'); }],
    helmet: ['투구', (d) => { d.e(15.5, 11, 10, 9, 'c', 2, 12); d.r(15, 1, 2, 11, 'L'); d.S(() => d.r(5, 12, 3, 7, 'c')); d.r(6, 11, 20, 1, 'D'); }], bandana: ['두건', (d) => { d.e(15.5, 10, 9.7, 7, 'c', 3, 10); d.r(24, 9, 4, 2, 'c'); d.r(26, 11, 2, 4, 'c'); for (const [x, y] of [[9, 7], [13, 5], [18, 6], [22, 8]]) d.x(x, y, 'w'); }],
    crown: ['왕관', (d) => { d.r(9, 5, 14, 4, 'c'); for (let k = 0; k < 4; k++) d.p([[9 + k * 4, 5], [10.5 + k * 4, 1], [12 + k * 4, 5]], 'c'); for (const x of [11, 15, 19]) d.r(x, 6, 2, 2, 'a'); }], tiara: ['티아라', (d) => { d.r(10, 9, 12, 1, 'c'); d.p([[13, 9], [15.5, 5], [18, 9]], 'c'); d.r(15, 7, 2, 2, 'a'); }],
    headband: ['머리띠', (d) => { d.r(6, 8, 20, 2, 'c'); d.r(6, 9, 20, 1, 'D'); }], ribbon: ['리본', (d) => { d.p([[23, 5], [18, 1], [18, 8]], 'c'); d.p([[24, 5], [29, 1], [29, 8]], 'c'); d.r(22, 3, 3, 3, 'a'); }],
    flower: ['꽃', (d) => { for (const [x, y] of [[23, 4], [26, 6], [25, 9], [21, 9], [20, 6]]) d.e(x, y, 1.6, 1.6, 'c'); d.e(23, 7, 1.5, 1.5, 'a'); }], catears: ['고양이 귀', (d) => d.S(() => { d.p([[5, 8], [7, 0], [12, 5]], 'c'); d.p([[7, 6], [8, 3], [10, 5]], 'a'); })],
    bunny: ['토끼 귀', (d) => d.S(() => { d.e(11, 3, 2.2, 5.5, 'c'); d.e(11, 3.5, 1, 3.5, 'a'); })], horns: ['뿔', (d) => d.S(() => { d.p([[6, 9], [4, 1], [10, 6]], 'c'); d.l(5, 3, 8, 6, 'D'); })],
    halo: ['천사 고리', (d) => d.o(15.5, 2, 7.5, 2.2, 5, 0.9, 'c')], glasses: ['안경', (d) => { d.S(() => { d.r(9, 13, 6, 1, 'c'); d.r(9, 17, 6, 1, 'c'); d.r(9, 13, 1, 5, 'c'); d.r(14, 13, 1, 5, 'c'); d.r(6, 14, 3, 1, 'c'); }); d.r(15, 14, 2, 1, 'c'); }],
    shades: ['선글라스', (d) => { d.S(() => { d.r(9, 13, 6, 4, 'c'); d.r(6, 14, 3, 1, 'c'); d.x(10, 14, 'L'); }); d.r(15, 14, 2, 1, 'c'); }], eyepatch: ['안대', (d) => { d.l(6, 10, 25, 13, 'c'); d.r(18, 13, 5, 5, 'c'); }],
    mask: ['마스크', (d) => { d.e(15.5, 19, 7, 3.6, 'c'); d.S(() => d.r(6, 17, 3, 1, 'c')); d.r(11, 19, 10, 1, 'D'); }], scarf: ['목도리', (d) => { d.r(10, 21, 12, 3, 'c'); d.r(10, 23, 12, 1, 'D'); d.r(18, 24, 4, 9, 'c'); d.r(18, 32, 4, 1, 'a'); }],
    necklace: ['목걸이', (d) => { d.l(12, 23, 15, 26, 'c'); d.l(19, 23, 16, 26, 'c'); d.r(15, 26, 2, 2, 'a'); }], bowtie: ['나비넥타이', (d) => { d.S(() => d.p([[15, 24], [11, 22], [11, 27]], 'c')); d.r(15, 24, 2, 2, 'a'); }],
    necktie: ['넥타이', (d) => { d.r(15, 23, 2, 8, 'c'); d.p([[14, 31], [17, 31], [15.5, 34]], 'c'); d.r(15, 23, 2, 2, 'D'); }], earrings: ['귀걸이', (d) => d.S(() => { d.x(6, 16, 'c'); d.r(5, 17, 2, 2, 'c'); })],
    headphones: ['헤드폰', (d) => { d.o(15.5, 12, 11, 10.5, 9.6, 9.2, 'c', 1, 10); d.S(() => { d.r(3, 11, 4, 7, 'c'); d.r(3, 13, 2, 3, 'a'); }); }], wings: ['날개', null, (d) => d.S(() => { d.p([[10, 24], [0, 16], [1, 33], [9, 35]], 'c'); d.l(2, 20, 8, 27, 'D'); d.l(2, 26, 8, 31, 'D'); })],
    backpack: ['배낭', (d) => d.S(() => d.r(11, 23, 2, 11, 'a')), (d) => { d.r(7, 22, 18, 15, 'c'); d.r(9, 20, 14, 2, 'c'); }], tail: ['꼬리', null, (d) => { d.l(21, 36, 28, 32, 'c', 3); d.l(28, 32, 29, 24, 'c', 3); d.e(29.5, 23, 2, 2, 'a'); }],
};
const hK = (d, y0, y1) => d.r(26, y0, 2, y1 - y0 + 1, 'k');
const WEAPONS = {
    sword: ['검', (d) => { d.r(26, 12, 2, 20, 'c'); d.r(26, 12, 1, 20, 'L'); d.p([[26, 12], [27.5, 12], [26.5, 8]], 'c'); d.r(23, 32, 8, 2, 'a'); hK(d, 34, 37); d.r(26, 38, 2, 1, 'a'); }], dagger: ['단검', (d) => { d.r(26, 25, 2, 7, 'c'); d.x(26, 24, 'c'); d.r(26, 25, 1, 7, 'L'); d.r(24, 32, 6, 1, 'a'); hK(d, 33, 36); }],
    axe: ['도끼', (d) => { hK(d, 14, 38); d.p([[28, 14], [31, 11], [31, 23], [28, 20]], 'c'); d.p([[25, 15], [23, 14], [23, 20], [25, 19]], 'c'); d.r(31, 12, 1, 10, 'L'); }], hammer: ['망치', (d) => { hK(d, 16, 38); d.r(22, 10, 10, 6, 'c'); d.r(22, 10, 10, 1, 'L'); d.r(22, 15, 10, 1, 'D'); }],
    staff: ['지팡이', (d) => { hK(d, 8, 44); d.e(26.5, 4.5, 3.4, 3.4, 'a'); d.x(25, 3, 'w'); d.o(26.5, 4.5, 4.6, 4.6, 3.6, 3.6, 'c', 5, 10); }], wand: ['요술봉', (d) => { d.r(26, 24, 1, 14, 'c'); d.r(25, 18, 3, 5, 'a'); d.r(23, 20, 7, 1, 'a'); d.x(24, 22, 'a'); d.x(28, 22, 'a'); d.x(26, 17, 'a'); }],
    spear: ['창', (d) => { hK(d, 8, 45); d.p([[26.5, 0], [30, 8], [23, 8]], 'c'); d.r(26, 2, 1, 6, 'L'); d.r(25, 9, 4, 1, 'a'); }], bow: ['활', (d) => { d.l(25, 12, 29, 20, 'c', 2); d.r(29, 20, 2, 12, 'c'); d.l(29, 32, 25, 40, 'c', 2); d.r(25, 12, 1, 29, 'w'); d.r(29, 25, 2, 3, 'k'); }],
    gun: ['권총', (d) => { d.r(24, 33, 8, 2, 'c'); d.r(24, 33, 8, 1, 'L'); d.r(24, 35, 3, 4, 'k'); d.x(27, 35, 'c'); }], rifle: ['소총', (d) => { d.l(22, 40, 30, 20, 'c', 2); d.l(22, 40, 24, 36, 'k', 3); d.x(31, 19, 'L'); }],
    shield: ['방패', (d) => { d.e(26.5, 31, 5, 7.5, 'c'); d.o(26.5, 31, 5, 7.5, 3.8, 6.2, 'L'); d.r(26, 26, 2, 10, 'a'); d.r(23, 30, 8, 2, 'a'); }], pickaxe: ['곡괭이', (d) => { hK(d, 14, 38); d.p([[20, 16], [26.5, 11], [32, 16], [31, 17], [26.5, 14], [21, 17]], 'c'); }],
    hoe: ['괭이 · 삽', (d) => { hK(d, 12, 40); d.r(27, 10, 5, 3, 'c'); d.r(26, 10, 2, 2, 'c'); d.r(27, 12, 5, 1, 'D'); }], trowel: ['모종삽 · 도구', (d) => { hK(d, 31, 37); d.p([[26.5, 20], [30, 30], [23, 30]], 'c'); d.r(26, 23, 1, 6, 'L'); }],
    rod: ['낚싯대', (d) => { d.l(25, 40, 31, 6, 'k'); d.r(31, 6, 1, 18, 'w'); d.r(30, 24, 2, 2, 'a'); d.r(24, 36, 3, 3, 'c'); }], can: ['물뿌리개', (d) => { d.r(24, 31, 6, 7, 'c'); d.l(30, 33, 31, 29, 'c', 1); d.r(30, 28, 2, 2, 'c'); d.o(24, 34, 3, 3, 1.8, 1.8, 'c'); d.r(24, 31, 6, 1, 'L'); }],
    basket: ['바구니', (d) => { d.o(27, 31, 4.5, 5, 3.4, 4, 'k', 26, 31); d.p([[23, 32], [31, 32], [30, 39], [24, 39]], 'c'); for (const y of [34, 37]) d.r(24, y, 7, 1, 'D'); d.e(25.5, 31.5, 1.5, 1.2, 'a'); d.e(28.5, 31.5, 1.5, 1.2, 'a'); }],
    bag: ['가방', (d) => { d.l(23, 24, 26, 33, 'k'); d.r(24, 33, 8, 8, 'c'); d.r(24, 33, 8, 3, 'D'); d.r(27, 35, 2, 2, 'a'); }], book: ['책', (d) => { d.r(24, 30, 8, 10, 'c'); d.r(31, 31, 1, 8, 'w'); d.r(24, 30, 1, 10, 'D'); d.r(26, 33, 4, 1, 'a'); d.r(26, 35, 4, 1, 'a'); }],
    lantern: ['등불', (d) => { d.l(26, 24, 26, 28, 'k'); d.r(24, 28, 6, 2, 'c'); d.r(24, 30, 6, 7, 'c'); d.r(25, 31, 4, 5, 'a'); d.r(26, 32, 2, 3, 'w'); d.r(24, 37, 6, 1, 'D'); }], umbrella: ['우산', (d) => { d.r(26, 10, 1, 28, 'k'); d.e(26, 10, 9, 7, 'c', 3, 10); for (let x = 18; x <= 34; x += 4) d.x(x, 11, 'c'); d.r(26, 2, 1, 2, 'k'); d.l(22, 4, 20, 10, 'D'); d.l(30, 4, 32, 10, 'D'); }],
    torch: ['횃불', (d) => { hK(d, 24, 38); d.r(25, 22, 4, 2, 'D'); d.p([[26.5, 12], [30, 22], [23, 22]], 'a'); d.p([[26.5, 16], [28.5, 22], [24.5, 22]], 'w'); }], bouquet: ['꽃다발', (d) => { d.p([[23, 30], [31, 30], [27, 39]], 'w'); for (const [x, y] of [[24.5, 27], [29.5, 27], [27, 24.5]]) { d.e(x, y, 2.4, 2.4, 'c'); d.x(x, y, 'a'); } d.r(26, 29, 2, 2, 'D'); }],
    broom: ['빗자루', (d) => { hK(d, 16, 40); d.p([[24, 16], [29, 16], [32, 4], [21, 4]], 'c'); d.r(24, 14, 6, 2, 'a'); for (const x of [23, 26, 29]) d.l(x, 5, x, 12, 'D'); }], fan: ['부채', (d) => { d.p([[26, 36], [20, 24], [32, 24]], 'c'); d.o(26, 36, 13, 13, 11, 11, 'a', 23, 26); for (const x of [22, 26, 30]) d.l(26, 36, x, 24, 'D'); hK(d, 36, 38); }],
    mug: ['컵 · 병', (d) => { d.r(24, 31, 6, 7, 'c'); d.o(30, 34, 2.4, 2.6, 1.2, 1.4, 'c'); d.r(25, 32, 4, 1, 'a'); d.l(26, 28, 27, 26, 'w'); d.l(28, 29, 29, 27, 'w'); }], flag: ['깃발', (d) => { hK(d, 4, 44); d.p([[28, 5], [32, 8], [28, 12]], 'c'); d.r(28, 5, 4, 7, 'c'); d.r(28, 8, 4, 1, 'a'); }],
};
const pack = (o) => Object.fromEntries(Object.entries(o).map(([id, [n, f, b]]) => [id, { n, f, b }]));
export const HAIRS = pack(HAIR_DEF);
export const SHAPES = { top: pack(TOPS), bottom: pack(BOTTOMS), outer: pack(OUTERS), shoes: pack(SHOESET), acc: pack(ACCS), weapon: pack(WEAPONS) };
export const KIND_NAMES = { top: '상의', bottom: '하의', outer: '겉옷', shoes: '신발', acc: '장신구', weapon: '손에 든 것' };
export const shapeName = (kind, id) => SHAPES[kind]?.[id]?.n ?? id;
// 그려 둔 칸 그림은 기억해 둔다
const LAYERS = new Map();
function layerOf(key, def) { if (!def) return null; let v = LAYERS.get(key); if (!v) { const hand = key.startsWith('weapon:'); v = { f: draw(def.f, hand), b: draw(def.b, hand) }; LAYERS.set(key, v); } return v; }

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
    outer: [['bomber', /야구 ?점퍼|바시티|bomber|varsity/i], ['kappa', /어깨 ?망토|capelet/i], ['cloak', /후드 ?망토|hooded cloak|cloak|hooded cape/i], ['raincoat', /우비|raincoat/i], ['cape', /망토|케이프|cape|mantle/i], ['robe', /로브|robe|gown/i], ['poncho', /판초|poncho/i], ['trench', /트렌치|trench/i], ['labcoat', /가운|lab ?coat/i], ['longcoat', /롱코트|long coat|overcoat|duster/i],
        ['parka', /파카|parka|anorak/i], ['puffer', /패딩|puffer|down jacket/i], ['blazer', /블레이저|blazer|suit jacket/i], ['denim', /청자켓|청재킷|denim/i], ['cardigan', /가디건|cardigan/i], ['vest', /조끼|vest|waistcoat/i], ['haori', /하오리|haori|두루마기/i], ['shawl', /숄|shawl|stole/i], ['pauldron', /견갑|pauldron|shoulder/i], ['jacket', /자켓|재킷|점퍼|jacket|jumper|bomber|windbreaker/i]],
    top: [['maid', /메이드|maid/i], ['blouse', /블라우스|blouse/i], ['plaidshirt', /체크 ?셔츠|flannel|plaid shirt/i], ['jersey', /유니폼|저지|jersey/i], ['waistcoat', /조끼 ?셔츠|waistcoat/i], ['raglan', /래글런|raglan|baseball tee/i], ['longdress', /드레스|gown|ball/i], ['sundress', /끈 ?원피스|sundress/i], ['dress', /원피스|dress/i], ['chain', /사슬|chain ?mail/i], ['armor', /갑옷|흉갑|armor|armour|plate|cuirass/i], ['kimono', /기모노|한복|유카타|저고리|kimono|hanbok|yukata/i], ['apron', /앞치마|apron/i], ['suit', /정장|수트|suit|tuxedo/i],
        ['sailor', /세일러|교복|sailor|uniform/i], ['overalls', /멜빵|overall|dungaree/i], ['hoodie', /후드티|후디|hoodie/i], ['turtle', /목폴라|터틀|turtleneck/i], ['sweater', /스웨터|니트|sweater|knit|pullover/i], ['shirt', /셔츠|블라우스|shirt|blouse/i], ['polo', /폴로|카라|polo/i], ['tunic', /튜닉|tunic/i],
        ['tank', /민소매|나시|탱크|tank|sleeveless|camisole/i], ['crop', /크롭|crop/i], ['stripe', /줄무늬|stripe/i], ['long', /긴팔|long ?sleeve/i]],
    bottom: [['capri', /7부|칠부|capri/i], ['bloomers', /호박 ?바지|블루머|bloomer/i], ['tiered', /티어드|tiered/i], ['longskirt', /긴 ?치마|롱스커트|long skirt|maxi/i], ['pleated', /주름|플리츠|pleat/i], ['plaid', /체크|plaid|tartan|kilt/i], ['frill', /프릴|frill|ruffle/i], ['mini', /미니|mini/i], ['tights', /스타킹|타이츠|tights|stocking/i], ['skirt', /치마|스커트|skirt/i],
        ['swim', /수영|swim|trunks/i], ['shorts', /반바지|shorts/i], ['hakama', /하카마|hakama/i], ['wide', /통바지|와이드|wide|baggy/i], ['jeans', /청바지|jeans|denim/i], ['cargo', /카고|cargo/i], ['sweat', /트레이닝|츄리닝|sweat|track|jogger/i], ['slacks', /슬랙스|정장 ?바지|slacks|trousers/i], ['greaves', /각반|greaves|leg armor/i]],
    shoes: [['mary', /메리 ?제인|mary ?jane/i], ['skates', /스케이트|skate/i], ['sabatons', /철 ?장화|sabaton/i], ['rain', /장화|rain ?boot|wellies/i], ['fur', /털|fur|ugg/i], ['work', /작업화|안전화|work ?boot/i], ['tall', /롱부츠|long boot|knee|thigh/i], ['boots', /부츠|boot/i], ['hightop', /하이탑|high ?top/i], ['sneakers', /운동화|스니커|sneaker|trainer|running/i],
        ['sandals', /샌들|sandal/i], ['slippers', /슬리퍼|slipper|flip/i], ['loafers', /로퍼|loafer/i], ['heels', /구두|하이힐|heel|pump|dress shoe/i], ['geta', /게다|나막신|geta|clog/i], ['kneesocks', /긴 ?양말|knee ?sock/i], ['socks', /양말|sock/i]],
    acc: [['headphones', /헤드폰|헤드셋|headphone|headset/i], ['necktie', /넥타이|necktie/i], ['tail', /꼬리|tail/i], ['straw', /밀짚|챙|straw|sun ?hat|brim/i], ['witch', /마녀|wizard hat|witch/i], ['tophat', /실크햇|top ?hat/i], ['beret', /베레|beret/i], ['beanie', /비니|beanie|knit cap/i], ['helmet', /투구|헬멧|helmet|helm/i], ['bandana', /두건|반다나|bandana|kerchief/i], ['cap', /모자|hat|cap/i],
        ['crown', /왕관|crown/i], ['tiara', /티아라|tiara/i], ['headband', /머리띠|headband/i], ['ribbon', /리본|ribbon|bow\b/i], ['flower', /꽃|flower/i], ['catears', /고양이 ?귀|cat ?ear/i], ['bunny', /토끼 ?귀|bunny|rabbit/i], ['horns', /뿔|horn/i], ['halo', /고리|halo/i],
        ['shades', /선글라스|sunglass|shades/i], ['glasses', /안경|glasses|spectacle/i], ['eyepatch', /안대|eyepatch/i], ['mask', /마스크|복면|가면|mask/i], ['scarf', /목도리|스카프|머플러|scarf|muffler/i], ['bowtie', /나비넥타이|bow ?tie/i], ['necklace', /목걸이|펜던트|necklace|pendant|amulet|charm/i],
        ['wings', /날개|wing/i], ['backpack', /배낭|백팩|backpack|rucksack/i], ['earrings', /귀걸이|earring/i]],
    weapon: [['fan', /부채|\bfan\b/i], ['mug', /컵|잔|물병|술병|mug|cup|bottle|flask/i], ['flag', /깃발|flag|banner/i], ['dagger', /단검|단도|나이프|dagger|knife/i], ['axe', /도끼|axe/i], ['hammer', /망치|해머|hammer|mace/i], ['wand', /요술봉|완드|wand/i], ['staff', /지팡이|스태프|staff|cane/i], ['spear', /창|spear|lance|halberd/i], ['bow', /활|bow/i], ['rifle', /소총|라이플|rifle|shotgun|musket/i], ['gun', /총|gun|pistol|revolver/i],
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
function toHsl(hex) { const [r, g, b] = rgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn; if (!dd) return [0, 0, l]; const sat = dd / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; if (h < 0) h += 360; return [h, sat, l]; }
function fromHsl(h, sat, l) { const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), mm = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return hexOf([(r + mm) * 255, (g + mm) * 255, (b + mm) * 255]); }
const turn = (h, to, k) => { let dlt = ((to - h + 540) % 360) - 180; return (h + dlt * k + 360) % 360; };
// 그늘은 어둡게 + 보랏빛 쪽으로, 빛은 밝게 + 노란빛 쪽으로 (그냥 검정 · 흰색을 섞으면 탁해 보인다)
const memo = new Map();
const mixTo = (hex, to, k) => hexOf(rgb(hex).map((v, n) => v + (to[n] - v) * k));
function shade(hex, a) { const k = `s${hex}${a}`; let v = memo.get(k); if (!v) { v = mixTo(hexOf(rgb(hex).map(c => 255 * Math.pow(c / 255, 1 + a * 3) * (1 - a * 0.55))), [58, 40, 92], a * 0.25); memo.set(k, v); } return v; }
function tint(hex, a) { const k = `t${hex}${a}`; let v = memo.get(k); if (!v) { v = mixTo(hex, [255, 248, 222], a); memo.set(k, v); } return v; }
const MAIN = new Set(['c', 's', 'h']);
// 한 장을 칠한다 (빛은 왼쪽 위에서): 아래 · 오른쪽 가장자리 = 짙은 그늘 · 그 안쪽 한 칸 = 옅은 그늘 · 위 · 왼쪽 안쪽 한 칸 = 밝은 띠 · 나머지 = 바탕
function paint(img, g, pal, flat = false) {
    if (!g) return;
    const has = (y, x) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] !== '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = g[y][x]; if (!ch) continue;
        const base = pal[ch]; if (!base) continue;
        let col = base;
        if (!flat && MAIN.has(ch)) {
            if (!has(y + 1, x) || !has(y, x + 1)) col = shade(base, 0.2);
            else if (!has(y + 2, x) || !has(y, x + 2)) col = shade(base, 0.09);
            else if (has(y - 1, x) && has(y, x - 1) && (!has(y - 2, x) || !has(y, x - 2))) col = tint(base, 0.2);
        }
        img[y][x] = col;
    }
}
// 다 겹친 뒤: 그림 전체의 바깥 테두리만 짙게 (칸마다 테두리를 치면 지저분해 보인다)
function outline(img) {
    const occ = img.map(r => r.map(Boolean)), at = (y, x) => y >= 0 && y < H && x >= 0 && x < W && occ[y][x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (occ[y][x] && !(at(y - 1, x) && at(y + 1, x) && at(y, x - 1) && at(y, x + 1))) img[y][x] = shade(img[y][x], 0.7);
}
const clothPal = (c, skin) => ({ c, a: tint(c, 0.55), L: tint(c, 0.3), D: shade(c, 0.22), w: '#f7f4ee', k: '#5a4636', s: skin });
export const HURT_PARTS = { head: '머리', torso: '몸통', arms: '팔', legs: '다리' };
const inPart = (part, y, x) => (part === 'head' ? y <= 22 : part === 'torso' ? y >= 23 && y <= 30 && x >= 12 && x <= 19 : part === 'arms' ? y >= 23 && y <= 31 && (x < 12 || x > 19) : part === 'legs' ? y >= 31 : false);
const BODY_G = draw(BODY);
function toUrl(img, only) {
    if (typeof document === 'undefined') return '';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); if (!c) return '';
    if (!only) { c.fillStyle = 'rgba(40,30,60,.2)'; c.fillRect(9, 37, 14, 1); c.fillStyle = 'rgba(40,30,60,.14)'; c.fillRect(11, 38, 10, 1); }
    let any = false;
    for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
        const col = img[y][x]; if (!col || (only && !only(y, x))) { x++; continue; }
        let n = 1; while (x + n < W && img[y][x + n] === col && (!only || only(y, x + n))) n++;
        c.fillStyle = only ? '#e02a2a' : col; c.fillRect(x, y, n, 1); x += n; any = true;
    }
    return any ? cv.toDataURL('image/png') : '';
}
function render(look, wear, mood, hurt) {
    const img = Array.from({ length: H }, () => Array(W).fill(''));
    const skin = look.skin || SKINS[0], hc = look.hairColor || HAIR_COLORS[1];
    const hairId = HAIRS[look.hair] ? look.hair : 'short', hair = layerOf(`hair:${hairId}`, HAIRS[hairId]);
    const of = (kind) => { const x = wear.find(v => v.kind === kind); return x && SHAPES[kind]?.[x.shape] ? { g: layerOf(`${kind}:${x.shape}`, SHAPES[kind][x.shape]), pal: clothPal(x.color, skin) } : null; };
    const top = of('top') ?? { g: layerOf('top:tee', SHAPES.top.tee), pal: clothPal('#f7f4ee', skin) }, bottom = of('bottom') ?? { g: layerOf('bottom:shorts', SHAPES.bottom.shorts), pal: clothPal('#8a8f98', skin) };
    const outer = of('outer'), shoes = of('shoes'), acc = of('acc'), weapon = of('weapon');
    const hairPal = { h: hc, a: '#e2557b', D: shade(hc, 0.24) };
    paint(img, hair.b, hairPal); if (top.g.b) paint(img, top.g.b, top.pal); if (outer?.g.b) paint(img, outer.g.b, outer.pal); if (acc?.g.b) paint(img, acc.g.b, acc.pal);
    paint(img, BODY_G, { s: skin });
    paint(img, bottom.g.f, bottom.pal); if (shoes) paint(img, shoes.g.f, shoes.pal);
    paint(img, top.g.f, top.pal);
    if (outer) paint(img, outer.g.f, outer.pal);
    for (let x = 12; x <= 19; x++) if (img[23][x]) img[23][x] = shade(img[23][x], 0.14); // 턱 밑 그늘
    paint(img, hair.f, hairPal);
    if (hair.f) for (let x = 9; x <= 17; x++) for (const y of [6, 7]) if (hair.f[y][x] === 'h' && (x + y) % 5 !== 0 && (y === 6 ? x < 16 : x < 13)) img[y][x] = tint(hc, 0.38); // 머리카락 윤기
    for (let x = 8; x <= 23; x++) if (img[15][x] && hair.f?.[14]?.[x] === 'h' && !hair.f[15][x]) img[15][x] = shade(img[15][x], 0.1); // 앞머리 그늘
    const faceId = FACE_DEF[look.face] ? look.face : MOOD_FACE[Math.max(0, Math.min(4, Math.round(mood)))];
    const eye = look.eye || '#8a5230', mix = (a, b, k) => hexOf(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * k));
    paint(img, layerOf(`face:${faceId}`, { f: FACE_DEF[faceId] }).f, { e: shade(eye, 0.62), j: shade(eye, 0.3), i: eye, I: tint(eye, 0.42), W: '#ffffff', m: mix(skin, '#9a3f3f', 0.62), b: mix(skin, '#f47a8a', 0.5), t: '#7cc4f5', p: '#f06a9a' }, true);
    if (acc?.g.f) paint(img, acc.g.f, acc.pal);
    for (let y = 24; y <= 30; y++) for (const x of [11, MID - 11]) if (img[y][x] && img[y][x + (x === 11 ? 1 : -1)]) img[y][x] = shade(img[y][x], 0.3); // 팔과 몸통 사이 그늘 (안 그러면 팔이 몸에 붙어 보인다)
    outline(img);
    if (weapon?.g.f) paint(img, weapon.g.f, weapon.pal, true);
    return [toUrl(img), hurt.length ? toUrl(img, (y, x) => hurt.some(p => inPart(p, y, x))) : ''];
}
const CACHE = new Map();
// look = { skin, hair, hairColor, eye, face } · wear = [{ kind, shape, color }] · mood 0~4 · hurt = ['head' …] → 그림 한 장(+ 다친 곳 한 장)
export function dollSVG(look = {}, wear = [], mood = 3, cls = '', hurt = []) {
    const key = JSON.stringify([look.skin, look.hair, look.hairColor, look.eye, look.face, wear.map(w => [w.kind, w.shape, w.color]), look.face ? 0 : Math.round(mood), hurt]);
    let u = CACHE.get(key);
    if (!u) { u = render(look, wear, mood, hurt); CACHE.set(key, u); if (CACHE.size > 160) CACHE.delete(CACHE.keys().next().value); }
    return `<span class="ss-px ${cls}"><img alt="" src="${u[0]}">${u[1] ? `<img class="ss-px-hurt" alt="" src="${u[1]}">` : ''}</span>`;
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
