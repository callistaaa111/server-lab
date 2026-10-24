/* Lab shell + games for Server Lab lessons. Load it BEFORE quiz.js / sims / terminal on every lesson page.
   Shell (runs after the other scripts): title block from .eyebrow + h1 + .lede + .meta, one numbered "sheet" per h2,
   a sticky XP rail with jump links, saved checklists (ul.steps), and a toast for every XP award.
   Games, each a <div class="lab-NAME"> with a <script type="application/json"> config:
     lab-drill  {title, intro, placeholder, rounds:[{p, a:[accepted answers], why}]}          10 XP per first-try hit
     lab-sort   {title, intro, choices:[...], items:[{t, a: choiceIndex, why}]}                5 XP each
     lab-order  {title, intro, items:[correct order...], rules?:[[i, j, "i must come before j because..."]]}  40 XP
     lab-cases  {cases:[{sym, sev, o:[...], a, steps:[...]}]}                                  20 XP each
     lab-cards  {title, cards:[{q, a}]}   reveal, then "I had it" / "Not yet"                   5 XP per "I had it"
     lab-gloss  {words:[[word, meaning], ...]}   tap to flip
   XP is kept in this browser only (localStorage "serverlab.xp"). Custom sims call Lab.award(id, pts) and Lab.addMax(pts). */
