// 🧆 바로 시작 (v2.9) — 상태창이 없는 채팅을 열면 묻지 않고 「틀」을 바로 만든다 (AI 0회 · 추천 6칸 · 기본 틀)
//   그다음은 쓰는 사람이 고른다: 눌러 보다가 관리 › 쓸 기능에서 칸을 고르고 「고른 대로 채우기」를 누르면 그때 AI가 이 이야기에 맞게 채운다
//   · AI를 부르는 것은 「세계관 맞추기」(1회)와 「고른 대로 채우기」(묶음마다 1회) 둘뿐 — 둘 다 단추를 눌렀을 때만
//   · 어디까지 했는지는 meta.auto = { tpl: [아직 틀뿐인 칸], world: 세계관을 AI로 맞췄나 } (다 채우면 열쇠를 지운다)
//   · 끄기: 설정 autoStart = false (그러면 예전처럼 「만들기」를 눌러야 생긴다) · 이 채팅에서 상태창을 끈 경우(meta.off) · 카드에 상태창이 붙어 있는 경우엔 만들지 않는다
import { app, ctx, settings, getMeta, saveMeta, modOn, MOD, MOD_IDS, REC_MODS, normalize, normPlay, esc, TITLE, LOG, ssWarn, ssErr } from './core.js';
import { setBase, commit, gatherSources, chatCharacters } from './engine.js';
import { skeleton, skeletonCore } from './skeleton.js';
import { cardPack } from './safe.js';
import { busyBtn, askConfirm } from './kit.js';

