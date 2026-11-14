/* ============================================================
   MagiQuiz — quiz-result.js（結果発表・称号・賞金・見直し）
   ★★ 2026-11-05 全面作り直し
   ------------------------------------------------------------
   ・順位：見えない爆弾＝生き残り（ライフの多い順）→ アウトが遅かった順／タワー＝点→ミスの少なさ→速さ／スコア＝点→正解数→速さ。
     同じ成績は同じ順位（＝同じ賞金）。爆弾はアウトの順がちがうので同順位にならない。
   ・賞金は画面を出した瞬間に1回だけ送る（quiz-account.js の report）。演出（3位 → 2位 → 1位）はそのあと。タップで飛ばせる。
   ・見直し：まちがえた問題／ぜんぶ／人ごと。図・解説・ポイントつき。
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ, Q = MQ.Data, A = MQ.Account, FX = MQ.FX, U = MQ.U;
  const { $, $$, esc, fmtN, ic, avatar, buzzBtn, sheet, show, LET, MODES, UI } = U;
  const D = window.MCL_DATA;
  let G = null, us = [], skipT = [];

  function ranked(g) {
    const L = g.units.slice();
    if (g.mode === "bomb") {
      L.sort((a, b) => (a.out === b.out ? (a.out ? b.outAt - a.outAt : b.lives - a.lives || a.miss - b.miss || b.ok - a.ok) : a.out ? 1 : -1));
      L.forEach((u, i) => { u.rank = i + 1; });
    } else if (g.mode === "rush") {
      /* 早押し：正解数の順。ほかの全員がアウトになって残った人は、正解数によらず1位 */
      L.sort((a, b) => b.score - a.score || b.lives - a.lives || a.ms - b.ms);
      const rest = L.filter((u) => !u.out), reach = L.some((u) => u.score >= g.opt.target);
      if (rest.length === 1 && !reach) { L.splice(L.indexOf(rest[0]), 1); L.unshift(rest[0]); }
      L.forEach((u, i) => { const p = L[i - 1]; u.rank = i && p.score === u.score && p.lives === u.lives && u !== rest[0] ? p.rank : i + 1; });
    } else {
      const k2 = (u) => (g.mode === "tower" ? -u.miss : u.ok);
      L.sort((a, b) => b.score - a.score || k2(b) - k2(a) || a.ms - b.ms);
      L.forEach((u, i) => { const p = L[i - 1]; u.rank = p && p.score === u.score && k2(p) === k2(u) ? p.rank : i + 1; });
    }
    return L;
  }
  const scoreTx = (u) => {
    if (G.mode === "bomb") return u.out ? "アウト" : "生き残り ♥" + u.lives;
    if (G.mode === "tower") return fmtN(u.score) + " pt";
    if (G.mode === "rush") return u.score + " 問正解" + (u.out ? "・アウト" : "");
    return fmtN(u.score) + " 点";
  };
  /* 称号（遊んだあとの話のたねに） */
  function awards(g) {
    const out = [], L = g.units;
    const name = (u) => esc(u.name);
    const add = (ic2, t, u, d) => out.push({ ic: ic2, t, who: name(u), d, c: u.color });
    const best = (fn, min) => { let b = null, v = -Infinity; L.forEach((u) => { const x = fn(u); if (x > v) { v = x; b = u; } }); return v >= min ? { u: b, v } : null; };
    let a = best((u) => u.ok, 3); if (a && L.length > 1) add("check", "正解王", a.u, a.v + "問 正解");
    a = best((u) => u.best, 3); if (a) add("flame", "連続正解", a.u, a.v + "問 連続");
    /* 正解だけの平均の速さ（3問以上） */
    const sp = L.map((u) => { const l = g.log.filter((x) => x.u === u.k && x.ok); return l.length >= 3 ? { u, ms: l.reduce((s, x) => s + x.ms, 0) / l.length } : null; }).filter(Boolean).sort((x, y) => x.ms - y.ms)[0];
    if (sp && L.length > 1) add("timer", "スピードスター", sp.u, "平均 " + (sp.ms / 1000).toFixed(1) + " 秒");
    L.forEach((u) => { if (u.calcN >= 2 && u.calcOk === u.calcN) add("calc", "計算の達人", u, u.calcOk + "問 全問正解"); });
    Q.FIELDS.forEach((f) => { L.forEach((u) => { const s = u.fs[f[0]]; if (s && s.n >= 3 && s.ok === s.n) add("star", f[1] + "マスター", u, s.ok + "問 全問正解"); }); });
    if (g.mode === "bomb") {
      L.forEach((u) => { if (!u.out && !u.boom) add("heart", "無傷の生還", u, "一度も爆発せず"); if (u.near) add("swap", "間一髪", u, "爆発の直前にパス ×" + u.near); });
      a = best((u) => u.boom, 2); if (a) add("flame", "爆弾に好かれた人", a.u, a.v + "回 爆発");
    }
    if (g.mode === "tower") L.forEach((u) => { if (u.floor >= Q.RULE.LADDER.length) add("crown", "タワー制覇", u, "10階 到達"); });
    return out.slice(0, 6);
  }

  function open(g) {
    G = g; us = ranked(g);
    show("result");
    FX.music(""); FX.bgmStop();
    const solo = us.length === 1, top3 = us.slice(0, 3);
    const po = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : [top3[0]];
    const st = A.stats(), rows = [];
    us.forEach((u) => u.members.forEach((m) => rows.push({ owner: m.owner, uid: m.uid, name: m.owner && m.acc ? m.acc.name : m.uid && m.acc ? m.acc.name : m.name, rank: u.rank, ok: u.ok, n: u.n, pt: g.mode === "tower" ? u.score : 0, score: g.mode === "score" ? u.score : 0, boom: u.boom, fields: u.fs, topics: u.ts, played: g.mode === "rush" ? g.round : undefined })));
    const prevBest = (() => { if (!solo) return 0; const r = rows[0], id = r.owner ? "me" : r.uid ? r.uid : "local:" + r.name, s = st[id]; return s ? (g.mode === "tower" ? s.best : s.bestS) || 0 : 0; })();
    const wrong = g.log.filter((l) => l.ok !== true).length;
    const u0 = us[0], acc = u0.n ? Math.round(u0.ok / u0.n * 100) : 0;
    const head = solo ? '<h2 class="re-h">おつかれさま！</h2>' : '<h2 class="re-h" id="reH">結果発表</h2>';
    const stage = solo
      ? `<section class="re-solo" style="--c:${u0.color}"><small>${esc(MODES[g.mode].nm)}</small><b>${scoreTx(u0)}</b><p>正解 ${u0.ok} / ${u0.n}（${acc}%）${u0.best >= 2 ? "・最高 " + u0.best + " 問連続" : ""}</p>${(u0.score > prevBest && prevBest > 0) ? '<em>自己ベスト更新！</em>' : prevBest ? `<i>これまでのベスト ${fmtN(prevBest)}</i>` : ""}</section>`
      : `<section class="re-pod n${po.length}">${po.map((u) => {
        const mb = u.members[0];
        return `<div class="pod r${u.rank}" data-r="${u.rank}" style="--c:${u.color}"><div class="pod-a">${u.rank === 1 ? `<span class="pod-cr">${ic("crown")}</span>` : ""}${avatar({ name: u.name, color: u.color, acc: g.team ? null : mb.acc, pic: g.team ? "" : mb.pic, icon: g.team ? "team" : null }, u.rank === 1 ? "xl" : "lg")}</div><b>${esc(u.name)}</b><small>${scoreTx(u)}</small><div class="pod-b"><span>${u.rank}</span></div></div>`;
      }).join("")}</section>`;
    const aw = awards(g);
    $("#result").innerHTML = `<div class="re-sc">${head}${stage}
      <div class="re-rest" id="reRest">
        ${solo ? "" : `<section class="re-list">${us.map((u) => `<div class="rr" style="--c:${u.color}"><span class="rr-k">${u.rank}</span>${avatar({ name: u.name, color: u.color, acc: g.team ? null : u.members[0].acc, pic: g.team ? "" : u.members[0].pic, icon: g.team ? "team" : null }, "xs")}<span class="rr-n"><b>${esc(u.name)}</b>${g.team ? `<small>${esc(u.members.map((m) => m.name).join("・"))}</small>` : ""}</span><span class="rr-s">${scoreTx(u)}</span><span class="rr-a">${u.ok}/${u.n}</span></div>`).join("")}</section>`}
        ${aw.length ? `<section class="re-awd"><h3>${ic("star")}称号</h3><div>${aw.map((a) => `<span class="aw" style="--c:${a.c}">${ic(a.ic)}<b>${a.t}</b><em>${a.who}</em><small>${esc(a.d)}</small></span>`).join("")}</div></section>` : ""}
        <section class="re-prz" id="rePrz"><p class="re-pm">${ic("gift")}XEVA を確認しています…</p></section>
      </div></div>
      <div class="re-foot"><button class="btn" data-a="reDetail">${ic("list")}<span>結果詳細</span></button><button class="btn" data-a="review">${ic("book")}<span>見直す</span>${wrong ? "<small>" + wrong + "問</small>" : ""}</button>${buzzBtn("again", "もう一度", "")}<button class="btn" data-a="reTitle">${ic("home")}<span>タイトル</span></button></div>`;
    paintPrize(rows, { solo: solo && rows.length === 1, mode: g.mode, gid: g.id });
    stageRun(solo);
  }
  async function paintPrize(rows, opt) {
    const res = await A.report(rows, opt).catch(() => ({ prizes: [] }));
    const box = $("#rePrz"); if (!box) return;
    const pz = res.prizes || [], any = rows.some((r) => r.owner || r.uid), label = { me: "この端末に入りました", cloud: "アカウントに送りました", wait: "オンラインになったら届きます" };
    if (pz.length) {
      box.innerHTML = `<h3>${ic("gift")}XEVA</h3>` + pz.map((p) => `<div class="pz"><span class="pz-r">${opt.solo ? "正解" : p.rank + "位"}</span><b>${esc(p.name)}</b><em>+${fmtN(p.amount)}</em><img src="../XEVA.png" alt="XEVA"><small>${label[p.kind]}</small></div>`).join("");
      setTimeout(() => { FX.sfx("coin"); }, 3200);
    } else {
      box.innerHTML = `<p class="re-pm">${ic("gift")}${any ? (res.short ? "賞金は3問以上答えた人だけです" : opt.solo ? "正解すると XEVA がもらえます" : "賞金の対象の人はいませんでした") : "「この端末の本人」にチェックするか、アカウント連携すると XEVA がもらえます"}</p>`;
    }
  }
  /* 3位 → 2位 → 1位 の順に見せる（タップで飛ばせる） */
  function stageRun(solo) {
    skipT.forEach(clearTimeout); skipT = [];
    const rest = $("#reRest");
    const later = (fn, ms) => skipT.push(setTimeout(fn, ms));
    const hostSay = (ev) => { try { if (MQ.Host) MQ.Host.say(ev, { p: us[0] ? us[0].name : "" }); } catch (e) {} };   /* ★★ 2026-11-08 司会キャラ */
    if (solo) {
      FX.sfx("win"); FX.confetti(80); FX.music("result");
      rest.classList.add("in");
      later(() => hostSay("solo"), 700);
      return;
    }
    if (FX.RM()) { $$(".pod").forEach((p) => p.classList.add("up")); rest.classList.add("in"); FX.music("result"); later(() => hostSay("final"), 600); return; }
    $("#result").classList.add("staging");
    const up = (r) => { const p = $('.pod[data-r="' + r + '"]'); if (p) p.classList.add("up"); };
    const has3 = !!$('.pod.r3'), has2 = !!$('.pod.r2');
    let t = 500;
    if (has3) { later(() => { up(3); FX.sfx("stamp"); }, t); t += 800; }
    if (has2) { later(() => { up(2); FX.sfx("stamp"); }, t); t += 900; }
    later(() => FX.sfx("drum"), t); t += 1750;
    later(() => { up(1); FX.sfx("cym"); FX.sfx("win"); FX.confetti(170); FX.burst(innerWidth / 2, innerHeight * 0.32, 60, null, 760); FX.music("result"); }, t); t += 900;
    later(() => hostSay("final"), t + 300);
    later(() => { rest.classList.add("in"); $("#result").classList.remove("staging"); }, t);
  }
  function skip() {
    if (!skipT.length) return;
    skipT.forEach(clearTimeout); skipT = [];
    $$(".pod").forEach((p) => p.classList.add("up"));
    const r = $("#reRest"); if (r) r.classList.add("in");
    $("#result").classList.remove("staging");
    FX.confetti(90); FX.music("result");
  }

  /* ══ 見直し ══ */
  const RV = { f: "wrong", u: -1 };
  function openReview() {
    const log = G.log, F = window.MCLFig;
    let L = log.filter((l) => (RV.u < 0 || l.u === RV.u) && (RV.f === "all" || l.ok !== true));
    const multi = G.units.length > 1;
    const rows = L.map((l) => {
      const q = D.BY[l.id]; if (!q) return "";
      const u = G.units.find((x) => x.k === l.u), cor = Q.answers(q);
      const st = l.ok === true ? `<span class="rv-st ok">${ic("check")}正解</span>` : l.why === "drop" ? '<span class="rv-st">降りた問題</span>' : l.why === "boom" ? '<span class="rv-st ng">爆発</span>' : l.why === "skip" ? '<span class="rv-st">だれも答えず</span>' : l.why === "time" ? '<span class="rv-st ng">時間切れ</span>' : `<span class="rv-st ng">${ic("x")}まちがい</span>`;
      const sel = Array.isArray(l.sel) ? l.sel : l.sel == null ? [] : [l.sel];
      return `<article class="rv"><div class="rv-h">${st}${multi && u ? `<span class="rv-u" style="--c:${u.color}">${esc(u.name)}</span>` : ""}<span class="rv-tp">${esc(Q.topicName(q.t))}</span></div>` +
        (q.ctx ? `<div class="q-ctx">${Q.fmt(q.ctx)}</div>` : "") + (q.fig && F ? `<div class="fig">${F.make(q.fig) || ""}</div>` : "") + `<div class="q-tx">${Q.fmt(q.q)}</div>` +
        (q.type === "n" ? `<p class="rv-n">正解：<b>${window.MCL.answerText(q)}</b></p>` : `<div class="rv-o">${l.ord.map((i, k) => `<span class="${cor.indexOf(i) >= 0 ? "ok" : sel.indexOf(i) >= 0 ? "ng" : ""}"><i>${Q.labels(q)[k]}</i><em>${Q.fmtOpt(q, q.o[i])}</em></span>`).join("")}</div>`) +
        `<details class="rs-sol"${l.ok === true ? "" : " open"}><summary>${ic("book")}解説</summary><div class="rs-tx">${Q.fmt(q.s)}</div>${q.sfig && F && F.make(q.sfig) ? `<div class="fig">${F.make(q.sfig)}</div>` : ""}</details>` +
        (q.k ? `<div class="rs-k"><span>ポイント</span>${Q.fmt(q.k)}</div>` : "") + "</article>";
    }).join("");
    const seg = `<div class="su-seg sm"><button class="${RV.f === "wrong" ? "on" : ""}" data-a="rvF" data-v="wrong">まちがえた問題</button><button class="${RV.f === "all" ? "on" : ""}" data-a="rvF" data-v="all">ぜんぶ</button></div>` +
      (multi ? `<div class="rv-us"><button class="${RV.u < 0 ? "on" : ""}" data-a="rvU" data-v="-1">全員</button>${G.units.map((u) => `<button class="${RV.u === u.k ? "on" : ""}" data-a="rvU" data-v="${u.k}" style="--c:${u.color}">${esc(u.name)}</button>`).join("")}</div>` : "");
    sheet(`<h3 class="sh-t">${ic("book")}見直し<small>${L.length}問</small></h3>${seg}<div class="rv-l">${rows || '<p class="sh-p center">ここに出す問題はありません 🎉</p>'}</div>
      <p class="sh-note">もっと練習したいときは <a href="../MagiChemLex/index.html">MagiChemLex</a> の「基礎セット」で。</p><div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>`, { cls: "review" });
  }
  /* ══ ★★ 2026-11-13 結果詳細（ご指定「ゲーム終わりに結果詳細をボタンから見られるように」）══
     人（チーム）ごとの成績と、1問ごとの記録（だれが・単元・むずかしさ・◯✕・かかった時間・点の内訳）。
     スコアアタックは点のしくみも出す（ご質問「スコアアタックの点数の違いは？」＝むずかしさ・計算・速さ・連続正解で1問の点が変わる）。
     ★ 点の内訳（pt・parts）とタワーの階（fl）は quiz-play.js の reveal が記録に足す。前の版から続けた試合の記録には無いので、無ければ出さない。 */
  function openDetail() {
    const g = G, S = Q.RULE.SCORE, X = {};
    Q.all().forEach((x) => { X[x.id] = x; });
    const multi = g.units.length > 1;
    const sec = (ms) => ((ms || 0) / 1000).toFixed(1) + "秒";
    const cards = us.map((u) => {
      const L = g.log.filter((l) => l.u === u.k), okL = L.filter((l) => l.ok === true);
      const tot = L.reduce((s, l) => s + (l.ms || 0), 0), avg = okL.length ? okL.reduce((s, l) => s + (l.ms || 0), 0) / okL.length : 0;
      const rows = [["正解", u.ok + " / " + u.n + (u.n ? "（" + Math.round(u.ok / u.n * 100) + "%）" : "")], ["答えた時間", "合計 " + sec(tot) + (okL.length ? "・正解の平均 " + sec(avg) : "")]];
      if (u.best >= 2) rows.push(["連続正解", "最高 " + u.best + "問"]);
      if (u.calcN) rows.push(["計算問題", u.calcOk + " / " + u.calcN]);
      if (g.mode === "score") {
        const p = [0, 0, 0]; let has = false;
        L.forEach((l) => { if (l.parts) { has = true; p[0] += l.parts[0]; p[1] += l.parts[1]; p[2] += l.parts[2]; } });
        if (has) rows.push(["点の内訳", "正解 " + fmtN(p[0]) + " ＋ 速さ " + fmtN(p[1]) + " ＋ 連続 " + fmtN(p[2])]);
      } else if (g.mode === "tower") rows.push(["タワー", u.floor + "階まで・ミス " + u.miss + "回"]);
      else if (g.mode === "bomb") rows.push(["爆弾", "爆発 " + u.boom + "回・のこりライフ " + u.lives + (u.out ? "（アウト）" : "")]);
      else if (g.mode === "rush") rows.push(["早押し", "正解 " + u.score + "問・お手つき " + L.filter((l) => l.ok === false).length + "回"]);
      const fs = Q.FIELDS.filter((f) => u.fs[f[0]] && u.fs[f[0]].n).map((f) => `<span class="rd-f"><i>${f[1]}</i>${u.fs[f[0]].ok}/${u.fs[f[0]].n}</span>`).join("");
      return `<section class="rd-u" style="--c:${u.color}"><div class="rd-uh"><span class="rd-k">${u.rank}</span><b>${esc(u.name)}</b><em>${scoreTx(u)}</em></div>` +
        (g.team ? `<p class="rd-mb">${esc(u.members.map((m) => m.name).join("・"))}</p>` : "") +
        `<dl>${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>${fs ? `<div class="rd-fs">${fs}</div>` : ""}</section>`;
    }).join("");
    const tl = g.log.map((l, i) => {
      const q = D.BY[l.id]; if (!q) return "";
      const u = g.units.find((x) => x.k === l.u), x = X[l.id];
      const st = l.ok === true ? ["ok", "◯ 正解"] : l.why === "boom" ? ["ng", "爆発"] : l.why === "time" ? ["ng", "時間切れ"] : l.why === "drop" ? ["", "降りた"] : l.why === "skip" ? ["", "答えなし"] : ["ng", "✕ ミス"];
      let pt = "";
      if (g.mode === "score") pt = l.ok === true ? (l.parts ? `<b>+${fmtN(l.pt)}</b><small>正解${l.parts[0]}・速さ${l.parts[1]}${l.parts[2] ? "・連続" + l.parts[2] : ""}</small>` : "") : "<b>0</b>";
      else if (g.mode === "tower" && l.fl != null) pt = `<b>${l.fl}階</b>`;
      else if (g.mode === "rush" && l.ok === true) pt = "<b>+1問</b>";
      return `<li><span class="rd-n">${i + 1}</span><span class="rd-w">${multi && u ? `<i style="--c:${u.color}">${esc(u.name)}</i>` : ""}<em>${esc(Q.topicName(q.t))}</em><small>${x ? "むずかしさ " + "★".repeat(x.lv) + (x.calc ? "・計算" : "") : ""}</small></span>` +
        `<span class="rd-r"><i class="rd-st ${st[0]}">${st[1]}</i><small>${l.ms ? sec(l.ms) : ""}</small></span><span class="rd-p">${pt}</span></li>`;
    }).join("");
    const how = g.mode === "score"
      ? `<details class="rd-how" open><summary>点数のしくみ（スコアアタック）</summary><ul>
          <li><b>正解の点</b>：問題のむずかしさで決まります。★1＝${S.base[1]}点／★2＝${S.base[2]}点／★3＝${S.base[3]}点（計算問題は +${S.calc}点）</li>
          <li><b>速さ</b>：のこり時間が多いほど高く、最大 +${S.time}点（解答時間「なし」のときは一律 +${Math.round(S.time * 0.5)}点）</li>
          <li><b>連続</b>：続けて正解すると、2問めから +${S.comboStep}点ずつ（最大 +${S.comboMax}点）。まちがえると 0 にもどります</li>
          <li>まちがい・時間切れは 0点。<b>同じ正解数でも</b>、出た問題のむずかしさ・速さ・連続で点が変わります</li></ul></details>`
      : `<p class="rd-note">順位の決め方：${g.mode === "bomb" ? "生き残った人（ライフの多い順）→ アウトがおそかった順" : g.mode === "tower" ? "点（のぼった階）→ ミスの少なさ → 速さ" : "正解数 → のこりライフ → 速さ（ほかの全員がアウトなら、残った人が1位）"}</p>`;
    sheet(`<h3 class="sh-t">${ic("list")}結果詳細<small>${esc(MODES[g.mode].nm)}・${g.log.length}問</small></h3>${how}<div class="rd-us">${cards}</div>
      <h4 class="rd-h">1問ごとの記録</h4><ol class="rd-tl">${tl || '<li class="rd-none">記録がありません</li>'}</ol>
      <p class="sh-note">むずかしさ（★1〜3）は、もとの問題の難易度・選択肢の数・文の長さ・計算の有無から決めています。</p>
      <div class="sh-b"><button class="btn" data-a="review">${ic("book")}問題を見直す</button><button class="btn pri" data-a="close">とじる</button></div>`, { cls: "review" });
  }
  Object.assign(U.ACT, {
    reDetail: () => { FX.sfx("tap"); openDetail(); },
    review: () => { FX.sfx("tap"); RV.f = G.log.some((l) => l.ok !== true) ? "wrong" : "all"; RV.u = -1; openReview(); },
    rvF: (el) => { RV.f = el.dataset.v; FX.sfx("tap"); openReview(); },
    rvU: (el) => { RV.u = +el.dataset.v; FX.sfx("tap"); openReview(); },
    again: () => { FX.sfx("buzz"); U.begin(); },
    reTitle: () => { FX.sfx("tap"); U.openTitle(); },
  });
  document.addEventListener("pointerdown", () => { if (document.body.dataset.scr === "result") skip(); });

  MQ.Result = { open };
  if (MQ.boot) MQ.boot();
})();
