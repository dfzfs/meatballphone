// 📅 달력 더하기 화면: 위쪽 탭(📅 달력 · 📌 D-day · ✅ 할 일) · 칸 표시 · 날짜 메모 · 🩸 생리 주기 · 👀 설정 줄 · 홈 위젯 한 줄
//   전부 채팅 메타 meta.cal에 저장 (AI 호출 0회)
import { app, getMeta, saveMeta } from '../base/st.js';
import { esc, dateOf, dateText, DAY } from '../base/util.js';
import { btn, row, card, form, toast } from './kit.js';
import { fold } from '../rules/engine.js';
import { calOf, dayNow, parseDay, ddayLabel, cycleInfo, cycleDays, seenBy, mdOf } from '../rules/calplus.js';

let tab = 'cal';
const TABS = [['cal', '📅 달력'], ['dday', '📌 D-day'], ['todo', '✅ 할 일']];
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ymd = (st, day) => { const d = dateOf(st, day * DAY); return `${d.y}-${d.m}-${d.d}`; };
const dayTxt = (r, day) => dateText(r.book.world.start, day * DAY, false);
const done = () => { saveMeta(); app.refresh?.(); };

// 위쪽 탭
export const calBar = () => `<div class="ml-cptabs">${TABS.map(([v, l]) => `<button class="${tab === v ? 'on' : ''}" data-act="cp-tab" data-v="${v}">${l}</button>`).join('')}</div>`;
// 📌 · ✅ 탭이면 그 화면 (📅 달력 탭이면 '')
export function calTabView(r) {
    if (tab === 'dday') return calBar() + ddayView(r);
    if (tab === 'todo') return calBar() + todoView(r);
    return '';
}

// 달력 칸: 메모 표시 · 날짜 있는 할 일 점 · 🩸 연한 색
let cyMemo = { key: '', map: null };
export function calCell(r, day) {
    const cal = calOf(), today = dayNow(r.S);
    const key = `${today}|${JSON.stringify(cal.cycle)}`; if (cyMemo.key !== key) cyMemo = { key, map: cycleDays(cal, today) };
    const cy = cyMemo.map.get(day), memo = String(cal.notes[day]?.text ?? '').trim(), todo = cal.todo.some(t => t.day === day && !t.done);
    return { cls: cy ? ` ${cy}` : '', mark: `${memo ? '<u class="ml-cpm" title="메모"></u>' : ''}${todo ? '<s class="ml-cpt" title="할 일"></s>' : ''}` };
}

// 날짜를 눌렀을 때: 그날 할 일 · 메모 쓰기 · 보여 주기
export function calDayExtra(r, day) {
    const cal = calOf(), n = cal.notes[day] ?? {}, who = n.text ? seenBy(r, day) : '';
    const todos = cal.todo.filter(t => t.day === day);
    return `<div class="ml-cpday">${todos.map(todoLine).join('')}`
        + `<textarea class="ml-in ml-cpn" id="ml-cpn-${day}" rows="3" placeholder="이 날 메모 (여러 줄도 돼요)">${esc(n.text ?? '')}</textarea>`
        + `<div class="ml-acts">${btn('💾 메모 저장', 'cp-note-save', day, 'xs')}`
        + `${n.text && cal.peek ? btn(n.show ? '👀 보여 주는 중' : '🙈 안 보여 줌', 'cp-note-show', day, `xs${n.show ? ' on' : ''}`) : ''}`
        + `${n.text ? btn('🗑 메모 지우기', 'cp-note-del', day, 'xs') : ''}${btn('＋ 할 일', 'cp-todo-add', day, 'xs')}${btn('📌 D-day', 'cp-dd-add', day, 'xs')}</div>`
        + `${who ? `<div class="ml-hint">👀 ${esc(who)}이(가) 이 메모를 봤어요</div>` : ''}</div>`;
}

