// 🎵 폰에서 바로 듣기 · 떠 있는 작은 창
//   유튜브 검색 퍼가기(embed?listType=search)는 2020-11-15부터 막혀서, 영상 id가 있어야 재생된다.
//   AI에게 id를 받지 않는다(지어냄). 「유튜브 API 키」가 있으면 ▶를 누를 때 YouTube Data API 검색 1회로 id를 얻는다.
//   키가 없거나 「새 탭으로」 · 스포티파이 · 멜론이면 지금처럼 새 탭으로 연다(링크 그대로).
//   iframe은 #ml-full 밖 body에 하나만 → 폰 창을 닫아도 계속 재생. 새 곡이 와도 저절로 넘어가지 않고 알림만.
import { settings, saveSettings } from '../base/st.js';
import { esc } from '../base/util.js';
import { fold } from '../rules/engine.js';
import { toast, layerHost } from './kit.js';
import { songLink } from './music.js';

const EMBED = 'https://www.youtube-nocookie.com';
const ID = 'mbp';
const ids = new Map(); // 곡 → 영상 id (이 창에서만 기억 · 같은 곡 다시 누르면 검색 안 함)
let cur = null, pending = null, playing = false, big = false;

const keyOf = (s) => `${s?.title ?? ''}|${s?.artist ?? ''}`.toLowerCase().trim();
const query = (s) => `${s.title} ${s.artist ?? ''}`.trim();
const narrow = () => innerWidth < 900;

// 폰에서 들을 수 있나: 설정이 「폰에서」 · 유튜브(뮤직) · 키 있음
export function canPlay() {
    const s = settings();
    return s.musicPlay !== 'tab' && ['youtube', 'ytmusic'].includes(s.musicApp || 'youtube') && !!String(s.ytKey ?? '').trim();
}

// YouTube Data API 검색 1회 → 퍼갈 수 있는 첫 영상 id
async function findId(song) {
    const k = keyOf(song);
    if (ids.has(k)) return ids.get(k);
    const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=1&q=${encodeURIComponent(query(song))}&key=${encodeURIComponent(String(settings().ytKey).trim())}`;
    const res = await fetch(u, { signal: AbortSignal.timeout?.(8000) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error?.message ? `유튜브: ${j.error.message}` : `유튜브 ${res.status}`);
    const id = j?.items?.[0]?.id?.videoId;
    if (!id || !/^[\w-]{6,20}$/.test(id)) throw new Error('영상을 못 찾았어요');
    ids.set(k, id);
    return id;
}

// ───── 작은 창 ─────
function box() {
    let el = document.getElementById(ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = ID; el.className = 'ml-scope mbp';
    el.innerHTML = '<div class="mbp-v"></div>'
        + '<div class="mbp-m"><span class="mbp-t"><b></b><small></small></span>'
        + '<span class="mbp-c"><button class="mbp-b" data-mbp="toggle" title="재생 · 멈춤">⏸</button><button class="mbp-b" data-mbp="big" title="크게 보기">⤢</button><button class="mbp-b" data-mbp="close" title="닫기">✕</button></span></div>'
        + '<button class="mbp-new" data-mbp="new" hidden></button>';
    layerHost().appendChild(el);
    el.addEventListener('click', onBox);
    el.addEventListener('pointerdown', dragStart);
    return el;
}
function head(el, song, sub) {
    el.querySelector('.mbp-t b').textContent = song.title;
    el.querySelector('.mbp-t small').textContent = sub ?? song.artist ?? '';
}
function setIcon() { const b = document.querySelector(`#${ID} [data-mbp="toggle"]`); if (b) b.textContent = playing ? '⏸' : '▶'; }

export async function playSong(song, href = '') {
    if (!song?.title) return;
    const el = box();
    cur = song; pending = null; el.querySelector('.mbp-new').hidden = true;
    head(el, song, '찾는 중…');
    const v = el.querySelector('.mbp-v');
    place();
    try {
        const id = await findId(song);
        if (cur !== song) return; // 그 사이 다른 곡을 눌렀음
        v.innerHTML = '';
        const f = document.createElement('iframe');
        f.src = `${EMBED}/embed/${id}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`;
        f.title = song.title; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.addEventListener('load', () => { try { f.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: ID, channel: 'widget' }), EMBED); } catch { /* 없음 */ } });
        v.appendChild(f);
        playing = true; setIcon();
        head(el, song);
        if (narrow() && document.getElementById('ml-full')) toast('🎵 폰 창을 닫으면 위쪽 작은 창이 보여요');
    } catch (e) {
        if (cur !== song) return;
        v.innerHTML = href ? `<a class="mbp-out" href="${esc(href)}" target="_blank" rel="noopener">새 탭에서 열기 ↗</a>` : '';
        playing = false; setIcon();
        head(el, song, '폰에서 못 틀었어요');
        toast(`폰에서 못 틀었어요 · ${e.message}`, 'bad');
    }
}
export const closePlayer = () => closeBox(); // 🗑 음악 앱을 지우거나 이 채팅에서 끌 때
function closeBox() { document.getElementById(ID)?.remove(); cur = null; pending = null; playing = false; big = false; }
function send(func) {
    const f = document.querySelector(`#${ID} iframe`);
    try { f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), EMBED); } catch { /* 없음 */ }
}
function onBox(e) {
    const b = e.target.closest('[data-mbp]'); if (!b) return;
    const el = document.getElementById(ID);
    switch (b.dataset.mbp) {
        case 'toggle': if (!el.querySelector('iframe')) return; playing = !playing; send(playing ? 'playVideo' : 'pauseVideo'); setIcon(); return;
        case 'big': big = !big; el.classList.toggle('big', big); b.textContent = big ? '⤡' : '⤢'; b.title = big ? '작게 보기' : '크게 보기'; place(); return;
        case 'close': closeBox(); return;
        case 'new': if (pending) playSong(pending, songLink(pending)); return;
    }
}
// 유튜브가 알려 주는 재생 상태로 ⏯ 모양 맞추기
addEventListener('message', (e) => {
    if (e.origin !== EMBED || !document.getElementById(ID)) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    const s = d?.info?.playerState;
    if (typeof s === 'number' && (s === 1 || s === 2 || s === 0)) { playing = s === 1; setIcon(); }
});

