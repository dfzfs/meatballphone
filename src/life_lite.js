// 🍞 생활 틀 — 늘 보이는 가벼운 부분만 (life.js에서 뗌)
//   상점 · 재산 탭의 「미트볼 상점 넣기」 · 「고지서」, 관리 › 쓸 기능의 「🎮 게임 모드 · 생활 탭」 상자, 탭이 켜졌나, 물건 효과 아이콘
//   무거운 부분(욕구 화면 · 도트 인형 · 옷 입히기 · 모드 적용)은 life.js — ⚡ 생활 틀을 켠 채팅에서만 불러온다 (feat.js)
//   여기 단추(lifeshop · lifebills · lifemode · lifetab)를 누르면 shell.js가 life.js를 불러와서 그 동작을 한다
import { app, settings, getMeta, modOn, esc, fmtNum, norm, isSimple } from './core.js';
import { kindOf, needIcon } from './needicons.js';
import { sec } from './kit.js';

const reEsc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const isMeatShop = (x) => ['미트볼 상점', 'Meatball Mart'].some(n => norm(n) === norm(x?.name));
export const lifeOf = () => getMeta()?.life ?? {};
export const needsTabOn = () => lifeOf().needs === true && modOn('stats');
export const wearTabOn = () => lifeOf().wear === true; // 🎨 꾸미기 탭 (v2.9): 내 인형의 옷 입히기만 재산 칸이 있어야 하고, 다른 인물 인형은 없어도 된다
export const MODES = {
    rp: { icon: '🍱', name: '롤플', desc: '상태만 계산해요 (욕구 · 꾸미기 탭 없음)' },
    life: { icon: '🏡', name: '생활', desc: '심즈 · 스타듀 · 동숲처럼 — 욕구 · 꾸미기 · 미트볼 상점 · 생활비', bars: ['hunger', 'energy', 'hygiene', 'fun', 'social'], speed: 1, bills: true, shop: {} },
    fusion: { icon: '🌀', name: '융합', desc: '생활 + 생존 조금 — 수분 · 체온까지', bars: ['hp', 'hunger', 'thirst', 'energy', 'hygiene', 'fun', 'social', 'warmth'], speed: 1, bills: true, shop: {} },
    apoc: { icon: '🧟', name: '아포칼립스', desc: '좀보이드처럼 — 욕구가 빠르게 줄고, 가게는 비싸고 물건이 적어요', bars: ['hp', 'thirst', 'hunger', 'energy', 'warmth', 'stress', 'boredom'], speed: 1.5, bills: false, shop: { mul: 3, stock: 2 } },
};
export function goodIcon(it) {
    if (!it?.effect) return '';
    const bars = app.current?.state?.data?.stats?.bars ?? [], b = bars.find(x => new RegExp(`${reEsc(x.name)}\\s*[+\\-−]`, 'i').test(it.effect));
    return b ? `<span class="ss-good-ic k-${kindOf(b.name) || 'other'}">${needIcon(b.name)}</span>` : '';
}
export function lifeBox() {
    const meta = getMeta(), L = meta?.life ?? {}, mode = MODES[meta?.mode] ? meta.mode : (L.needs || L.wear ? '' : 'rp');
    return sec('🎮 게임 모드 · 생활 탭 <small>이 채팅만</small>', `
        <div class="ss-seg wrap stack">${Object.entries(MODES).map(([k, m]) => `<button class="${mode === k ? 'on' : ''}" data-act="lifemode" data-arg="${k}">${m.icon} ${m.name}<small>${m.desc}</small></button>`).join('')}</div>
        <div class="ss-pills"><small>탭 하나씩</small>
            <button class="ss-pill ${L.needs ? 'on' : ''}" data-act="lifetab" data-arg="needs" title="다마고치 화면 · 욕구 타일 · 추천 세트">${L.needs ? '<i class="fa-solid fa-check"></i> ' : ''}🍞 욕구 탭</button>
            <button class="ss-pill ${L.wear ? 'on' : ''}" data-act="lifetab" data-arg="wear" title="인물마다 도트 인형 만들기 · 옷 입히기 · 프로필 얼굴">${L.wear ? '<i class="fa-solid fa-check"></i> ' : ''}🎨 꾸미기 탭</button>${L.needs ? `<button class="ss-pill ${settings().lifeFx !== false ? 'on' : ''}" data-act="lifefx" title="단계가 바뀔 때 딱지가 튀어나오고, 욕구가 바닥이면 화면 가장자리가 물들어요 · 모든 채팅에 걸려요">${settings().lifeFx !== false ? '<i class="fa-solid fa-check"></i> ' : ''}✨ 화면 연출</button>` : ''}</div>
        <p class="ss-hint">모드는 「무엇을 켤지」의 묶음이에요. 고르면 필요한 탭 · 게이지 · 가게가 한 번에 들어가고(AI 0회), 그 뒤에 하나씩 켜고 끌 수 있어요. 롤플로 돌려도 넣어 둔 게이지 · 가게는 지워지지 않아요 — 욕구가 저절로 줄어드는 것까지 멈추려면 욕구 탭의 「저절로 줄기 끄기」.</p>`);
}
export function shopExtra(s) {
    if (isSimple()) return '';
    const has = (s.data.shop?.shops ?? []).some(isMeatShop);
    return `<div class="ss-row-btns ss-life-x"><button class="ss-btn sm ${has ? 'ghost' : ''}" data-act="lifeshop" title="지금 있는 게이지를 채워 주는 기본 품목 · 물약이 늘 있는 가게"><i class="fa-solid fa-store"></i> ${has ? '미트볼 상점 품목 다시 맞추기' : '미트볼 상점 넣기'}</button></div>`;
}
export function walletExtra(s) {
    const bills = (s.data.wallet?.regular ?? []).filter(r => r.amount < 0).slice(0, 6), EV = { day: '매일', week: '매주', month: '매달' };
    return sec('🧾 고지서 <small>정기 지출</small>', `${bills.length ? `<div class="ss-bills">${bills.map(r => `<span class="ss-bill"><b>${esc(r.name)}</b><em>−${fmtNum(Math.abs(r.amount))}</em><small>${EV[r.every] ?? ''}</small></span>`).join('')}</div>` : '<p class="ss-hint">아직 정기적으로 나가는 돈이 없어요.</p>'}
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="lifebills" title="월세 · 관리비 · 통신비 · 구독료를 정기 지출에 넣어요 (값은 편집에서 고쳐요)"><i class="fa-solid fa-file-invoice-dollar"></i> 생활비 틀 넣기</button></div>`);
}