// 📅 달력 탭 아래 설정 줄 · 🩸 생리 주기 카드
export function calSettings(r) {
    const cal = calOf(), c = cal.cycle, today = dayNow(r.S), st = r.book.world.start;
    let h = `<div class="ml-cpset"><span>설정</span>${btn(`🩸 생리 주기 ${c.on ? '켬' : '끔'}`, 'cp-cy', 'on', `xs${c.on ? ' on' : ''}`)}`
        + `${btn(`👀 애인이 메모 보기 ${cal.peek ? '켬' : '끔'}`, 'cp-peek', '', `xs${cal.peek ? ' on' : ''}`)}</div>`;
    if (cal.peek) h += '<div class="ml-hint">메모에서 「보여 주기」를 켜면, 애정이 가장 높은 ⭐ 인물이 가끔(8번째 답마다) 그 메모 얘기를 꺼낼 수 있어요.</div>';
    if (!c.on) return h;
    const ci = cycleInfo(cal, today);
    const now = ci.last == null ? '아직 기록이 없어요. 시작한 날을 기록해 주세요.'
        : ci.dayN ? `지금 <b>${ci.dayN}일째</b>예요.`
        : ci.late ? `예상일(${esc(mdOf(st, ci.next))})이 <b>${ci.late}일</b> 지났어요.`
        : `다음 예상일은 <b>${esc(dayTxt(r, ci.next))}</b> (${ddayLabel(ci.next, today)})예요.`;
    h += `<div class="ml-rc ml-cpcy"><div class="ml-rc-h"><b>🩸 생리 주기</b><span class="ml-sp"></span><small>주기 ${c.len}일 · 기간 ${c.dur}일</small></div>`
        + `<p class="ml-cpcy-now">${now}</p>`
        + `<div class="ml-acts">${btn('🩸 오늘 시작', 'cp-cy', 'start', 'xs')}${btn('📅 날짜로 기록', 'cp-cy', 'add', 'xs')}${btn('⚙ 주기 · 기간', 'cp-cy', 'edit', 'xs')}`
        + `${btn(`본편에 알리기 ${c.tell ? '켬' : '끔'}`, 'cp-cy', 'tell', `xs${c.tell ? ' on' : ''}`)}${c.starts.length ? btn('↶ 마지막 기록 지우기', 'cp-cy', 'del', 'xs') : ''}</div>`
        + `<div class="ml-hint">달력에 연한 색으로만 보여요. ${c.tell ? '기간 중일 때만 본편에 한 줄 알려요 (날짜 · 숫자는 안 보내요).' : '본편에는 아무것도 안 가요.'}</div></div>`;
    return h;
}

// 📌 D-day 탭
function ddayView(r) {
    const cal = calOf(), today = dayNow(r.S);
    const L = [...cal.dday].sort((a, b) => ((a.day < today) - (b.day < today)) || (a.day >= today ? a.day - b.day : b.day - a.day));
    const rows = L.map(d => row({ icon: d.pin ? '🏠' : '📌', title: esc(d.name), sub: esc(dayTxt(r, d.day)),
        value: `<b class="ml-cpdd${d.day === today ? ' now' : ''}">${ddayLabel(d.day, today)}</b>${btn(d.pin ? '홈에서 내리기' : '홈에 걸기', 'cp-dd-pin', d.id, `xs${d.pin ? ' on' : ''}`)}${btn('✕', 'cp-dd-del', d.id, 'xs')}` })).join('');
    return `${card('D-day', rows || row({ title: '아직 없어요', sub: '「우리 100일」 「시험」처럼 이름과 날짜로 만들어요', faint: true }), `${L.length}개`)}`
        + `<div class="ml-acts">${btn('＋ 새 D-day', 'cp-dd-add', '')}</div><div class="ml-hint">「홈에 걸기」를 고른 하나가 홈 달력 위젯 맨 위에 떠요. 당일과 하루 전엔 본편에도 한 줄 알려요(달력 영향력 2부터).</div>`;
}
// ✅ 할 일 탭
const todoLine = (t) => `<div class="ml-cptodo${t.done ? ' done' : ''}"><button class="ml-cpchk" data-act="cp-todo" data-v="${esc(t.id)}" aria-label="체크">${t.done ? '✓' : ''}</button>`
    + `<span>${esc(t.text)}</span>${t.day != null ? `<small data-day="${t.day}"></small>` : ''}<button class="ml-mini" data-act="cp-todo-del" data-v="${esc(t.id)}" title="지우기">✕</button></div>`;
function todoView(r) {
    const cal = calOf(), open = cal.todo.filter(t => !t.done), shut = cal.todo.filter(t => t.done);
    const fill = (h) => h.replace(/<small data-day="(-?\d+)"><\/small>/g, (_, d) => `<small>${esc(mdOf(r.book.world.start, Number(d)))}</small>`);
    return `<section class="ml-sec"><h4>할 일<span>${open.length}개 남음</span></h4><div class="ml-card ml-cptodos">${fill(open.map(todoLine).join('')) || '<div class="ml-rl dim"><i>·</i>할 일이 없어요</div>'}</div></section>`
        + `${shut.length ? `<section class="ml-sec"><h4>끝낸 일<span>${shut.length}개</span></h4><div class="ml-card ml-cptodos">${fill(shut.map(todoLine).join(''))}</div></section>` : ''}`
        + `<div class="ml-acts">${btn('＋ 할 일', 'cp-todo-add', '')}${shut.length ? btn('끝낸 일 비우기', 'cp-todo-clear', '') : ''}</div><div class="ml-hint">날짜를 넣으면 그날 칸에 점이 찍혀요. 본편에는 안 가요.</div>`;
}

