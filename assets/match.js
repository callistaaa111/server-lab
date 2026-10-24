/* Matching game: click an item on the left, then its partner on the right.
   Usage: <div class="match" data-match="08-aws"><script type="application/json">
            { "title": "Oracle name → AWS name", "left": "Oracle", "right": "AWS",
              "pairs": [["VCN", "VPC"], ["Compute instance", "EC2 instance"]] }
          </script></div>
   Both columns are shuffled each round. Best result per game is kept in this browser. */
(function () {
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function mount(root, cfg) {
    cfg = cfg || JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    const id = root.dataset.match || "match";
    root.replaceChildren();
    root.append(el("div", "sim-h", "Game · " + (cfg.title || "match the pairs")));
    root.append(el("p", "sim-p", "Click one on the left, then its partner on the right."));
    const grid = el("div", "match-grid");
    const L = el("div", "match-col"), R = el("div", "match-col");
    L.append(el("div", "sim-label", cfg.left || "")); R.append(el("div", "sim-label", cfg.right || ""));
    grid.append(L, R);
    const status = el("p", "sim-log"); status.setAttribute("aria-live", "polite");
    let sel = null, mistakes = 0, matched = 0;
    const mk = (text, idx, side) => {
      const b = el("button", "match-item", text); b.type = "button"; b.dataset.idx = idx;
      b.onclick = () => {
        if (b.classList.contains("matched")) return;
        if (side === "L") { L.querySelectorAll(".sel").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = b; return; }
        if (!sel) { status.textContent = "Pick one on the left first."; return; }
        if (sel.dataset.idx === b.dataset.idx) {
          sel.classList.remove("sel"); sel.classList.add("matched"); b.classList.add("matched"); sel.disabled = b.disabled = true;
          sel = null; matched++;
          status.textContent = matched === cfg.pairs.length ? finish() : `${matched} of ${cfg.pairs.length} matched`;
        } else {
          mistakes++; b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 500);
          status.textContent = `Not a pair. ${matched} of ${cfg.pairs.length} matched · ${mistakes} miss${mistakes === 1 ? "" : "es"}`;
        }
      };
      return b;
    };
    shuffle(cfg.pairs.map((p, i) => [p[0], i])).forEach(([t, i]) => L.append(mk(t, i, "L")));
    shuffle(cfg.pairs.map((p, i) => [p[1], i])).forEach(([t, i]) => R.append(mk(t, i, "R")));
    function finish() {
      let best = null;
      try { const k = "serverlab.match", s = JSON.parse(localStorage.getItem(k) || "{}");
        best = s[id]; if (best == null || mistakes < best) { s[id] = mistakes; localStorage.setItem(k, JSON.stringify(s)); } } catch (e) {}
      setTimeout(() => { const again = el("button", "sim-btn", "Play again (reshuffled)"); again.type = "button"; again.onclick = () => mount(root, cfg); status.append(" ", again); }, 0);
      return `All matched with ${mistakes} miss${mistakes === 1 ? "" : "es"}.` + (mistakes === 0 ? " Perfect!" : " Play again and aim for zero.") +
        (best != null ? ` (Your best: ${Math.min(best, mistakes)} misses.)` : "");
    }
    root.append(grid, status);
  }
  document.querySelectorAll(".match").forEach(r => mount(r));
})();