(function () {
  const LESSON = (location.pathname.match(/(\d{4})-[^/]*\.html$/) || [])[1];
  const LID = LESSON ? String(+LESSON).padStart(2, "0") : "home";
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, cls) => { const b = el("button", cls || "sim-btn", label); b.type = "button"; return b; };
  const rich = (tag, cls, text) => { const e = el(tag, cls); String(text).split("`").forEach((p, i) => e.append(i % 2 ? el("code", null, p) : document.createTextNode(p))); return e; };
  const cfgOf = root => { const s = root.querySelector('script[type="application/json"]'); return s ? JSON.parse(s.textContent) : {}; };
  let labMax = 0;

  /* ---------- XP ---------- */
  let toastBox, toastT;
  function toast(msg) {
    if (!toastBox) { toastBox = el("div", "toast"); toastBox.setAttribute("role", "status"); document.body.append(toastBox); }
    toastBox.textContent = msg; toastBox.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastBox.classList.remove("show"), 2200);
  }
  function award(id, pts, msg) {
    const x = load("serverlab.xp"), key = LID + ":" + id;
    if (x[key] !== undefined) return false;
    x[key] = pts; store("serverlab.xp", x);
    if (pts > 0) toast(`+${pts} XP${msg ? " · " + msg : ""}`);
    refresh(); return true;
  }
  const had = id => load("serverlab.xp")[LID + ":" + id] !== undefined;
  const RANKS = [[0, "Visitor"], [150, "Guard trainee"], [500, "Shift guard"], [1200, "Head of security"], [2200, "NOC-ready"]];
  function courseXP() {
    let t = 0;
    const s = load("serverlab.scores"); for (const k in s) t += (s[k].right || 0) * 10;
    const tm = load("serverlab.terms"); for (const k in tm) t += (tm[k].done || 0) * 15;
    const m = load("serverlab.match"); t += Object.keys(m).length * 30;
    const x = load("serverlab.xp"); for (const k in x) t += x[k] || 0;
    const l21 = load("serverlab-l21-v1"); t += l21.xp || 0;
    return t;
  }
  function rankOf(xp) { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (xp >= n) r = name; return r; }
  function lessonXP() {
    let got = 0, max = labMax;
    const s = load("serverlab.scores"), tm = load("serverlab.terms"), m = load("serverlab.match"), x = load("serverlab.xp");
    document.querySelectorAll(".quiz[data-quiz]").forEach(q => { const n = q.querySelectorAll(".q").length; max += n * 10; const r = s[q.dataset.quiz]; if (r) got += r.right * 10; });
    document.querySelectorAll(".terminal[data-term]").forEach(t => { const n = t.querySelectorAll("ol.term-tasklist > li").length; max += n * 15; const r = tm[t.dataset.term]; if (r) got += r.done * 15; });
    document.querySelectorAll(".match[data-match]").forEach(g => { max += 30; if (m[g.dataset.match] !== undefined) got += 30; });
    for (const k in x) if (k.startsWith(LID + ":")) got += x[k] || 0;
    return { got: Math.min(got, max), max };
  }
  let lastCourse = null;
  function refresh() {
    const fill = document.getElementById("lab-xpfill"); if (!fill) return;
    const { got, max } = lessonXP(), c = courseXP();
    fill.style.width = (max ? got / max * 100 : 0) + "%";
    document.getElementById("lab-xpnum").textContent = `${got} / ${max} XP`;
    document.getElementById("lab-rank").textContent = rankOf(c);
    const bar = document.getElementById("lab-xpbar"); bar.setAttribute("aria-valuenow", got); bar.setAttribute("aria-valuemax", max);
    if (lastCourse !== null && c > lastCourse && rankOf(c) !== rankOf(lastCourse)) toast(`New rank: ${rankOf(c)}`);
    lastCourse = c;
  }

  /* ---------- games ---------- */
  function drill(root) {
    const c = cfgOf(root), id = root.dataset.id || "drill", n = c.rounds.length; labMax += n * 10;
    root.replaceChildren(el("div", "sim-h", "Drill · " + (c.title || "rounds")));
    if (c.intro) root.append(rich("p", "sim-p", c.intro));
    const top = el("div", "sim-row"); const count = el("span", "sim-label"); const pips = el("span", "lab-pips"); top.append(count, pips);
    const prompt = el("div", "lab-prompt");
    const row = el("div", "sim-row"); const inp = el("input", "sim-input"); inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
    inp.placeholder = c.placeholder || "your answer"; inp.setAttribute("aria-label", "Answer");
    const go = btn("Check"), next = btn("Next round"); next.hidden = true; row.append(inp, go, next);
    const log = el("p", "sim-log"); log.setAttribute("aria-live", "polite");
    root.append(top, prompt, row, log);
    const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, " ").replace(/^\//, "");
    let i = 0; const res = load("serverlab.xp");
    while (i < n && res[`${LID}:${id}:${i}`] !== undefined) i++;
    function paint() {
      pips.replaceChildren(...c.rounds.map((_, k) => { const v = load("serverlab.xp")[`${LID}:${id}:${k}`]; return el("i", v > 0 ? "on" : v === 0 ? "miss" : ""); }));
      if (i >= n) { count.textContent = `All ${n} rounds done`; prompt.textContent = ""; inp.disabled = go.disabled = true; next.hidden = true;
        log.replaceChildren(el("span", "lab-ok", "Drill complete. "));
        const again = btn("Practise again", "sim-btn small"); again.onclick = () => { i = 0; inp.disabled = go.disabled = false; paint(); }; log.append(again); return; }
      count.textContent = `Round ${i + 1} of ${n}`; prompt.replaceChildren(rich("span", null, c.rounds[i].p));
      inp.value = ""; log.textContent = ""; go.hidden = false; next.hidden = true;
    }
    function check() {
      if (i >= n || !inp.value.trim()) return;
      const r = c.rounds[i], ok = r.a.map(norm).includes(norm(inp.value));
      if (ok) award(`${id}:${i}`, 10); else if (!had(`${id}:${i}`)) award(`${id}:${i}`, 0);
      log.replaceChildren(el("b", ok ? "lab-ok" : "lab-bad", ok ? "Correct. " : `It's ${r.a[0]}. `), rich("span", null, r.why || ""));
      go.hidden = true; next.hidden = false; next.focus(); paint2();
    }
    function paint2() { pips.replaceChildren(...c.rounds.map((_, k) => { const v = load("serverlab.xp")[`${LID}:${id}:${k}`]; return el("i", v > 0 ? "on" : v === 0 ? "miss" : ""); })); }
    go.onclick = check; next.onclick = () => { i++; paint(); inp.focus(); };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); next.hidden ? check() : next.click(); } });
    paint();
  }

  function sort(root) {
    const c = cfgOf(root), id = root.dataset.id || "sort"; labMax += c.items.length * 5;
    const saved = load("serverlab.sort");
    root.replaceChildren(el("div", "sim-h", "Sort it · " + (c.title || "")));
    if (c.intro) root.append(rich("p", "sim-p", c.intro));
    const grid = el("div", "lab-sortgrid"); root.append(grid);
    const score = el("p", "sim-log"); root.append(score);
    let done = 0, right = 0;
    c.items.forEach((it, k) => {
      const card = el("div", "lab-card"); card.append(rich("div", "lab-card-t", it.t));
      const row = el("div", "lab-choices"), out = el("div", "lab-card-out");
      const bs = c.choices.map((ch, j) => { const b = btn(ch, "sim-chip"); b.onclick = () => pick(j); row.append(b); return b; });
      function pick(j, silent) {
        bs.forEach((b, q) => { b.disabled = true; if (q === it.a) b.classList.add("lab-right"); if (q === j && j !== it.a) b.classList.add("lab-wrong"); });
        const ok = j === it.a; done++; if (ok) right++;
        out.replaceChildren(el("b", ok ? "lab-ok" : "lab-bad", ok ? "Right. " : `${c.choices[it.a]}. `), rich("span", null, it.why || ""));
        if (!silent) { const s = load("serverlab.sort"); s[`${LID}:${id}:${k}`] = j; store("serverlab.sort", s); award(`${id}:${k}`, ok ? 5 : 0); }
        score.textContent = `${right} of ${done} right${done === c.items.length ? " · all sorted" : ""}`;
      }
      card.append(row, out); grid.append(card);
      const v = saved[`${LID}:${id}:${k}`]; if (v !== undefined) pick(v, true);
    });
  }

  function order(root) {
    const c = cfgOf(root), id = root.dataset.id || "order"; labMax += 40;
    root.replaceChildren(el("div", "sim-h", "Put it in order · " + (c.title || "")));
    if (c.intro) root.append(rich("p", "sim-p", c.intro));
    const pool = el("div", "lab-pool"), built = el("ol", "lab-built"), row = el("div", "sim-row"), log = el("div", "sim-log");
    log.setAttribute("aria-live", "polite");
    const chk = btn("Check order"), reset = btn("Reset", "sim-chip"); row.append(chk, reset);
    root.append(el("div", "sim-label", "Tap to place:"), pool, el("div", "sim-label", "Your order (tap to remove):"), built, row, log);
    // fixed shuffle so the page looks the same each visit, never already solved
    const idx = c.items.map((_, i) => i); const sh = idx.slice().sort((a, b) => ((a * 7 + 3) % 11) - ((b * 7 + 3) % 11));
    if (sh.every((v, i) => v === i)) sh.reverse();
    let placed = [];
    function paint() {
      pool.replaceChildren(...sh.filter(i => !placed.includes(i)).map(i => { const b = el("button", "lab-chip"); b.type = "button"; b.append(rich("span", null, c.items[i])); b.onclick = () => { placed.push(i); paint(); }; return b; }));
      built.replaceChildren(...placed.map((i, k) => { const li = el("li"); const b = el("button", "lab-chip"); b.type = "button"; b.append(rich("span", null, c.items[i])); b.onclick = () => { placed.splice(k, 1); paint(); }; li.append(b); return li; }));
      if (!placed.length) built.append(el("li", "lab-empty", "nothing yet"));
    }
    chk.onclick = () => {
      if (placed.length < c.items.length) { log.replaceChildren(el("span", "lab-bad", `Place all ${c.items.length} first.`)); return; }
      let errs;
      if (c.rules) errs = c.rules.filter(([a, b]) => placed.indexOf(a) > placed.indexOf(b)).map(r => r[2]);
      else { const k = placed.findIndex((v, i) => v !== i); errs = k < 0 ? [] : [`Step ${k + 1} is out of place. Think about what has to happen first.`]; }
      if (!errs.length) { log.replaceChildren(el("b", "lab-ok", c.win || "That order works.")); award(id, 40, "order solved"); }
      else { log.replaceChildren(...errs.map(e => { const p = el("div", "lab-bad"); p.append(rich("span", null, e)); return p; })); }
    };
    reset.onclick = () => { placed = []; log.textContent = ""; paint(); };
    paint();
  }

  function cases(root) {
    const c = cfgOf(root), id = root.dataset.id || "cases"; labMax += c.cases.length * 20;
    const saved = load("serverlab.sort");
    root.replaceChildren(el("div", "sim-h", "Break/fix · the NOC phone rings"));
    c.cases.forEach((cs, k) => {
      const box = el("div", "lab-case");
      const sym = el("div", "lab-sym"); sym.append(el("b", null, `Ticket #${LID}${String(k + 1).padStart(2, "0")} · ${cs.sev || "P3"}`), rich("span", null, cs.sym));
      const opts = el("div", "q-opts"), out = el("div"); out.hidden = true;
      cs.o.forEach((o, j) => { const b = el("button", "q-opt"); b.type = "button"; b.append(el("b", null, "ABCD"[j] + "  "), ...rich("span", null, o).childNodes); b.onclick = () => go(j); opts.append(b); });
      function go(j, silent) {
        opts.querySelectorAll("button").forEach((b, q) => { b.disabled = true; if (q === cs.a) b.classList.add("right"); if (q === j && j !== cs.a) b.classList.add("wrong"); });
        out.hidden = false; const ol = el("ol", "lab-steps"); cs.steps.forEach(s => ol.append(rich("li", null, s)));
        out.replaceChildren(el("p", j === cs.a ? "lab-ok" : "lab-bad", (j === cs.a ? "Good call." : `Most likely: ${"ABCD"[cs.a]}.`) + " Check in this order:"), ol);
        if (!silent) { const s = load("serverlab.sort"); s[`${LID}:${id}:${k}`] = j; store("serverlab.sort", s); award(`${id}:${k}`, j === cs.a ? 20 : 0); }
      }
      const body = el("div", "lab-case-b"); body.append(opts, out); box.append(sym, body); root.append(box);
      if (saved[`${LID}:${id}:${k}`] !== undefined) go(saved[`${LID}:${id}:${k}`], true);
    });
  }

  function cards(root) {
    const c = cfgOf(root), id = root.dataset.id || "cards"; labMax += c.cards.length * 5;
    root.replaceChildren(el("div", "sim-h", "Flashcards · " + (c.title || "say it out loud first")));
    if (c.intro) root.append(rich("p", "sim-p", c.intro));
    const saved = load("serverlab.sort");
    c.cards.forEach((cd, k) => {
      const box = el("div", "lab-card"); box.append(rich("div", "lab-card-t", `${k + 1}. ${cd.q}`));
      const show = btn("Show the answer", "sim-chip"), ans = el("div", "lab-card-out"); ans.hidden = true; ans.append(rich("p", null, cd.a));
      const rate = el("div", "lab-choices"); const yes = btn("I had it", "sim-chip"), no = btn("Not yet", "sim-chip"); rate.append(yes, no); ans.append(rate);
      show.onclick = () => { ans.hidden = false; show.hidden = true; };
      const mark = (v, silent) => { yes.disabled = no.disabled = true; (v ? yes : no).classList.add(v ? "lab-right" : "lab-wrong");
        if (!silent) { const s = load("serverlab.sort"); s[`${LID}:${id}:${k}`] = v; store("serverlab.sort", s); award(`${id}:${k}`, v ? 5 : 0); } };
      yes.onclick = () => mark(true); no.onclick = () => mark(false);
      box.append(show, ans); root.append(box);
      const v = saved[`${LID}:${id}:${k}`]; if (v !== undefined) { show.click(); mark(v, true); }
    });
  }

  function gloss(root) {
    const c = cfgOf(root);
    root.replaceChildren(el("div", "sim-label", "Tap a word to see its meaning."));
    const grid = el("div", "lab-gloss-grid");
    c.words.forEach(([w, d]) => {
      const b = el("button", "lab-flip"); b.type = "button"; b.setAttribute("aria-expanded", "false");
      const s = el("span", null, "tap to reveal"); b.append(el("b", null, w), s);
      b.onclick = () => { const o = b.classList.toggle("open"); b.setAttribute("aria-expanded", o); s.textContent = o ? d : "tap to reveal"; };
      grid.append(b);
    });
    root.append(grid);
  }

  /* ---------- shell ---------- */
  function shell() {
    const main = document.querySelector("main"); if (!main || !LESSON) return;
    // title block
    const eb = main.querySelector(":scope > .eyebrow"), h1 = main.querySelector(":scope > h1"), lede = main.querySelector(":scope > .lede"), meta = main.querySelector(":scope > .meta");
    if (h1 && !main.querySelector(".titleblock")) {
      const tb = el("header", "titleblock"), m = el("div", "tb-main"), cells = el("div", "tb-cells");
      h1.before(tb); [eb, h1, lede].forEach(x => x && m.append(x)); tb.append(m);
      if (meta) { meta.querySelectorAll("span").forEach(sp => { const d = el("div"); if (sp.dataset.k) d.append(el("b", null, sp.dataset.k)); d.append(...sp.childNodes); cells.append(d); }); meta.remove(); }
      if (cells.children.length) tb.append(cells); else m.style.borderRight = "0";
    }
    // sheets
    const kids = Array.from(main.children); let sec = null, n = 0; const heads = [];
    kids.forEach(k => {
      if (k.tagName === "H2") { n++; sec = el("section", "sheet"); sec.id = "s" + n; const hd = el("div", "sheet-head"); hd.append(el("span", "sheet-no", "SHEET " + n)); k.before(sec); hd.append(k); sec.append(hd); heads.push([sec.id, k.textContent]); return; }
      if (k.matches("nav.course, script")) { sec = null; return; }
      if (sec) sec.append(k);
    });
    // rail
    const rail = el("nav", "rail"); rail.setAttribute("aria-label", "Lesson progress");
    const inn = el("div", "rail-in"); const home = el("a", "home", "Server Lab"); home.href = "../index.html";
    const rank = el("span", "rank"); rank.id = "lab-rank";
    const bar = el("div", "xpbar"); bar.id = "lab-xpbar"; bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-label", "Lesson XP"); bar.setAttribute("aria-valuemin", "0");
    const fill = el("i"); fill.id = "lab-xpfill"; bar.append(fill);
    const num = el("span", "xpnum"); num.id = "lab-xpnum";
    const jump = el("div", "jump"); const short = t => t.replace(/\s*\([^)]*\)/g, "").replace("New words from this lesson", "Words").replace(/^Practice \d+ · /, "").split(/ · |: /)[0].slice(0, 22);
    heads.forEach(([hid, t], i) => { const a = el("a", null, `${i + 1} ${short(t)}`); a.href = "#" + hid; a.title = t; jump.append(a); });
    inn.append(home, el("span", "xpnum", "L" + LID), rank, bar, num, jump); rail.append(inn);
    document.body.prepend(rail);
    const top = main.querySelector(":scope > nav.top"); if (top) top.remove();
    // saved checklists
    const chk = load("serverlab.checks");
    document.querySelectorAll("ul.steps input[type=checkbox]").forEach((cb, i) => {
      const key = `${LID}:${i}`; if (chk[key]) cb.checked = true;
      cb.addEventListener("change", () => { const s = load("serverlab.checks"); s[key] = cb.checked; store("serverlab.checks", s); });
    });
    refresh(); window.addEventListener("load", refresh);
    let t; document.addEventListener("click", () => { clearTimeout(t); t = setTimeout(refresh, 350); });
    document.addEventListener("keydown", () => { clearTimeout(t); t = setTimeout(refresh, 600); });
  }

  const GAMES = { drill, sort, order, cases, cards, gloss };
  for (const k in GAMES) document.querySelectorAll(".lab-" + k).forEach(r => { try { GAMES[k](r); } catch (e) { r.textContent = "This game failed to load: " + e.message; } });
  window.Lab = { award, had, toast, addMax: p => { labMax += p; }, courseXP, rankOf, lesson: LID, load, store };
  setTimeout(shell, 0);
})();