// 🏠 홈 달력 위젯 맨 위 한 줄
export function calPin(r) {
    const d = calOf()?.dday.find(x => x.pin); if (!d) return '';
    return `<div class="ml-rl ml-cppin"><i>📌</i>${esc(d.name)} <span>${ddayLabel(d.day, dayNow(r.S))}</span></div>`;
}

// 누르기 (cp-…)
export async function calAct(act, v) {
    const meta = getMeta(), r = fold(); if (!meta || !r) return;
    const cal = calOf(meta), st = r.book.world.start, today = dayNow(r.S);
    const askDay = (s) => { const d = parseDay(st, s, today); if (d == null) toast('날짜를 못 읽었어요 · 예: 12/25 · 2026-12-25 · 3일 뒤', 'bad'); return d; };
    switch (act) {
        case 'cp-tab': tab = TABS.some(([k]) => k === v) ? v : 'cal'; app.refresh?.(); return;
        case 'cp-dd-add': {
            const fv = await form('📌 새 D-day', [{ k: 'name', label: '이름', ph: '우리 100일', chips: ['우리 100일', '시험', '생일', '여행'] },
                { k: 'date', label: '날짜', v: v !== '' && v != null ? ymd(st, Number(v)) : '', ph: '12/25 · 2026-12-25 · 100일 뒤', chips: ['오늘', '내일', '100일 뒤'] }]);
            if (!fv?.name.trim()) return;
            const day = askDay(fv.date); if (day == null) return;
            cal.dday.push({ id: newId(), name: fv.name.trim().slice(0, 40), day, pin: !cal.dday.length });
            return done();
        }
        case 'cp-dd-pin': for (const d of cal.dday) d.pin = d.id === v ? !d.pin : false; return done();
        case 'cp-dd-del': cal.dday = cal.dday.filter(d => d.id !== v); return done();
        case 'cp-todo-add': {
            const fv = await form('✅ 할 일', [{ k: 'text', label: '할 일', ph: '선물 사기' }, { k: 'date', label: '날짜 (없어도 돼요)', v: v !== '' && v != null ? ymd(st, Number(v)) : '', ph: '12/25' }]);
            if (!fv?.text.trim()) return;
            let day = null; if (fv.date.trim()) { day = askDay(fv.date); if (day == null) return; }
            cal.todo.push({ id: newId(), text: fv.text.trim().slice(0, 120), day, done: false });
            return done();
        }
        case 'cp-todo': { const t = cal.todo.find(x => x.id === v); if (t) t.done = !t.done; return done(); }
        case 'cp-todo-del': cal.todo = cal.todo.filter(x => x.id !== v); return done();
        case 'cp-todo-clear': cal.todo = cal.todo.filter(x => !x.done); return done();
        case 'cp-note-save': {
            const text = String(document.getElementById(`ml-cpn-${v}`)?.value ?? '').replace(/\s+$/, '').slice(0, 1000);
            if (!text.trim()) delete cal.notes[v]; else cal.notes[v] = { ...(cal.notes[v] ?? {}), text, at: Date.now() };
            toast(text.trim() ? '메모를 저장했어요' : '메모를 지웠어요', 'good');
            return done();
        }
        case 'cp-note-show': { const n = cal.notes[v]; if (n) n.show = !n.show; return done(); }
        case 'cp-note-del': delete cal.notes[v]; return done();
        case 'cp-peek': cal.peek = !cal.peek; return done();
        case 'cp-cy': {
            const c = cal.cycle;
            if (v === 'on') c.on = !c.on;
            else if (v === 'tell') c.tell = !c.tell;
            else if (v === 'start') { if (!c.starts.includes(today)) c.starts.push(today); }
            else if (v === 'del') c.starts.sort((a, b) => a - b).pop();
            else if (v === 'add') {
                const fv = await form('🩸 시작한 날', [{ k: 'date', label: '날짜', ph: '12/3 · 3일 전', chips: ['오늘', '어제'] }]);
                if (!fv?.date.trim()) return;
                const d = askDay(fv.date); if (d == null) return;
                if (!c.starts.includes(d)) c.starts.push(d);
            } else if (v === 'edit') {
                const fv = await form('🩸 주기 · 기간', [{ k: 'len', label: '주기 (일)', type: 'number', v: c.len }, { k: 'dur', label: '기간 (일)', type: 'number', v: c.dur }]);
                if (!fv) return;
                c.len = Math.min(60, Math.max(15, Math.round(Number(fv.len)) || 28)); c.dur = Math.min(14, Math.max(1, Math.round(Number(fv.dur)) || 5));
            }
            c.starts.sort((a, b) => a - b);
            return done();
        }
    }
}
