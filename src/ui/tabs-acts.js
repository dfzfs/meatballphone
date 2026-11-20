// 전체화면 탭 — 누르기 (손 고침 · 편집 창 · 설정집 고치기 · 사진 · 카드 이름) — 처음 누를 때 받음
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, msgData, syncSwipe, msgKey, userName, bumpMeta, saveChatSoon } from '../base/st.js';
import { esc, fmt, fxText, signed, short, dateText, dateOf, DAY, periodName, num, norm, tokens, dayIndexOf, monthDays, monthName, weekName, faceOf, clockOf, inPeriod } from '../base/util.js';
import { row, card, chip, seg, bar, empty, btn, sheet, toast, putInput, form } from './kit.js';
import { fold, derived, needStage, relStage, nextStage, stagesOf, pairKey, diceParts, whereNow } from '../rules/engine.js';
import { luckOf } from '../rules/luck.js';
import { vis, handLines } from './tools.js';
import { layout, lineEdges, lineNodes, route, floorsOf } from './metro.js';
import { personOf, placeOf, bookTokens, personTokens, normBook, PLACE_KINDS, LIMIT, isStar } from '../rules/book.js';
import { musicView, quoteView, songLine, quoteLine, musicAct } from './music.js';
import { LEVELS, GAUGES, PRESETS, level, gaugeCfg, levelCost } from '../rules/inject.js';
import { fillBook } from '../rules/ai.js';
import { isEN } from '../rules/lang.js';
import { newsView, newsAct } from './newskinds.js';
import { calBar, calTabView, calCell, calDayExtra, calSettings, calAct } from './calplus.js';
import { ddaysOn } from '../rules/calplus.js';
import { isSecret, secretSub, sneakCard, sneakUndo } from './sneak.js';
import { sneakOnDay } from '../rules/sneak.js';
import { personThread, placeThread, dayThread, lived, ledgerCard, statusCard, diceLog, albumView, statsView, daysView, threadAct } from './threadui.js';
import { dayOfI, thread, itemKind, itemLife, needRhythm, relWeather, lastSeen, placeMood, todayRoute, weekTop, dayEmoji } from '../rules/thread.js';
import { d20Svg, lastAI, money, fxOf, itemBtns, itemMemo, changeRow, turnCard, STAGE_COLOR, recoverOf, needCard, gaugeCard } from './tabs-shared.js';
import { now, DCS, diceSel, getDice, setDice, dice, bag, BAG_G, bagGroups, goodRow, rel, routeView, pairView, lastRel, meter, relCard, personSheet, mapSel, setMapSel, map, placeCard, upcoming, calView, setCal, SEASON, eventsOnDay, cal, news, REC_F, recF, setRecFilter, recView, setRecView, rec, graph, mind, custom, book, GAUGE_DO, gauge, gaugeTable, slider, music, RENDER, calDay, recMore, quote, getMapSel, moreRec } from './tabs-views.js';
export async function onAct(act, v, el) {
    const meta = getMeta(), r = fold();
    if (String(act).startsWith('cp-')) return calAct(act, v, el); // 📅 달력 더하기
    if (String(act).startsWith('th-')) { threadAct(act, v, r); return; } // 🧵 실타래 (D-day로 · 물건 이력)
    switch (act) {
        case 'nk-tab': case 'nk-on':
            if (newsAct(act, v)) app.refresh?.();
            return;
        case 'sneak-undo':
            return sneakUndo(v, r, hand);
        case 'say':
            putInput(v);
            app.closeSheet?.();
            return;
        case 'song-new': case 'quote-new': case 'musicapp': case 'musicpop': case 'musicplay': case 'ytkey': case 'taste-edit': {
            const done = await musicAct(act, v, r, hand); if (done === 'refresh') app.refresh?.(); return;
        }
        case 'star': {
            const meta = getMeta(), r0 = fold(), now = isStar(meta, r0.book, v);
            (meta.stars ??= {})[v] = !now; saveMeta();
            // ⭐로 올린 인물이 설정집에 규칙이 없으면 한 번 채움 (AI 1회)
            if (!now && !personOf(r0.book, v)) { toast(`⭐ ${v} — 규칙을 채우는 중…`); app.fillPerson?.(v); }
            app.refresh?.();
            return;
        }
        case 'person':
            personSheet(r, v);
            return;
        case 'mapsel':
            setMapSel(v);
            app.refresh?.();
            return;
        case 'map-open': // 📰 소식 · 다른 앱에서 장소 이름을 누르면 지도에서 그 장소
            setMapSel(v); app.openSheet?.('map');
            return;
        case 'map-pins': {
            const ppl = meta.book.people.map((p) => p.name),
                on = new Set(meta.mapPins ?? ppl);
            sheet(
                '📍 핀으로 띄울 인물',
                `<div class="ml-card">${ppl.map((n) => `<label class="ml-row"><span class="ml-tx"><b>${personOf(meta.book, n)?.face} ${esc(n)}</b></span><input type="checkbox" class="ml-sw" data-pin="${esc(n)}" ${on.has(n) ? 'checked' : ''}></label>`).join('')}</div>`,
            );
            document.querySelector('.ml-bs').addEventListener('change', (e2) => {
                const n = e2.target.dataset.pin;
                if (!n) return;
                e2.target.checked ? on.add(n) : on.delete(n);
                meta.mapPins = on.size === ppl.length ? null : [...on];
                saveMeta();
                app.refresh?.();
            });
            return;
        }
        case 'map-hide':
            meta.mapHide = [...new Set([...(meta.mapHide ?? []), v])];
            if (getMapSel() === v) setMapSel(null);
            saveMeta();
            app.refresh?.();
            return;
        case 'map-unhide':
            meta.mapHide = [];
            saveMeta();
            app.refresh?.();
            return;
        case 'photo': {
            const url = await pickPhoto();
            if (url == null) return;
            const pl = placeOf(meta.book, v);
            if (!pl) return;
            pl.photo = url;
            saveMeta();
            app.refresh?.(true);
            toast(url ? '사진을 붙였어요' : '사진을 뺐어요');
            return;
        }
        case 'packget': {
            const m = await import('./mascot.js');
            el?.classList.add('loading');
            if (el) el.textContent = '';
            const ok = await m.packDownload((i, n) => {
                if (el) el.style.setProperty('--pct', `${Math.round((i / n) * 360)}deg`);
            });
            settings().conPack = ok > 0;
            saveSettings();
            toast(ok ? `🐱 미트볼콘 ${ok}개 받았어요` : '받지 못했어요. 인터넷 연결을 확인해 주세요', ok ? 'good' : 'bad');
            app.refresh?.();
            return;
        }
        case 'packoff':
            settings().conPack = false;
            if (String(settings().mascotPick).startsWith('pack:')) settings().mascotPick = 'idle';
            saveSettings();
            app.refresh?.();
            return;
        case 'catpick':
            settings().mascotPick = v;
            saveSettings();
            (await import('./mascot.js')).playMascotSound();
            app.refresh?.();
            return;
        case 'catsound':
            settings().mascotSound = v;
            saveSettings();
            (await import('./mascot.js')).playMascotSound();
            app.refresh?.();
            return;
        case 'musicapp':
            settings().musicApp = v;
            saveSettings();
            app.refresh?.();
            return;
        case 'install':
        case 'uninstall': {
            const a = (await import('./home.js')).appOf(v);
            if (!a?.mod) return;
            if (act === 'install') {
                el?.classList.add('loading');
                el && (el.textContent = '');
                await new Promise((res) => setTimeout(res, 700));
            }
            meta.mods[a.mod] = act === 'install';
            saveMeta();
            if (act === 'uninstall' && a.mod === 'music') (await import('./player.js')).closePlayer();
            app.refresh?.();
            toast(act === 'install' ? `${a.icon} ${a.name} 받았어요` : `${a.name} 지웠어요`);
            return;
        }
        case 'luckroll': {
            const d = 1 + Math.floor(Math.random() * 20);
            meta.luckRoll = { day: Math.floor(r.S.t / DAY), d, two: null };
            saveMeta();
            toast(`🎲 ${d}${d === 20 ? ' · 대길!' : d === 1 ? ' · 대흉…' : ''}`, d >= 11 ? 'good' : 'bad');
            app.refresh?.();
            return;
        }
        case 'g-table':
            return gaugeTable(v);
        case 'pair-edit': {
            const r = fold();
            if (!r) return;
            const names = Object.keys(r.S.rel),
                [A0 = '', B0 = ''] = v ? v.split('|') : [],
                pr = v ? r.S.pairs?.[v] : null;
            const fv = await form('🔗 인물끼리', [
                { k: 'a', label: '한 사람', type: 'pick', v: A0 || names[0], opts: names.map((n) => [n, n]) },
                { k: 'b', label: '다른 사람', type: 'pick', v: B0 || names[1], opts: names.map((n) => [n, n]) },
                { k: 'v', label: '사이 (-100 원수 ~ 100 단짝)', type: 'number', v: pr?.v ?? 0 },
                { k: 'label', label: '관계 이름', v: pr?.label ?? '', chips: ['라이벌', '소꿉친구', '앙숙', '짝사랑', '사제', '형제'] },
                { k: 'why', label: '이유', v: pr?.why ?? '' },
            ]);
            if (!fv || !fv.a || !fv.b || fv.a === fv.b) return;
            const now = r.S.pairs?.[pairKey(fv.a, fv.b)];
            const ops = [];
            const d = num(fv.v, 0) - num(now?.v, 0);
            if (d) ops.push(['pair', `${fv.a} | ${fv.b} | ${d > 0 ? '+' : ''}${d} | ${fv.why || '손으로 고침'}`]);
            if (fv.label && fv.label !== now?.label) ops.push(['pair', `${fv.a} | ${fv.b} | ${fv.label} | ${fv.why || ''}`]);
            for (const [k, val] of ops) hand(`${k}: ${val}`, '🔗 인물끼리 고침');
            return;
        }
        case 'c-nav':
            setCal('nav', Number(v), meta.book.world.start.cal?.months?.length || 12);
            app.refresh?.();
            return;
        case 'c-today':
            setCal('today');
            app.refresh?.();
            return;
        case 'c-day':
            setCal('day', v ? Number(v) : null);
            app.refresh?.();
            return;
        case 'c-time': {
            if (v === 'set') {
                const fv = await form('🕰 시각 맞추기', [
                    { k: 't', label: '시각', ph: '14:30 · 오후 2시', chips: ['07:00', '12:00', '18:00', '22:00'] },
                ]);
                if (!fv?.t.trim()) return;
                return hand(`time: ${fv.t.trim()}`, '직접 시간 맞춤');
            }
            if (v === '+1d') {
                // 다음 날 아침 8시까지 — 그 사이 밤잠(최대 8시간)은 자는 것으로
                const cur = r.S.t % DAY,
                    m = DAY - cur + 480,
                    sleep = Math.min(480, m),
                    awake = m - sleep;
                return handLines([...(awake > 0 ? [`pass: ${awake}분`] : []), `slept: ${sleep}분`], '다음 날 아침으로');
            }
            // ⏭ 다음 시간대가 시작하는 시각까지 (낮 11~17시에 눌러도 다음 날로 안 넘어감)
            if (v === 'next') { const cur = ((r.S.t % DAY) + DAY) % DAY, nx = [300, 420, 660, 1020, 1260, 1740].find(b => b > cur); return hand(`pass: ${nx - cur}분`, '직접 시간 넘김'); }
            return hand('time: +1h', '직접 시간 넘김');
        }
        case 'c-wx': {
            const fv = await form('🌦 날씨', [
                {
                    k: 'w',
                    label: '날씨',
                    type: 'pick',
                    v: r.S.weather,
                    opts: [...new Set([...meta.book.world.weather, '맑음', '흐림', '비', '눈', '안개'])].map((w) => [w, w]),
                },
            ]);
            if (!fv?.w || fv.w === r.S.weather) return;
            return hand(`weather: ${fv.w}`, '직접 바꿈');
        }
        case 'c-add': {
            const fv = await form(`📅 ${v} 일정`, [{ k: 't', label: '일정', ph: 'Leon과 저녁 식사', chips: ['약속', '시험', '마감', '생일 파티'] }]);
            if (!fv?.t.trim()) return;
            return hand(`promise: ${fv.t.trim()} | ${v}`, '일정 추가');
        }
        case 'rec-more':
            moreRec(); return app.refresh?.();
        case 'c-go':
            return hand(`date: ${v}`, '이 날로 이동');
        case 'look-set': {
            const [k, x] = v.split('|');
            settings().look[k] = x;
            saveSettings();
            app.applyLook?.();
            app.refresh?.();
            return;
        }
        case 'look-reset':
            settings().look = { ...(await import('../base/st.js')).DEFAULTS.look };
            saveSettings();
            app.applyLook?.();
            app.refresh?.();
            return;
        case 'dset': {
            const [k, x] = v.split(':');
            setDice(k, k === 'dc' ? Number(x) : x);
            app.refresh?.();
            return;
        }
        case 'rollattr':
            setDice('attr', v);
            app.openSheet?.('dice');
            return;
        case 'roll': {
            const mod = Number(v),
                d = 1 + Math.floor(Math.random() * 20),
                tot = d + mod;
            const res = d === 20 ? '대성공' : d === 1 ? '대실패' : tot >= diceSel.dc ? '성공' : '실패';
            const text = `(🎲 ${diceSel.attr} 판정: d20 ${d}${mod ? ` ${signed(mod)}` : ''} = ${tot} vs ${diceSel.dc} → ${res})`;
            document.querySelectorAll('.ml-d20').forEach((x) => x.classList.add('spin'));
            await new Promise((res) => setTimeout(res, 650));
            meta.recent.rolls = [{ text, res, d, tot, at: Date.now() }, ...(meta.recent.rolls ?? [])].slice(0, 5);
            saveMeta();
            toast(`${res}! ${d}${mod ? signed(mod) : ''} = ${tot}`, res.includes('성공') ? 'good' : 'bad');
            putInput(text);
            app.refresh?.();
            return;
        }
        case 'edit-val': {
            const [kind, key] = v.split('|');
            let cur = 0,
                label = key,
                line = '';
            if (kind === 'need') {
                const n = meta.book.me.needs.find((x) => x.key === key);
                cur = Math.round(r.S.needs[key]);
                label = `${n.icon} ${n.name}`;
                line = n.name;
            }
            if (kind === 'gauge') {
                const g = meta.book.me.gauges.find((x) => x.key === key);
                cur = r.S.gauges[key];
                label = g.name;
                line = g.name;
            }
            if (kind === 'aff' || kind === 'trust') {
                cur = r.S.rel[key]?.[kind];
                label = `${key} ${kind === 'aff' ? '애정' : '우정'}`;
            }
            const fv = await form(`✏️ ${esc(label)} 고치기`, [
                { k: 'n', label: '값', type: 'number', v: cur, chips: ['0', '50', '100'] },
                { k: 'why', label: '이유', ph: '직접 고침', chips: ['계산이 틀림', '이야기와 안 맞음', '되돌림'] },
            ]);
            if (!fv || fv.n === '') return;
            const d = num(fv.n) - num(cur);
            if (!d) return;
            hand(
                kind === 'aff' || kind === 'trust' ? `${kind}: ${key} ${d > 0 ? '+' : ''}${d}` : `${line}: ${d > 0 ? '+' : ''}${d}`,
                fv.why || '직접 고침',
            );
            return;
        }
        case 'gstep': {
            const [g, d] = v.split(':');
            hand(`${g}: ${Number(d) > 0 ? '+' : ''}${d}`, '직접');
            return;
        }
        case 'jump':
            app.jump?.(Number(v));
            return;
        case 'tab-book':
            app.openSheet?.('book');
            return;
        case 'undo': {
            const [i, j] = v.split(':').map(Number);
            const m = ctx().chat[i],
                sl = msgData(m, true);
            if (!sl.ops && j < 1000) sl.ops = (await import('../rules/tags.js')).readOps(m.mes);
            sl.undo = [...new Set([...(sl.undo ?? []), j])];
            sl.rev = (sl.rev ?? 0) + 1;
            bumpMeta();
            syncSwipe(m);
            saveChatSoon();
            app.refresh?.();
            toast('되돌렸어요');
            return;
        }
        case 'flagok': {
            const [i] = v.split(':').map(Number);
            const m = ctx().chat[i],
                sl = msgData(m, true);
            sl.flagOk = true;
            sl.rev = (sl.rev ?? 0) + 1;
            bumpMeta();
            saveChatSoon();
            app.refresh?.();
            return;
        }
        case 'mark': {
            const i = lastAI();
            if (i < 0) return;
            const fv = await form('⭐ 책갈피', [
                { k: 'name', label: '이름', v: '', ph: short(ctx().chat[i].mes, 20), chips: ['고백 직전', '첫 만남', '큰 싸움', '중요한 선택'] },
            ]);
            const name = fv?.name?.trim() || (fv ? short(ctx().chat[i].mes, 20) : '');
            if (!name) return;
            meta.marks = [
                ...(meta.marks ?? []).filter((m) => m.key !== msgKey(ctx().chat[i])),
                { key: msgKey(ctx().chat[i]), name: short(name, 30) },
            ];
            saveMeta();
            app.refresh?.();
            return;
        }
        case 'past': {
            const ais = (ctx().chat ?? [])
                .map((m, k) => [k, m])
                .filter(([, m]) => !m.is_user && !m.is_system)
                .slice(-12)
                .reverse();
            const fv = await form(
                '🕰 그때 상태 보기',
                [
                    {
                        k: 'i',
                        label: '어느 답의 시점?',
                        type: 'pick',
                        v: ais[0]?.[0],
                        opts: ais.map(([k, m]) => [k, `#${k} ${esc(short(m.mes, 14))}`]),
                    },
                ],
                { ok: '보기' },
            );
            if (!fv) return;
            const i = Number(fv.i);
            if (!(i >= 0)) return;
            app.openPast?.(i);
            return;
        }
        case 'cls-redo': app.reclassify?.(Number(v)); return; // 🔄 다시 고르기 (B)
        case 'npc-fill': { toast(`${v} 규칙을 채우는 중…`); const ok = await app.fillPerson?.(v); toast(ok ? `${v} 규칙을 채웠어요` : '못 채웠어요 · 설정집에서 직접 넣을 수 있어요', ok ? 'good' : 'bad'); return; }
        // 📘 첫 화면 → 설정집 만들기 → 🛍️ 쓸 앱 고르기 → 시작
        case 'mk-ai': return app.create?.(true);
        case 'mk-self': return app.create?.(false);
        case 'setup-start': {
            const box = el?.closest('#ml-full') ?? document; if (!meta) return;
            for (const cb of box.querySelectorAll('.ml-setup-cb')) meta.mods[cb.dataset.mod] = cb.checked;
            const then = meta.setupThen; delete meta.setup; delete meta.setupThen; saveMeta();
            toast(`앱 ${[...box.querySelectorAll('.ml-setup-cb')].filter(c => c.checked).length}개를 깔았어요`, 'good');
            app.refresh?.(true); app.openSheet?.(then === 'book' ? 'book' : 'home'); return;
        }
        case 'report': return (await import('../extra/report.js')).reportSheet();
        case 'doctor': {
            const d = await import('../extra/doctor.js');
            d.doctor(app, app.perfData?.());
            return;
        }
        case 'doc-unpause':
            meta.paused = false;
            saveMeta();
            el?.closest('.ml-bs')?.remove();
            app.refresh?.();
            return;
        case 'doc-open':
            el?.closest('.ml-bs')?.remove();
            app.openSheet?.(v);
            return;
        case 'mind-tone': {
            const fv = await form('🗣 속마음 말투', [
                {
                    k: 't',
                    label: '말투 (비우면 인물 성격대로)',
                    v: meta.mindTone ?? '',
                    chips: ['반말 · 툭툭', '존댓말 · 공손', '귀엽게 · 의성어 많이', '시니컬', '사투리', '오타쿠 말투'],
                },
            ]);
            if (!fv) return;
            meta.mindTone = fv.t.trim().slice(0, 40);
            saveMeta();
            app.refresh?.();
            return;
        }
        case 'mind-pop':
            meta.mindPop = meta.mindPop === 'off' ? 'on' : 'off';
            saveMeta();
            app.refresh?.();
            return;
        case 'mindwho': {
            const w = new Set(meta.mindWho ?? ['cast']);
            w.has(v) ? w.delete(v) : w.add(v);
            meta.mindWho = [...w];
            saveMeta();
            app.refresh?.();
            return;
        }
        case 'ctab-new': {
            const fv = await form('🧩 새 탭', [
                { k: 'name', label: '탭 이름', ph: '예: 마력 수련' },
                { k: 'icon', label: '아이콘', v: '🧩', chips: ['🧩', '🌀', '⚔️', '📚', '💼', '🔮'] },
                { k: 'f', label: '칸 (쉼표로)', v: '점수/100, 메모', hint: '숫자 칸은 이름 뒤에 /최대값' },
            ]);
            if (!fv?.name) return;
            const name = fv.name,
                f = fv.f;
            meta.custom = [
                ...(meta.custom ?? []),
                {
                    name: short(name, 12),
                    icon: fv.icon || '🧩',
                    fields: String(f ?? '')
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .map((x) => {
                            const [n, mx] = x.split('/');
                            return { name: short(n, 12), max: num(mx, 0), stages: [30, 70] };
                        }),
                },
            ];
            saveMeta();
            app.refresh?.();
            return;
        }
        case 'ctab-del':
            meta.custom.splice(Number(v), 1);
            saveMeta();
            app.refresh?.();
            return;
        case 'merge': {
            const fv = await form(
                `🔗 ${esc(v)} 합치기`,
                [
                    {
                        k: 'into',
                        label: '같은 사람',
                        type: 'pick',
                        opts: meta.book.people.filter((p) => p.name !== v).map((p) => [p.name, `${p.face} ${esc(p.name)}`]),
                    },
                ],
                { ok: '합치기' },
            );
            const into = fv?.into;
            if (!into || !personOf(meta.book, into)) return;
            const p = personOf(meta.book, into);
            p.aka = [...new Set([...p.aka, v])];
            meta.book.people = meta.book.people.filter((x) => x.name !== v);
            saveMeta();
            app.refresh?.(true);
            toast(`${v} → ${into}로 합쳤어요`);
            return;
        }
        case 'gone':
            hand(`gone: ${v} | ${r.S.rel[v]?.gone ? '돌아옴' : '직접 뺌'}`, '직접');
            return;
        case 'edit-fx': {
            const w = meta.book.world, old = num(w.fx?.rate);
            // 💱 환율이 통용되게: 값을 바꾸면 물가 · 가진 돈도 그 환율에 맞춰 줌 (원하면 숫자 그대로)
            //   전에 환율이 있었으면 현실 값이 그대로 남게(옛/새) · 처음이면 식사 한 끼 ≈ 9,000원이 되게
            const factorOf = (rate) => (!(rate > 0) ? 1 : old > 0 && old !== rate ? old / rate : w.meal * rate < 3000 || w.meal * rate > 30000 ? 9000 / (w.meal * rate) : 1); // 같은 환율로 다시 저장해도 어긋난 물가면 맞춤
            const fv = await form('💱 화폐 · 환율', [
                { k: 'cur', label: '이 세계의 돈 이름', v: w.currency, chips: ['원', '달러', '골드', '은화', '동전', '냥', '크레딧', '젬'] },
                { k: 'rate', label: '1 (이 세계 돈) = 몇 원?', type: 'number', v: w.fx?.rate || '', ph: '예: 1000', hint: `적어 두면 돈이 나오는 곳마다 「≈ 12만 원」이 같이 보이고 AI도 이 물가로 써요 · 지금 식사 한 끼 ${fmt(w.meal)} ${esc(w.currency)}` },
                { k: 'fit', label: '물가 · 가진 돈도 이 환율에 맞출까요? (빵이 30원처럼 어긋나지 않게)', type: 'pick', v: 'yes', opts: [['yes', '✅ 맞추기'], ['no', '숫자는 그대로']] },
            ]);
            if (!fv) return;
            const rate = Math.max(0, num(fv.rate)), f = fv.fit === 'yes' ? factorOf(rate) : 1, cur = String(fv.cur || w.currency).trim();
            const nice = (x) => { if (!(x > 0)) return 0; const p = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 1); return Math.max(1, Math.round(x / p) * p); };
            const scaled = Math.abs(f - 1) > 0.05;
            meta.book = normBook({
                ...meta.book,
                world: { ...w, currency: cur, fx: { rate, unit: '원' }, ...(scaled ? { meal: nice(w.meal * f), places: w.places.map(p => ({ ...p, goods: (p.goods ?? []).map(g => ({ ...g, price: nice(g.price * f) })) })) } : {}) },
            });
            saveMeta();
            if (scaled && r.S.cash > 0) hand(`cash: ${nice(r.S.cash * f)}`, `환율에 맞춤 (×${fmt(Math.round(f * 100) / 100)})`);
            app.refresh?.(true);
            toast(rate > 0 ? `1 ${cur} = ${fmt(rate)}원${scaled ? ` · 물가를 맞췄어요 (식사 한 끼 ${fmt(meta.book.world.meal)} ${cur} ≈ ${fmt(meta.book.world.meal * rate)}원)` : ''}` : '화폐를 바꿨어요', 'good');
            return;
        }
        case 'edit-cash': {
            const fv = await form('💰 가진 돈 고치기', [
                { k: 'n', label: `${esc(meta.book.world.currency)}`, type: 'number', v: r.S.cash },
                { k: 'why', label: '이유', v: '', ph: '직접 고침', chips: ['계산이 틀림', '이야기에서 받음', '이야기에서 씀'] },
            ]);
            if (!fv || fv.n === '') return;
            hand(`cash: ${num(fv.n)}`, fv.why || '직접 고침');
            return;
        }
        case 'bk-refill': {
            // 바뀐 로어북 항목만 보고, 거기 나오는 인물만 다시 채운다 (안 바뀐 인물 · 직접 고친 인물은 그대로)
            const { sources } = await import('../rules/ai.js');
            const pick = await (await import('./srcpick.js')).pickSources('📚 다시 채울 때 읽을 곳'); if (!pick) return;
            const src = await sources(pick),
                old = meta.book.src?.sig ?? {};
            const changed = Object.keys(src.sig).filter((k) => old[k] !== src.sig[k]);
            if (Object.keys(old).length && !changed.length) {
                toast('로어북이 바뀌지 않았어요');
                return;
            }
            const names = Object.keys(old).length
                ? meta.book.people
                      .filter((p) => changed.some((k) => [p.name, ...p.aka].some((n) => n && src.texts[k]?.includes(n))))
                      .map((p) => p.name)
                : null;
            toast(names?.length ? `바뀐 인물 ${names.length}명을 다시 채우는 중…` : '로어북을 읽는 중…');
            const { book } = await fillBook(names?.length ? names : null, pick);
            if (!book) {
                toast('채우지 못했어요', 'bad');
                return;
            }
            const nb = normBook({ ...meta.book, ...book, world: book.world ?? meta.book.world, me: book.me ?? meta.book.me });
            let up = 0,
                add = 0;
            let full = 0;
            for (const p of nb.people) {
                const i = meta.book.people.findIndex((x) => x.name === p.name);
                if (i >= 0) {
                    if (!names || names.includes(p.name)) {
                        meta.book.people[i] = { ...p, face: meta.book.people[i].face || p.face };
                        up++;
                    }
                } else if (meta.book.people.length >= LIMIT.people) full++; // 👥 꽉 차면 더 안 넣음 (나중에 저장할 때 잘려 나가던 것)
                else {
                    meta.book.people.push(p);
                    add++;
                }
            }
            if (!names && nb.world.places.length)
                meta.book.world = { ...nb.world, places: nb.world.places.map((p) => ({ ...p, photo: placeOf(meta.book, p.name)?.photo ?? '' })) };
            meta.book.src.sig = src.sig;
            saveMeta();
            app.refresh?.(true);
            toast(`인물 ${up}명 갱신 · ${add}명 추가${full ? ` · ${full}명은 꽉 차서 못 넣음(${LIMIT.people}명까지)` : ''}`, full ? 'bad' : 'good');
            return;
        }
        case 'bk-person':
        case 'bk-me':
        case 'bk-tolang': {
            const { toEnglish } = await import('../rules/ai.js');
            toast('설정집을 영어로 바꾸는 중…');
            try {
                const j = await toEnglish(meta.book); if (!j?.world || !Array.isArray(j.people)) throw new Error('답을 못 읽었어요');
                meta.book = normBook(j); saveMeta(); app.refresh?.(true); toast('설정집을 영어로 바꿨어요 · 화면은 🌐 번역으로 한국어', 'good');
            } catch (e) { toast(`못 바꿨어요: ${e.message}`, 'bad'); }
            return;
        }
        case 'bk-world':
        case 'bk-start':
        case 'bk-places':
            return editBook(act, v);
        case 'preset': {
            const p = PRESETS[v];
            const tgt = meta.influence ? meta.influence : settings().influence;
            tgt.all = p.all;
            tgt.by = { ...p.by };
            meta.influence ? saveMeta() : saveSettings();
            app.refresh?.();
            toast(`${p.name}`);
            return;
        }
    }
}
// 손으로 고친 값 → 마지막 답에 이유와 함께 (기록 · 타임라인에 ✋로 보임)
export function hand(line, why) {
    const i = lastAI(); if (i < 0) { import('./tools.js').then(m => m.handLines([line], why, 'hand')); return; } // 답이 아직 없으면 시작 상태에
    const m = ctx().chat[i], sl = msgData(m, true), k = line.slice(0, line.indexOf(':')), v = line.slice(line.indexOf(':') + 1).trim();
    sl.hand = [...(sl.hand ?? []), { k, v, why }]; sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); saveChatSoon(); app.refresh?.();
}
async function editBook(act, v) {
    const meta = getMeta(), b = meta.book;
    if (act === 'bk-me') return (await import('./tools.js')).editRules('now');
    if (act === 'bk-places') return (await import('./tools.js')).editRules('map');
    const L = (a) => (a ?? []).join(', '), P = (t) => String(t ?? '').split(/[,、]/).map(x => x.trim()).filter(Boolean);
    if (act === 'bk-start') { // 📅 이야기 시작 날짜 · 시각만 빠르게 (쓸 앱 고르기 화면 · 달력)
        const st = b.world.start, hh = Math.floor((st.clock ?? 480) / 60), mm = (st.clock ?? 480) % 60;
        const fv = await form('📅 이야기 시작', [
            { k: 'date', label: '시작 날짜 (년-월-일)', v: `${st.y}-${st.m}-${st.d}`, ph: '2026-3-1' },
            { k: 'time', label: '시작 시각', v: `${hh}:${String(mm).padStart(2, '0')}`, ph: '8:00', chips: ['7:00', '8:00', '12:00', '18:00', '22:00'] },
        ]);
        if (!fv) return;
        const m = /(\d{1,5})\D+(\d{1,2})\D+(\d{1,2})/.exec(fv.date ?? '');
        if (m) Object.assign(st, { y: Number(m[1]), m: Math.min(12, Math.max(1, Number(m[2]))), d: Math.min(31, Math.max(1, Number(m[3]))) });
        const c = clockOf(fv.time); if (c != null) st.clock = c;
        b.src.from = 'user'; saveMeta(); app.refresh?.(true); toast('시작 날짜를 바꿨어요', 'good'); return;
    }
    if (act === 'bk-world') {
        const w = b.world,
            cal = w.start.cal ?? {},
            fv = await form('🌍 세계', [
                { k: 'genre', label: '장르', v: w.genre, chips: ['현대', '판타지', '학원', '무협', 'SF', '아포칼립스'] },
                { k: 'summary', label: '세계관 요약 (2~3문장)', type: 'area', v: w.summary ?? '', ph: '예: 마법이 사라진 지 100년 · 작은 항구 도시 · 왕위 다툼이 막 시작됨' },
                { k: 'rules', label: '이 세계 규칙 (줄마다 하나)', type: 'area', v: (w.rules ?? []).join('\n'), ph: '예: 마법은 밤에만 쓸 수 있음\n귀족만 말을 탈 수 있음' },
                { k: 'cur', label: '화폐 단위', v: w.currency, chips: ['원', '골드', '달러', '엔', '냥'] },
                { k: 'meal', label: '식사 한 끼 값 (물가 기준)', type: 'number', v: w.meal },
                { k: 'wx', label: '날씨 (쉼표로)', v: L(w.weather) },
                { k: 'start', label: '이야기 시작 날짜 (년-월-일)', v: `${w.start.y}-${w.start.m}-${w.start.d}`, ph: '2026-3-1' },
                {
                    k: 'kind',
                    label: '달력',
                    type: 'pick',
                    v: cal.months ? 'custom' : 'greg',
                    opts: [
                        ['greg', '양력'],
                        ['custom', '직접 (판타지 · 다른 세계)'],
                    ],
                },
                {
                    k: 'months',
                    label: '달 (「이름 날수」 쉼표로 · 직접일 때)',
                    v: (cal.months ?? []).map((x) => `${x.name} ${x.days}`).join(', '),
                    ph: '서리달 30, 불꽃달 30, 바람달 31',
                },
                { k: 'week', label: '요일 이름 (쉼표로 · 비우면 일~토)', v: L(cal.week), ph: '해, 달, 불, 물, 나무' },
                { k: 'era', label: '연호', v: cal.era ?? '', ph: '왕국력' },
                {
                    k: 'style',
                    label: '시간 적는 법 (AI도 이 모양으로 씀)',
                    type: 'pick',
                    v: cal.style ?? '24',
                    opts: [
                        ['', '시간대만 (아침 · 낮 · 밤)'],
                        ['24', '24시 (14:30)'],
                        ['12', '오전 · 오후 (오후 2:30)'],
                    ],
                },
            ]);
        if (!fv) return;
        const [y, m, d] = String(fv.start).split(/[-./]/).map(Number);
        meta.book = normBook({
            ...b,
            world: {
                ...w,
                genre: fv.genre,
                summary: fv.summary,
                rules: String(fv.rules ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean),
                currency: fv.cur,
                meal: num(fv.meal, w.meal),
                weather: P(fv.wx),
                start: {
                    ...w.start,
                    y: y || w.start.y,
                    m: m || w.start.m,
                    d: d || w.start.d,
                    cal: {
                        months:
                            fv.kind === 'custom'
                                ? P(fv.months).map((x) => {
                                      const mm = /^(.+?)\s+(\d+)$/.exec(x);
                                      return mm ? { name: mm[1], days: Number(mm[2]) } : { name: x, days: 30 };
                                  })
                                : null,
                        week: P(fv.week),
                        era: fv.era,
                        style: fv.style,
                    },
                },
            },
        });
        meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true); return;
    }
    // 👤 인물 — 설정집 칸 그대로 (성격 · 시작값 · 오르는/내리는 행동 · 증상 · 시너지 · 장소 · 루틴 · 취향 · 기념일 · 속셈)
    const p = v ? personOf(b, v) : null;
    if (!p && b.people.length >= LIMIT.people) { toast(`인물은 ${LIMIT.people}명까지예요 · 안 나오는 인물을 지우고 넣어 주세요`, 'bad'); return; } // 👥 넣어도 잘려 나가던 것
    const acts = (a) => (a ?? []).map(x => `${x.act}${x.d != null ? ` ${x.d > 0 ? '+' : ''}${x.d}` : ''}`).join(', ');
    const fv = await form(p ? `${p.face} ${esc(p.name)}` : '＋ 인물', [
        { k: 'name', label: '이름', v: p?.name ?? '' }, { k: 'face', label: '얼굴 이모지', v: p?.face ?? '🙂', chips: ['🙂', '😎', '🥰', '😤', '🦊', '🐺', '🛡️', '🌸'] },
        { k: 'aka', label: '다른 이름 · 영어 이름 (쉼표로)', v: L(p?.aka) }, { k: 'line', label: '성격 한 줄', v: p?.line ?? '' },
        { k: 'aff', label: '애정 시작값', type: 'number', v: p?.start.aff ?? 10 }, { k: 'trust', label: '우정 시작값', type: 'number', v: p?.start.trust ?? 10 },
        { k: 'up', label: '오르는 행동 (「칭찬 +3」 쉼표로)', v: acts(p?.up) }, { k: 'down', label: '내리는 행동', v: acts(p?.down) },
        { k: 'signs', label: '티 나는 반응 (「40: 눈을 피함」 쉼표로)', v: (p?.signs ?? []).map(x => `${x.at}: ${x.text}`).join(', ') },
        { k: 'syn', label: '다른 사람과 (「Mia: 라이벌」 쉼표로)', v: (p?.syn ?? []).map(x => `${x.to}: ${x.text}`).join(', ') },
        { k: 'haunt', label: '주로 있는 곳', v: L(p?.haunt), chips: b.world.places.map(x => x.name).slice(0, 6) },
        { k: 'routine', label: '하루 루틴 (「아침 길드, 낮 시장」)', v: (p?.routine ?? []).map(x => `${x.at} ${x.place}`).join(', ') },
        { k: 'likes', label: '좋아하는 것', v: L(p?.likes) }, { k: 'hates', label: '싫어하는 것', v: L(p?.hates) },
        { k: 'day', label: '기념일 · 생일', v: p?.day ?? '', ph: '10월 6일 생일' }, { k: 'want', label: '지금 원하는 것 (속셈)', v: p?.want ?? '' },
        { k: 'stages', label: '이 사람만의 관계 단계 (「0 경계: 말 섞기 싫음, 40 동료: 같이 일함, 80 연인: 손잡기」 · 비우면 공통)', type: 'area', v: (p?.stages ?? []).map(x => `${x.at} ${x.name}${x.act ? `: ${x.act}` : ''}`).join(', '), chips: ['0 원수, 30 경쟁자, 60 맞수, 85 동료', '0 낯섦, 25 손님, 50 단골, 80 가족 같은 사이'] },
        { k: 'love', label: '애정', type: 'pick', v: p?.noLove ? 'off' : 'on', opts: [['on', '💗 켜기'], ['off', '💔 우정만']] },
        ...(p ? [{ k: 'del', label: '이 인물', type: 'pick', v: '', opts: [['', '남기기'], ['del', '설정집에서 빼기']] }] : []),
    ]);
    if (!fv?.name.trim()) return;
    if (fv.del) { b.people = b.people.filter(x => x.name !== v); meta.book = normBook(b); saveMeta(); app.refresh?.(true); return; }
    const pairs = (t) => P(t).map(x => { const i = x.search(/[:：]/); return i < 0 ? null : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }).filter(Boolean);
    const stg = P(fv.stages)
        .map((x) => {
            const m = /^(\d+)\s+([^:：]+?)\s*(?:[:：]\s*(.*))?$/.exec(x);
            if (!m) return null;
            const old = (p?.stages ?? b.stages).find((q) => q.name === m[2].trim());
            return { at: Number(m[1]), name: m[2].trim(), call: old?.call ?? '', act: m[3]?.trim() || old?.act || '' };
        })
        .filter(Boolean);
    const np = {
        ...(p ?? {}),
        stages: stg.length >= 2 ? stg : null,
        name: fv.name.trim(),
        face: fv.face,
        aka: P(fv.aka),
        line: fv.line,
        start: { aff: num(fv.aff, 10), trust: num(fv.trust, 10) },
        up: P(fv.up),
        down: P(fv.down),
        signs: pairs(fv.signs).map(([a, t]) => ({ at: num(a, 40), text: t })),
        syn: pairs(fv.syn).map(([to, t]) => ({ to, text: t })),
        haunt: P(fv.haunt),
        routine: P(fv.routine).map((x) => {
            const [at, ...pl] = x.split(/\s+/);
            return { at, place: pl.join(' ') };
        }),
        likes: P(fv.likes),
        hates: P(fv.hates),
        day: fv.day,
        want: fv.want,
        noLove: fv.love === 'off',
    };
    const list = p ? b.people.map(x => (x.name === v ? np : x)) : [...b.people, np];
    meta.book = normBook({ ...b, people: list }); meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true);
}