let making = false;
export async function autoStart() {
    const st = settings();
    if (!st.enabled || st.autoStart === false || making) return false;
    const c = ctx();
    if ((c.characterId === undefined || c.characterId === null) && !c.groupId) return false; // 채팅이 안 열려 있음
    if (!c.getCurrentChatId?.()) return false;
    const meta = getMeta();
    if (meta?.base || meta?.off || meta?.cardAsked) return false;
    try { if (st.cardOffer && cardPack()) return false; } catch (e) { ssWarn(LOG, 'auto card', e); } // 카드에 붙은 상태창이 먼저 (그쪽에서 물어본다)
    making = true;
    try {
        const mods = Object.fromEntries(MOD_IDS.map(id => [id, REC_MODS.includes(id)]));
        const data = {};
        for (const id of REC_MODS) { try { const d = skeleton(id, '', { pmode: 'minimal' }); if (d) data[id] = normalize(id, d); } catch (e) { ssWarn(LOG, 'auto skeleton', id, e); } }
        let chars = []; try { chars = chatCharacters(); } catch { /* 없으면 1:1로 */ }
        await setBase({ core: skeletonCore('', {}), data }, mods, st.difficulty, normPlay({ mode: chars.length > 1 ? 'multi' : 'rp' }));
        const m = getMeta(true); m.auto = { tpl: Object.keys(data), world: false }; await saveMeta();
        app.refreshNow?.(); app.rerenderPanels?.(true);
        toastr.info('상태창 <b>틀</b>을 바로 만들었어요 (AI 0회). 이것저것 눌러 보고, <b>관리 › 쓸 기능</b>에서 쓸 칸을 고른 뒤 「고른 대로 채우기」를 누르면 이 이야기에 맞게 채워 드려요.<br><small>여기를 누르면 바로 가요</small>', TITLE, { timeOut: 12000, extendedTimeOut: 6000, escapeHtml: false, onclick: () => goMods() });
        return true;
    } catch (e) { ssErr(LOG, 'autostart', e); return false; } finally { making = false; }
}
// 관리 › 쓸 기능으로
export function goMods() { settings().mgTab = 'mods'; try { app.openSheet?.('manage'); } catch (e) { ssWarn(LOG, 'go mods', e); } }
export const autoOf = (meta = getMeta()) => (meta?.auto && typeof meta.auto === 'object' ? meta.auto : null);
// 아직 AI로 안 채운 칸 (켜 둔 것만): 틀뿐인 칸 + 비어 있는 칸 (추천 음악은 장면이 생기면 본편 AI가 고르므로 뺀다)
export function fillTodo(s = app.current?.state, meta = getMeta()) {
    const a = autoOf(meta); if (!s) return [];
    return MOD_IDS.filter(id => id !== 'music' && modOn(id, meta) && (!s.data[id] || a?.tpl?.includes(id)) && (!MOD[id].needs || modOn(MOD[id].needs, meta)));
}
// 묶음으로 나눈다 (만들기 창과 같은 묶음 — 묶음 하나에 AI 1회)
export function fillGroups(ids, GEN_GROUPS) {
    if (settings().genBatch === false) return ids.map(id => [id]);
    const gs = GEN_GROUPS.map(g => g.filter(id => ids.includes(id))).filter(g => g.length), left = ids.filter(id => !GEN_GROUPS.flat().includes(id));
    return left.length ? [...gs, left] : gs;
}
// 🧆 세계관 맞추기 (AI 1회): 카드 · 로어북 · 지금까지의 이야기를 읽고 미트볼용 세계 핵심만 다시 쓴다
export async function fillWorld(btn) {
    const s = app.current?.state; if (!s) return false;
    busyBtn(btn, true, '세계관 읽는 중…');
    try {
        const { genModule } = await import('./ai.js');
        const sources = await gatherSources({});
        const core = await genModule('core', { sources, feature: 'wizard', play: getMeta()?.play, profileMode: 'minimal' });
        await commit('core', core, '🧆 세계관 맞추기', { keep: true });
        const m = getMeta(true); if (m.auto) { m.auto.world = true; await saveMeta(); }
        return true;
    } catch (e) { ssErr(LOG, 'fill world', e); toastr.error(`세계관을 맞추지 못했어요: ${esc(e.message)}`, TITLE); return false; } finally { busyBtn(btn, false); }
}
// 🧆 고른 대로 채우기: 켜 둔 칸 중 틀뿐이거나 비어 있는 칸을 AI로 채운다 (세계관을 아직 안 맞췄으면 그것부터)
export async function fillChosen(btn) {
    const s0 = app.current?.state; if (!s0) return;
    const meta0 = getMeta(), todo = fillTodo(s0, meta0), a = autoOf(meta0);
    const needWorld = !!a && !a.world;
    if (!todo.length && !needWorld) { toastr.info('채울 칸이 없어요 — 켜 둔 칸은 모두 채워져 있어요.', TITLE); return; }
    const { genModule, genGroup, GEN_GROUPS } = await import('./ai.js');
    const groups = fillGroups(todo, GEN_GROUPS), calls = groups.length + (needWorld ? 1 : 0);
    if (!(await askConfirm(`켜 둔 칸을 이 이야기에 맞게 채울까요?<br><b>${needWorld ? '세계관 + ' : ''}${todo.map(id => esc(MOD[id].name)).join(' · ') || '세계관만'}</b><br><small>AI ${calls}회 · 틀에 적혀 있던 내용은 새로 채운 것으로 바뀌어요 (직접 고친 칸은 먼저 꺼 두면 안 건드려요).</small>`))) return;
    if (needWorld && !(await fillWorld(btn))) return;
    let k = 0, fail = 0; const total = groups.length;
    busyBtn(btn, true, `0/${total}`);
    try {
        const sources = await gatherSources({});
        for (const grp of groups) {
            const s = app.current.state, opt = { sources, core: s.core, profileMode: s.data.profile?.mode ?? 'minimal', contactMode: s.data.contact?.mode, feature: 'wizard', play: getMeta()?.play };
            let got = {};
            try { got = grp.length > 1 ? await genGroup(grp, opt) : { [grp[0]]: await genModule(grp[0], opt) }; } catch (e) { ssWarn(LOG, 'fill group', grp, e); }
            for (const id of grp) {
                let d = got?.[id];
                if (!d) { try { d = await genModule(id, opt); } catch (e) { fail++; toastr.error(`${esc(MOD[id].name)} 실패: ${esc(e.message)}`, TITLE); continue; } }
                try { await commit(id, d, `🧆 ${MOD[id].name} 채우기`, { keep: true }); const m = getMeta(true); if (m.auto?.tpl) { m.auto.tpl = m.auto.tpl.filter(x => x !== id); await saveMeta(); } }
                catch (e) { fail++; ssErr(LOG, 'fill commit', id, e); }
            }
            busyBtn(btn, false); busyBtn(btn, true, `${++k}/${total}`);
        }
    } finally { busyBtn(btn, false); }
    const m = getMeta(true); if (m.auto && m.auto.world && !(m.auto.tpl ?? []).length) { delete m.auto; await saveMeta(); }
    app.refreshNow?.(); app.rerenderPanels?.(true);
    toastr[fail ? 'warning' : 'success'](fail ? `${todo.length - fail}칸을 채웠어요 · ${fail}칸은 실패 — 다시 누르면 남은 칸만 채워요.` : '고른 대로 채웠어요!', TITLE);
}
app.autoStart = autoStart;
