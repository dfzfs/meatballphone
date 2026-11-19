// 이름 맞추기: 오타 · 존칭 · 영어 이름이 조금 달라도 이미 있는 인물 · 장소 · 물건에 맞춘다
import { norm } from '../base/util.js';

const HONOR = /(씨|님|군|양|선배|후배|오빠|언니|형|누나|선생님?|쌤|씨에게|에게|한테|이가|이는|이|가|은|는|을|를|의|와|과)$/;
const bare = (s) => { let n = norm(s).replace(/^(mr|ms|mrs|sir|lady|lord)\.?/, ''); for (let i = 0; i < 2; i++) n = n.replace(HONOR, ''); return n; };
function dist(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
}
// cands: [{ name, aka? }] → { name, how: 'exact'|'aka'|'bare'|'typo' } 또는 null
export function match(raw, cands) {
    const n = norm(raw), b = bare(raw);
    if (!n) return null;
    for (const c of cands) if (norm(c.name) === n) return { name: c.name, how: 'exact' };
    for (const c of cands) if ((c.aka ?? []).some(a => norm(a) === n)) return { name: c.name, how: 'aka' };
    for (const c of cands) if (bare(c.name) === b || (c.aka ?? []).some(a => bare(a) === b)) return { name: c.name, how: 'bare' };
    if (b.length >= 3) {
        const hits = cands.filter(c => [c.name, ...(c.aka ?? [])].some(x => dist(bare(x), b) <= 1));
        if (hits.length === 1) return { name: hits[0].name, how: 'typo' };
    }
    return null;
}