// 📷 장소 사진: 파일(크기를 줄여 이 채팅에 저장 · 약 30KB) 또는 주소 · 빈칸이면 빼기
async function pickPhoto() {
    const fv = await form('📷 장소 사진', [{ k: 'url', label: '이미지 주소', ph: 'https://…' }, { k: 'how', label: '또는', type: 'pick', v: 'url', opts: [['url', '주소 쓰기'], ['file', '파일 고르기'], ['del', '사진 빼기']] }], { ok: '확인' });
    if (!fv) return null;
    if (fv.how === 'del') return '';
    if (fv.how === 'url') return /^https?:\/\//.test(fv.url.trim()) ? fv.url.trim() : null;
    return new Promise((res) => {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
        inp.onchange = () => {
            const f = inp.files?.[0]; if (!f) return res(null);
            const img = new Image();
            img.onload = () => {
                const k = Math.min(1, 480 / Math.max(img.width, img.height)),
                    c = document.createElement('canvas');
                c.width = Math.round(img.width * k);
                c.height = Math.round(img.height * k);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(img.src);
                const w = c.toDataURL('image/webp', 0.75); res(w.startsWith('data:image/webp') ? w : c.toDataURL('image/jpeg', 0.78)); // 💾 webp가 되면 더 작게 (사파리는 jpeg)
            };
            img.onerror = () => res(null); img.src = URL.createObjectURL(f);
        };
        inp.click();
    });
}

