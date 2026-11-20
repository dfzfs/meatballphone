// 🎵 추천 음악 · 📜 한 구절 — dev처럼 AI가 장면을 보고 고른다 (B: 분류 모델 1회에 같이 · A: 본편이 bgm: · quote: 줄로)
//   저장은 그 메시지 · 스와이프의 사건(bgm · quote)이라 리롤 · 분기 · 삭제에 맞게 따라간다.
//   버튼(「다른 곡」 · 「다른 구절」)만 따로 AI 1회 → 바로 손 고침(hand)으로 그 답에 적는다.
import { getMeta, saveMeta, settings, saveSettings, ctx } from '../base/st.js';
import { esc, short } from '../base/util.js';
import { stripTags } from '../rules/tags.js';
import { askLight, tasteOf, recentQuotes } from '../rules/classify.js';
import { parseJSON } from '../rules/ai.js';
import { sheet, form, toast, btn } from './kit.js';
import { canPlay } from './player.js';

// ▶ 누르면 열 곳 (dev MUSIC_APPS · songLink과 같음)
export const MUSIC_APPS = {
    youtube: { name: '유튜브', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
    ytmusic: { name: '유튜브 뮤직', url: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
    spotify: { name: '스포티파이', url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    melon: { name: '멜론', url: (q) => `https://www.melon.com/search/total/index.htm?q=${encodeURIComponent(q)}` },
};
export const songLink = (x) => (MUSIC_APPS[settings().musicApp] ?? MUSIC_APPS.youtube).url(`${x.title} ${x.artist ?? ''}`.trim());
const songData = (x) => esc(JSON.stringify({ title: x.title, artist: x.artist ?? '' }));
const play = (x) => `<a class="ml-btn xs ml-play" href="${esc(songLink(x))}" target="_blank" rel="noopener" data-song="${songData(x)}" title="${canPlay() ? '폰에서 듣기' : `${esc((MUSIC_APPS[settings().musicApp] ?? MUSIC_APPS.youtube).name)}에서 열기`}">▶</a>`;
const lastAIOf = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
const sceneText = () => { const i = lastAIOf(); return i >= 0 ? short(stripTags(ctx().chat[i].mes), 1500) : ''; };

// 「이 장면」 한 줄 (홈 · 수치 화면)
export function songLine(S) {
    const b = S.bgm;
    if (!b) return '<div class="ml-scene tap" data-act="open" data-v="music"><i>🎵</i><span><b>아직 고른 곡이 없어요</b><small>장면 분위기가 바뀌면 AI가 골라요</small></span><em>›</em></div>';
    return `<a class="ml-scene tap" href="${esc(songLink(b))}" target="_blank" rel="noopener" data-song="${songData(b)}"><i>🎵</i><span><b>${esc(b.title)}${b.artist ? ` <small>· ${esc(b.artist)}</small>` : ''}</b>`
        + `<small>${esc([b.mood, b.why].filter(Boolean).join(' · '))}</small></span><em>▶</em></a>`;
}
export function quoteLine(S) {
    const q = S.quote;
    if (!q) return '<div class="ml-scene tap" data-act="open" data-v="quote"><i>📜</i><span><b>아직 고른 구절이 없어요</b><small>장면 분위기가 바뀌면 AI가 골라요</small></span><em>›</em></div>';
    return `<div class="ml-scene tap" data-act="open" data-v="quote"><i>📜</i><span><b>${esc(q.text)}</b><small>${esc(q.mean || q.src)}</small></span><em>ⓘ</em></div>`;
}

// ───── 🎵 추천 음악 앱 ─────
export function musicView(r) {
    const { S } = r, b = S.bgm, meta = getMeta();
    let h = b
        ? `<div class="ml-song"><div class="ml-song-h"><i>🎵</i><span><b>${esc(b.title)}</b><small>${esc(b.artist || '가수 모름')}${b.mood ? ` · ${esc(b.mood)}` : ''}</small></span>${play(b)}</div>`
            + `${b.why ? `<div class="ml-rl"><i>💡</i>${esc(b.why)}</div>` : ''}<small class="ml-sub">🤖 AI가 장면을 보고 고른 곡이에요 · 실제로 없는 곡일 수도 있어요</small></div>`
        : '<div class="ml-empty"><p>아직 고른 곡이 없어요. 장면 분위기가 바뀌면 AI가 골라요.</p></div>';
    h += `<div class="ml-acts">${btn('🔄 다른 곡 <small>(AI 1회)</small>', 'song-new', '', 'sm')}</div>`;
    h += `<h4 class="ml-h4">음악 취향 <span>이 채팅 · 비우면 기본값</span></h4>`
        + `<div class="ml-rl tap" data-act="taste-edit"><i>🎼</i>${esc(meta.musicTaste || '(기본값)')} <span>· 기본 ${esc(settings().musicTaste || '없음')}</span></div>`;
    h += `<h4 class="ml-h4">▶ 누르면 열 곳</h4><div class="ml-picks">${Object.entries(MUSIC_APPS).map(([k, a]) => `<button class="ml-btn xs${(settings().musicApp || 'youtube') === k ? ' on' : ''}" data-act="musicapp" data-v="${k}">${a.name}</button>`).join('')}</div>`;
    const s = settings(), ytApp = ['youtube', 'ytmusic'].includes(s.musicApp || 'youtube');
    h += `<h4 class="ml-h4">▶ 누르면</h4><div class="ml-picks">${[['phone', '폰에서 듣기'], ['tab', '새 탭으로']].map(([k, n]) => `<button class="ml-btn xs${(s.musicPlay || 'phone') === k ? ' on' : ''}" data-act="musicplay" data-v="${k}">${n}</button>`).join('')}</div>`
        + `<div class="ml-rl tap" data-act="ytkey"><i>🔑</i>유튜브 API 키 <span>· ${s.ytKey ? '넣음' : '없음 (선택)'}</span></div>`
        + `<div class="ml-hint">${!ytApp ? '스포티파이 · 멜론은 새 탭으로만 열어요.'
            : s.musicPlay === 'tab' ? '▶를 누르면 새 탭으로 열어요.'
            : s.ytKey ? '▶를 누르면 폰 구석의 작은 창에서 바로 들어요. 누를 때마다 유튜브 검색 1회(같은 곡은 다시 안 함). 폰 창을 닫아도 계속 나와요.'
            : '유튜브는 제목만으로 바로 틀 수 없어요. 키를 넣으면 폰 안 작은 창에서 바로 들어요. 키가 없으면 새 탭으로 열어요.'}</div>`;
    h += `<h4 class="ml-h4">곡이 바뀌면 알림</h4><div class="ml-picks">${[['on', '켜기'], ['off', '끄기']].map(([k, n]) => `<button class="ml-btn xs${(settings().musicPop ?? 'on') === k ? ' on' : ''}" data-act="musicpop" data-v="${k}">${n}</button>`).join('')}</div>`;
    const log = (S.bgmLog ?? []).slice(0, -1).reverse().slice(0, 15);
    if (log.length) h += `<h4 class="ml-h4">지난 곡 <span>누르면 그 답으로</span></h4>${log.map(x => `<div class="ml-rl"><i>🎶</i><span class="tap" data-act="jump" data-v="${x.m ?? ''}"><b>${esc(x.title)}</b> ${esc(x.artist)} <span>#${x.m ?? '-'}</span></span>${play(x)}</div>`).join('')}`;
    return h;
}
// ───── 📜 한 구절 앱 ─────
export function quoteView(r) {
    const { S } = r, q = S.quote;
    let h = q
        ? `<div class="ml-qcard"><b>${esc(q.text)}</b>${q.mean ? `<p>${esc(q.mean)}</p>` : ''}<small>— ${esc(q.src || '출처 모름')} <u class="ml-ai">AI가 고름</u></small>${q.why ? `<p class="ml-sub">💡 ${esc(q.why)}</p>` : ''}</div>`
        : '<div class="ml-empty"><p>아직 고른 구절이 없어요. 장면 분위기가 바뀌면 AI가 골라요.</p></div>';
    h += `<div class="ml-acts">${btn('🔄 다른 구절 <small>(AI 1회)</small>', 'quote-new', '', 'sm')}</div>`;
    h += '<div class="ml-hint">속담 · 영화 · 드라마 명대사 · 책 · 시의 한 줄 · 유명인의 말 · 사자성어에서 골라요 (노래 가사는 빼요). 출처는 AI 기억이라 틀릴 수 있어요. 영향력 1부터 구절이 바뀐 턴에 본편에 한 번 들어가요.</div>';
    const log = (S.quoteLog ?? []).slice(0, -1).reverse().slice(0, 10);
    if (log.length) h += `<h4 class="ml-h4">지난 구절 <span>누르면 그 답으로</span></h4>${log.map(x => `<div class="ml-rl tap" data-act="jump" data-v="${x.m ?? ''}"><i>📜</i>${esc(x.text)} <span>— ${esc(x.src)} · #${x.m ?? '-'}</span></div>`).join('')}`;
    return h;
}

// ───── 버튼 (AI 1회) ─────
// 🎵 장면에 맞는 곡: 나라 · 장르는 장면(시대 · 무대 · 분위기)에 맞게 — 취향을 안 정했으면 케이팝으로 쏠리지 않게
const songSys = (en) => `Pick ONE REAL existing song that fits the roleplay scene. Output JSON only: {"title":"","artist":"","mood":"${en ? 'one word' : '한 단어'}","why":"${en ? 'one line on why it fits' : '왜 어울리는지 한 줄 (한국어)'}"}. `
    + 'Use a song that actually exists. Choose the country, language, genre and era that fit the scene\'s setting and mood (film score, classical, jazz, folk, rock, pop, J-pop, K-pop … anything) — '
    + 'do NOT default to K-pop or Korean songs unless the scene or the listener taste calls for it. Respect the listener taste if given. Do not repeat the recent songs.';
const recentSongs = (S) => [...(S.bgmLog ?? [])].reverse().slice(0, 10).map((x) => `${x.title} - ${x.artist ?? ''}`);
const QUOTE_SYS = 'Pick ONE short line that fits the roleplay scene: a proverb from any country, a famous movie/drama line, a line from a book or poem, a famous person\'s saying, or a Korean 사자성어. '
    + 'NEVER song lyrics. One or two sentences. Output JSON only: {"text":"원문","src":"출처(작품 · 사람 · 나라)","mean":"한국어 뜻 (원문이 외국어일 때만)","why":"왜 어울리는지 한 줄 (한국어)"}.';
export async function musicAct(act, v, r, hand) {
    const meta = getMeta();
    switch (act) {
        case 'song-new': {
            toast('어울리는 곡을 찾는 중…');
            try {
                const x = parseJSON(await askLight(songSys((await import('../rules/lang.js')).isEN()), `Taste: ${tasteOf() || '-'}\nAvoid these recent ones: ${recentSongs(r.S).join(' / ') || '-'}\nScene:\n${sceneText()}`));
                if (!x?.title) throw new Error('빈 답');
                hand(`bgm: ${x.title} - ${x.artist ?? ''} | ${x.mood ?? ''} | ${x.why ?? ''}`, '🔄 다른 곡');
            } catch (e) { toast(`곡을 못 받았어요 · ${e.message}`, 'bad'); }
            return true;
        }
        case 'quote-new': {
            toast('어울리는 구절을 찾는 중…');
            try {
                const j = parseJSON(await askLight(QUOTE_SYS, `Avoid these recent ones: ${recentQuotes(r.S).join(' / ') || '-'}\nScene:\n${sceneText()}`));
                if (!j?.text) throw new Error('빈 답');
                hand(`quote: ${j.text} | ${j.src ?? ''} | ${j.mean ?? ''} | ${j.why ?? ''}`, '🔄 다른 구절');
            } catch (e) { toast(`구절을 못 받았어요 · ${e.message}`, 'bad'); }
            return true;
        }
        case 'musicapp': settings().musicApp = v; saveSettings(); return 'refresh';
        case 'musicpop': settings().musicPop = v; saveSettings(); return 'refresh';
        case 'musicplay': settings().musicPlay = v === 'tab' ? 'tab' : 'phone'; saveSettings(); return 'refresh';
        case 'ytkey': {
            const fv = await form('🔑 유튜브 API 키', [{ k: 'key', label: 'YouTube Data API v3 키 (비우면 새 탭으로 열어요)', v: settings().ytKey ?? '', ph: 'AIza…' }],
                { extra: '<div class="ml-hint">Google Cloud 콘솔에서 「YouTube Data API v3」를 켜고 「API 키」를 만들어 붙여 넣어요. 무료 한도로 하루 100곡쯤 찾을 수 있어요. 키는 이 브라우저의 실리태번 설정에만 저장돼요.</div>' });
            if (!fv) return true;
            settings().ytKey = fv.key.trim().slice(0, 100); saveSettings();
            return 'refresh';
        }
        case 'taste-edit': {
            const fv = await form('🎼 음악 취향', [
                { k: 'chat', label: '이 채팅 (비우면 기본값)', v: meta.musicTaste ?? '', ph: '예: 시티팝 · 재즈 · 일본 애니 OST' },
                { k: 'all', label: '기본값 (모든 채팅)', v: settings().musicTaste ?? '' },
            ]);
            if (!fv) return true;
            meta.musicTaste = fv.chat.trim().slice(0, 60); settings().musicTaste = fv.all.trim().slice(0, 60); saveMeta(); saveSettings();
            return 'refresh';
        }
    }
    return false;
}
