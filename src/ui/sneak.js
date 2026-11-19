// ✍ 몰래 생긴 것 — 소지품 · 달력 앱 맨 아래 카드 + 줄마다 「되돌리기」(그 답에 손 고침으로 반대 사건)
import { esc, fmt } from '../base/util.js';
import { row, card, btn, toast } from './kit.js';
import { liveSneaks, undoLine } from '../rules/sneak.js';

const KINDS = { bag: ['item', 'cash'], cal: ['cal'] };
// 소지품 줄에 붙는 딱지
export const isSecret = (it) => !!it?.secret;
export const secretSub = (it) => `<span class="mls-tag">🎁 누가 몰래 넣어 둠</span> ✍ ${esc(it.from ?? '')}${it.note ? ` · ${esc(it.note)}` : ''}`;
export function sneakCard(r, app) {
    const L = liveSneaks(r.S, KINDS[app]).slice().reverse();
    if (!L.length) return '';
    const cur = esc(r.book.world.currency);
    return card('✍ 몰래 생긴 것', L.map((e) => row({
        icon: e.kind === 'item' ? '🎁' : e.kind === 'cash' ? '💸' : '📅',
        title: e.kind === 'item' ? esc(e.what) : e.kind === 'cash' ? `${e.n > 0 ? '+' : '−'}${fmt(Math.abs(e.n))} ${cur}` : `${esc(e.md)} 메모`,
        sub: `✍ ${esc(e.who)}${e.note ? ` · ${esc(e.note)}` : ''}`,
        value: btn('되돌리기', 'sneak-undo', e.key, 'xs'),
    })).join(''), '되돌리면 마지막 답에 적혀요');
}
export function sneakUndo(key, r, hand) {
    const e = liveSneaks(r.S).find((q) => q.key === key);
    if (!e) return;
    hand(undoLine(e), '✍ 되돌리기');
    toast('되돌렸어요');
}