// 🪪 카드 캐릭터 이름(예: Leon)이 설정집의 누구(예: 레온 하트)인지 모를 때 한 번 묻기 → 고르면 그 사람의 다른 이름으로 (기록도 합쳐짐)
let cardAsking = false;
export async function askCardName(r) {
    const c = ctx(), meta = getMeta(), card = String(c.characters?.[c.characterId]?.name ?? '').trim();
    if (cardAsking || !card || c.groupId || !meta?.book || !r?.S?.rel?.[card] || personOf(meta.book, card)) return;
    if ((meta.cardAsked ?? []).includes(card) || !meta.book.people.length) return;
    cardAsking = true;
    try {
        const fv = await form(`🪪 「${esc(card)}」는 누구예요?`, [{ k: 'into', label: `카드 캐릭터 이름 「${esc(card)}」가 이야기에 나와서 새 인물로 생겼어요. 설정집에 있는 사람과 같은 사람이면 골라 주세요. 기록도 하나로 합쳐져요.`, type: 'pick',
            opts: [...meta.book.people.map((p) => [p.name, `${p.face} ${esc(p.name)}`]), ['', '다른 사람이에요']] }], { ok: '확인' });
        meta.cardAsked = [...new Set([...(meta.cardAsked ?? []), card])];
        const p = fv?.into && personOf(meta.book, fv.into);
        if (p) { p.aka = [...new Set([...p.aka, card])]; toast(`${card} → ${p.name}로 합쳤어요`, 'good'); }
        saveMeta(); app.refresh?.(true);
    } finally { cardAsking = false; }
}

