// 🗝 공략 탭 예외 상황: 그릇이 원래 갖고 있는 이름(constructor · toString) · 따옴표/꺾쇠가 든 이름 · AI가 모양을 다르게 준 답 · 스크립트가 든 답
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'memo']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const story = await import('/ext/src/story.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), out = {}, L = () => story.storyData(true);
        const names = ['Leon', "O'Brien \"Q\" <img src=x onerror=window.__xss=1>", 'constructor', 'toString'];
        await window.__addUser('hi'); await window.__addAI(`s\n<meatball>\n${names.map(n => `aff: ${n} +10`).join('\n')}\n</meatball>`); await wait(400);
        window.__autoPopup = null; shell.openSheet('rel'); await wait(300);
        const el = [...shell.panels].find(p => p.isConnected);
        const go = async (ui = {}) => { el._ss.tab = 'guide'; el._ss.ui = ui; el._ss.mode = 'view'; app.renderPanel(el); await wait(150); };
        const press = async (sel, ms = 700) => { const b = el.querySelector(sel); if (!b) return false; b.click(); await wait(ms); return true; };
        const GOOD_G = '{"up":[{"kind":"item","text":"u1"},{"kind":"act","text":"u2"},{"kind":"say","text":"u3"}],"down":[{"kind":"item","text":"d1"},{"kind":"act","text":"d2"},{"kind":"say","text":"d3"}],"note":"n"}', GOOD_S = '{"green":"g1","yellow":"y1","red":"r1","black":"k1"}';
        // 이름마다: 그려짐 → 공략 → 비밀 → 하나 까기 (눈치 1 + 1)
        const bad = [];
        for (const n of story.people().map(x => x.name)) {
            window.__ai = (p, s = '') => (s.includes('strategy guide') ? GOOD_G : GOOD_S);
            await go({ gWho: n });
            const ok = !!el.querySelector('.ss-guide .ss-gd-sec') && await press('.ss-guide [data-st="guide"]') && el.querySelectorAll('.ss-gd-col li').length === 6
                && await press('.ss-guide [data-st="secgen"]') && el.querySelectorAll('.ss-gd-secret').length === 4 && await press('.ss-guide [data-st="secopen"]', 300) && el.querySelectorAll('.ss-gd-secret.open').length === 1 && story.susOf(n) === 2;
            if (!ok) bad.push(n);
        }
        out.names = (story.people().length >= 4 && !bad.length) || `${story.people().length}명 · 실패: ${bad.join(' / ')}`;
        out.noXss = !window.__xss && !el.querySelector('img[src="x"]');
        out.protoClean = Object.keys(Object.prototype).length === 0;
        out.injClean = story.storyInjection().includes('SECRETS') && !/undefined|\[object|function/.test(story.storyInjection());
        // AI가 모양을 다르게 준 답
        const tryG = async (v) => { delete L().guide; delete L().sus; window.__ai = () => v; await go({ gWho: 'Leon' }); await press('.ss-guide [data-st="guide"]', 900); const g = story.guideOf('Leon'); return g ? `${g.up.length}/${g.down.length}/${g.up.map(x => x.k || '-').join('')}/${story.susOf('Leon')}` : `none/${story.susOf('Leon')}`; };
        out.gStrings = (await tryG('{"up":["꽃을 줘","손을 잡아","고맙다고 해"],"down":["늦지 마","술 주지 마","거짓말 하지 마"]}')) === '3/3/---/1' || 'strings';
        out.gKorKind = (await tryG('{"up":[{"kind":"아이템","text":"a"},{"kind":"행동","text":"b"},{"kind":"말","text":"c"}],"down":[{"kind":"Item","text":"d"}]}')) === '3/1/itemactsay/1' || 'kor';
        out.gNested = (await tryG('{"guide":{"up":[{"kind":"act","text":"a"}],"down":[{"kind":"say","text":"b"}]}}')) === '1/1/act/1' || 'nested';
        out.gMany = (await tryG(`{"up":[${Array(9).fill('{"kind":"act","text":"x"}').join(',')}],"down":[]}`)) === '3/0/actactact/1' || 'many';
        out.gJunk = (await tryG('I cannot help with that.')) === 'none/0' && !el.querySelector('.ss-guide [data-st="guide"]').disabled || 'junk'; // 실패하면 눈치도 안 오르고 단추도 풀림
        out.gHtml = (await tryG('{"up":[{"kind":"act","text":"<b onclick=window.__xss=2>bold</b><script>window.__xss=3</script>"}],"down":[]}')).startsWith('1/0') && !window.__xss && !el.querySelector('.ss-guide b[onclick], .ss-guide script') || 'html';
        const tryS = async (v) => { delete L().secrets; window.__ai = () => v; await go({ gWho: 'Leon' }); await press('.ss-guide [data-st="secgen"]', 900); const s = story.secretsOf('Leon'); return s ? s.map(x => `${x.lv}${x.text}`).join(',') : 'none'; };
        out.sObjs = (await tryS('{"green":{"text":"a"},"yellow":{"text":"b"},"red":{"text":"c"},"black":{"text":"d"}}')) === 'ga,yb,rc,kd' || 'objs';
        out.sNested = (await tryS('{"secrets":{"green":"a","yellow":"b","red":"c","black":"d"}}')) === 'ga,yb,rc,kd' || 'nested';
        out.sArr = (await tryS('{"secrets":["a","b","c","d"]}')) === 'ga,yb,rc,kd' || 'arr';
        out.sKor = (await tryS('{"초록":"a","노랑":"b","빨강":"c","검정":"d"}')) === 'ga,yb,rc,kd' || 'kor';
        out.sOne = (await tryS('{"green":"a"}')) === 'none' || 'one'; // 하나뿐이면 받지 않는다
        // 없는 사람을 고른 상태 → 첫 사람으로 · 공략을 끄면 눈치가 안 쌓임
        await go({ gWho: '없는 사람' }); out.fallback = !!el.querySelector('.ss-gd-who .ss-pill.on');
        delete L().sus; core.settings().guideOn = false; story.addSus('Leon', 5); out.offNoSus = story.susOf('Leon') === 0; core.settings().guideOn = true;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `guide: ${k}`, typeof v === 'string' ? v : '');
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'no page errors', logs.filter(l => /pageerror|TypeError/.test(l)).slice(0, 2).join(' | '));
} finally { await close(); }