// ───── 자리: 끌어서 옮기기 · 설정에 기억 (노트북 d · 휴대폰 m 따로) ─────
function place() {
    const el = document.getElementById(ID); if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight, m = narrow() ? 'm' : 'd';
    const p = settings().musicPos?.[m];
    // 기본: 노트북은 오른쪽 아래(폰 창이 왼쪽) · 휴대폰은 입력창을 가리지 않는 위쪽
    let x = p ? p.x : innerWidth - w - (m === 'm' ? 8 : 16), y = p ? p.y : (m === 'm' ? 48 : innerHeight - h - 16);
    x = Math.max(4, Math.min(innerWidth - w - 4, x)); y = Math.max(4, Math.min(innerHeight - h - 4, y));
    el.style.left = `${Math.round(x)}px`; el.style.top = `${Math.round(y)}px`;
}
function dragStart(e) {
    if (e.button !== 0 || e.target.closest('button, a, iframe')) return;
    const el = document.getElementById(ID), r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    let moved = false;
    const mv = (ev) => {
        moved = true; el.classList.add('drag');
        el.style.left = `${Math.max(4, Math.min(innerWidth - r.width - 4, ev.clientX - dx))}px`;
        el.style.top = `${Math.max(4, Math.min(innerHeight - r.height - 4, ev.clientY - dy))}px`;
    };
    const up = () => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        el.classList.remove('drag');
        if (!moved) return;
        const s = settings(); s.musicPos = { ...(s.musicPos ?? {}), [narrow() ? 'm' : 'd']: { x: parseFloat(el.style.left), y: parseFloat(el.style.top) } };
        saveSettings();
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    e.preventDefault();
}
addEventListener('resize', () => place());

// ───── 새 곡이 오면: 저절로 안 바꾸고 「새 곡: ○○ ▶」만 ─────
function nowSong() { try { return fold()?.S?.bgm ?? null; } catch { return null; } }
document.addEventListener('meatlite:update', () => {
    const el = document.getElementById(ID); if (!el || !cur) return;
    const b = nowSong();
    if (!b?.title || keyOf(b) === keyOf(cur) || (pending && keyOf(b) === keyOf(pending))) return;
    pending = { title: b.title, artist: b.artist ?? '' };
    const n = el.querySelector('.mbp-new'); n.textContent = `새 곡: ${b.title} ▶`; n.hidden = false;
    place();
});

// ───── ▶ 누르기 (음악 앱 · 홈 플레이어 · 「이 장면」 줄) ─────
// 들을 수 없으면 손대지 않음 → 링크가 새 탭으로 열린다
document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a.ml-play, a.ml-pl-play, a.ml-scene[href]');
    if (!a || !canPlay()) return;
    let song = null;
    try { song = a.dataset.song ? JSON.parse(a.dataset.song) : null; } catch { /* 없음 */ }
    song ??= nowSong();
    if (!song?.title) return;
    e.preventDefault(); e.stopPropagation();
    playSong({ title: song.title, artist: song.artist ?? '' }, a.href);
}, true);
