#!/usr/bin/env bash
# 미트볼폰 시험 전체 돌리기 — 통과 개수와 실패한 시험 이름만 보여 줌 (로그: /tmp/mp-<시험>.log)
cd "$(dirname "$0")" || exit 1
ok=0; fail=""
for t in t-*.mjs; do
    if NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules} timeout 200 node "$t" >"/tmp/mp-$t.log" 2>&1; then ok=$((ok+1)); else fail="$fail $t"; fi
done
echo "통과 $ok${fail:+ · 실패:$fail}"
[ -z "$fail" ]
