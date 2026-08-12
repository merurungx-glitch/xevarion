/* ============================================================
   GameLink — 1台のiPadでのゲーム内アカウント紐づけ & 賞金XEVA
   ・紐づけの流れは XEVARION ログインと同じ：
       ① 表示名で検索 → ② 候補一覧からアカウントを選ぶ → ③ 4桁パスワード
   ・GameLink.confirm(acc) は「前回の紐づけ引き継ぎ」用：
       検索をとばして ③ のパスワード確認だけを行う（必ず入力が必要）
   ・ゲーム終了時、紐づけ済みプレイヤーの順位に応じて XEVA を配布
     （1位250 / 2位200 / 3位150 / 4位100 / 5位50）
   ・紐づけしなくてもプレイ可。window.XEVARIONFB(=xevarion-fb.js) を使用。
   window.GameLink として公開（プレーンスクリプト）。
   ============================================================ */
(function () {
  "use strict";
  var CHARS_BASE = "../chars/";
  var PRIZES = [250, 200, 150, 100, 50]; // 1位〜5位

  function whenFB(timeout) {
    return new Promise(function (res) {
      if (window.XEVARIONFB) return res(window.XEVARIONFB);
      var done = false, fin = function () { if (!done) { done = true; res(window.XEVARIONFB || null); } };
      window.addEventListener("xevarionfb:ready", fin, { once: true });
      setTimeout(fin, timeout || 6000);
    });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  /* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う */
  function avatar(cf, charId) {
    if (window.XEVA && window.XEVA.canonCharFile) cf = window.XEVA.canonCharFile(cf, charId);
    return cf ? (CHARS_BASE + cf) : "";
  }

  /* ── モーダルDOM（初回だけ生成） ── */
  var ov = null;
  function ensureModal() {
    if (ov) return ov;
    var css = document.createElement("style");
    css.textContent = [
      "#gl-ov{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;background:rgba(30,26,48,.5);backdrop-filter:blur(4px);padding:18px}",
      "#gl-ov.open{display:flex}",
      "#gl-card{width:100%;max-width:400px;max-height:86svh;overflow-y:auto;background:#fff;border-radius:22px;padding:22px;box-shadow:0 24px 60px rgba(40,30,80,.35);font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',system-ui,sans-serif;color:#2c2542}",
      "#gl-card h3{margin:0 0 4px;font-size:1.1rem;text-align:center}",
      "#gl-card .gl-sub{font-size:12px;color:#8a819c;text-align:center;margin-bottom:14px;line-height:1.7}",
      "#gl-card label{font-size:12px;font-weight:800;color:#8a819c;display:block;margin:10px 0 5px}",
      "#gl-card input{width:100%;padding:12px 14px;border:1.5px solid #e6dcef;border-radius:12px;font-size:16px;font-family:inherit;color:#2c2542;outline:none;box-sizing:border-box}",
      "#gl-card input:focus{border-color:#8b5bff}",
      "#gl-cands{display:none;flex-direction:column;gap:8px;margin:12px 0;max-height:38svh;overflow-y:auto}",
      "#gl-cands.show{display:flex}",
      "#gl-cands .gl-cand{display:flex;align-items:center;gap:12px;padding:10px 12px;border:2px solid #ece4f4;border-radius:14px;background:#faf7fd;cursor:pointer;text-align:left;font-family:inherit;font-size:14px}",
      "#gl-cands .gl-cand:hover{border-color:#8b5bff;background:#f4edfd}",
      "#gl-cands .gl-cand img{width:42px;height:42px;border-radius:12px;object-fit:cover;background:#eee;flex:none}",
      "#gl-cands .gl-cand .cn{font-weight:800;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#gl-cands .gl-cand .cg{color:#b9aecb;font-weight:900}",
      "#gl-sel{display:none;align-items:center;gap:12px;background:#f7f2fb;border:2px solid #d9c8f2;border-radius:14px;padding:12px;margin:12px 0}",
      "#gl-sel.show{display:flex}",
      "#gl-sel img{width:46px;height:46px;border-radius:12px;object-fit:cover;background:#eee}",
      "#gl-sel .n{font-weight:800}",
      "#gl-sel .l{font-size:11px;color:#8a819c}",
      "#gl-msg{font-size:12px;font-weight:700;color:#ff5d5d;min-height:18px;margin-top:8px;text-align:center}",
      "#gl-card .gl-btns{display:flex;gap:10px;margin-top:16px}",
      "#gl-card .gl-btns button{flex:1;padding:13px;border:none;border-radius:13px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit}",
      "#gl-card .gl-pri{background:linear-gradient(120deg,#8b5bff,#ff5d8f);color:#fff}",
      "#gl-card .gl-sec{background:#eee7f2;color:#6b6480}",
      "#gl-back{display:none;background:none;border:none;color:#8b5bff;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;padding:2px 0 0}",
      "#gl-back.show{display:inline-block}",
      "#gl-unlink{display:none;width:100%;margin-top:10px;background:none;border:none;color:#ff5d5d;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit}",
      "#gl-unlink.show{display:block}"
    ].join("");
    document.head.appendChild(css);
    ov = document.createElement("div");
    ov.id = "gl-ov";
    ov.innerHTML =
      '<div id="gl-card">' +
      '<h3 id="gl-title">アカウント紐づけ</h3>' +
      '<div class="gl-sub" id="gl-subtx">XEVARIONログインと同じ流れです。<br>表示名で検索 → アカウントを選ぶ → 4桁パスワード</div>' +
      '<button id="gl-back">← 検索にもどる</button>' +
      '<div id="gl-step1">' +
      '<label>表示名（ID）</label>' +
      '<input id="gl-name" type="text" maxlength="20" placeholder="例：ポータルユーザー" autocomplete="off">' +
      '<div id="gl-cands"></div>' +
      '</div>' +
      '<div id="gl-step2" style="display:none">' +
      '<div id="gl-sel"><img id="gl-sel-img" alt=""><div><div class="n" id="gl-sel-name"></div><div class="l">このアカウントに紐づけます（4桁パスワードを入力）</div></div></div>' +
      '<label>4桁パスワード</label>' +
      '<input id="gl-pw" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off">' +
      '</div>' +
      '<div id="gl-msg"></div>' +
      '<div class="gl-btns"><button class="gl-sec" id="gl-cancel">やめる</button><button class="gl-pri" id="gl-go">🔍 検索</button></div>' +
      '<button id="gl-unlink">🔗 この紐づけを解除する</button>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  /* ── 紐づけモーダル本体。
       opts.confirmOnly = {uid,name,charFile} を渡すと検索をとばしてパスワード確認だけを行う。
       resolve({uid,name,charFile}) 成功 / resolve({remove:true}) 解除 / resolve(null) キャンセル ── */
  function openModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      whenFB().then(function (FB) {
        ensureModal();
        var msg = document.getElementById("gl-msg");
        var nameInp = document.getElementById("gl-name");
        var pwInp = document.getElementById("gl-pw");
        var cands = document.getElementById("gl-cands");
        var step1 = document.getElementById("gl-step1");
        var step2 = document.getElementById("gl-step2");
        var backBtn = document.getElementById("gl-back");
        var goBtn = document.getElementById("gl-go");
        var cancelBtn = document.getElementById("gl-cancel");
        var unlinkBtn = document.getElementById("gl-unlink");
        var title = document.getElementById("gl-title");
        var subtx = document.getElementById("gl-subtx");
        var stage = "search"; var hit = null;

        function showStep1() {
          stage = "search"; hit = null;
          step1.style.display = "block"; step2.style.display = "none";
          backBtn.classList.remove("show");
          goBtn.textContent = "🔍 検索";
          msg.textContent = "";
          setTimeout(function () { try { nameInp.focus(); } catch (e) {} }, 60);
        }
        function showStep2(acc) {
          stage = "verify"; hit = acc;
          step1.style.display = "none"; step2.style.display = "block";
          backBtn.classList.toggle("show", !opts.confirmOnly);
          document.getElementById("gl-sel").classList.add("show");
          document.getElementById("gl-sel-name").textContent = acc.name;
          var img = document.getElementById("gl-sel-img");
          img.onerror = function () { this.style.visibility = "hidden"; };
          img.style.visibility = ""; img.src = avatar(acc.charFile);
          pwInp.value = "";
          goBtn.textContent = "🔗 紐づける";
          msg.textContent = "";
          setTimeout(function () { try { pwInp.focus(); } catch (e) {} }, 60);
        }

        nameInp.value = opts.prefillName || "";
        cands.innerHTML = ""; cands.classList.remove("show");
        unlinkBtn.classList.toggle("show", !!opts.confirmOnly);
        if (opts.confirmOnly) {
          title.textContent = "紐づけの確認";
          subtx.innerHTML = "前回の紐づけを引き継ぎます。<br>本人確認のため <b>4桁パスワードの入力が必要</b>です。";
          showStep2(opts.confirmOnly);
        } else {
          title.textContent = "アカウント紐づけ";
          subtx.innerHTML = "XEVARIONログインと同じ流れです。<br>表示名で検索 → アカウントを選ぶ → 4桁パスワード";
          showStep1();
        }
        ov.classList.add("open");
        if (!FB) { msg.textContent = "オンライン接続がありません。紐づけは後でも可能です。"; }

        function close(result) {
          ov.classList.remove("open");
          goBtn.onclick = null; cancelBtn.onclick = null; backBtn.onclick = null; unlinkBtn.onclick = null;
          nameInp.onkeydown = null; pwInp.onkeydown = null; cands.onclick = null;
          resolve(result || null);
        }
        cancelBtn.onclick = function () { close(null); };
        backBtn.onclick = function () { showStep1(); };
        unlinkBtn.onclick = function () { close({ remove: true }); };

        function doSearch() {
          msg.textContent = "";
          var nm = (nameInp.value || "").trim();
          if (!nm) { msg.textContent = "表示名を入力してください。"; return; }
          if (!FB) { msg.textContent = "オンライン接続がありません。"; return; }
          goBtn.disabled = true; goBtn.textContent = "検索中…";
          var fn = FB.searchAccounts ? FB.searchAccounts(nm) : FB.findByName(nm).then(function (u) { return u ? [u] : []; });
          fn.then(function (rows) {
            goBtn.disabled = false; goBtn.textContent = "🔍 検索";
            rows = rows || [];
            if (!rows.length) { msg.textContent = "そのIDのアカウントが見つかりません。"; cands.classList.remove("show"); return; }
            /* XEVARIONログインと同じ「候補から選ぶ」方式 */
            cands.innerHTML = rows.map(function (r, i) {
              return '<button class="gl-cand" data-i="' + i + '">' +
                '<img src="' + esc(avatar(r.charFile)) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
                '<span class="cn">' + esc(r.name) + '</span><span class="cg">›</span></button>';
            }).join("");
            cands.classList.add("show");
            cands.onclick = function (e) {
              var b = e.target.closest(".gl-cand"); if (!b) return;
              var r = rows[+b.dataset.i]; if (!r) return;
              if (!r.gamePwHash && !r.hasPw) { msg.textContent = "このアカウントは4桁パスワード未設定です（ポータルで設定が必要）。"; return; }
              showStep2({ uid: r.uid, name: r.name, charFile: r.charFile || "" });
            };
          });
        }
        function doVerify() {
          msg.textContent = "";
          var pw = (pwInp.value || "").trim();
          if (!/^\d{4}$/.test(pw)) { msg.textContent = "4桁の数字を入力してください。"; return; }
          if (!FB) { msg.textContent = "オンライン接続がありません。"; return; }
          goBtn.disabled = true; goBtn.textContent = "確認中…";
          FB.hashPw(pw).then(function (h) {
            return FB.verifyGamePw(hit.uid, h);
          }).then(function (ok) {
            goBtn.disabled = false; goBtn.textContent = "🔗 紐づける";
            if (!ok) { msg.textContent = "パスワードが正しくありません。"; pwInp.value = ""; pwInp.focus(); return; }
            close({ uid: hit.uid, name: hit.name, charFile: hit.charFile || "" });
          });
        }
        goBtn.onclick = function () { if (stage === "search") doSearch(); else doVerify(); };
        nameInp.onkeydown = function (e) { if (e.key === "Enter" && stage === "search") doSearch(); };
        pwInp.onkeydown = function (e) { if (e.key === "Enter" && stage === "verify") doVerify(); };
      });
    });
  }

  function link(prefillName) { return openModal({ prefillName: prefillName }); }
  /* 前回の紐づけを引き継ぐときのパスワード確認（検索をとばして本人確認のみ） */
  function confirm(acc) { return openModal({ confirmOnly: { uid: acc.uid, name: acc.name, charFile: acc.charFile || "" } }); }

  /* ── 賞金配布。rankedUids = 順位順の {uid,name} 配列（紐づけ済みのみ）── */
  function awardPrizes(rankedUids) {
    return whenFB().then(function (FB) {
      if (!FB) return [];
      var out = [];
      var jobs = [];
      rankedUids.forEach(function (r, i) {
        var amt = PRIZES[i]; if (!amt || !r || !r.uid) return;
        jobs.push(FB.awardXeva(r.uid, amt, (i + 1) + "位 賞金（" + (r.game || "ゲーム") + "）"));
        out.push({ rank: i + 1, name: r.name, amount: amt });
      });
      return Promise.all(jobs).then(function () { return out; });
    });
  }

  window.GameLink = { link: link, confirm: confirm, awardPrizes: awardPrizes, whenFB: whenFB, PRIZES: PRIZES };
})();
