/* Quiz component for Server Lab lessons.
   Usage: <div class="quiz" data-quiz="lesson-0001-recall">
            <script type="application/json">[{ "q": "...", "pre": "optional command output",
              "options": ["...", "..."], "answer": 1, "why": "explanation" }]</script>
          </div>
   Feedback is immediate. The last score per quiz is kept in localStorage (best effort)
   so later review lessons can see what needs spacing. */
(function () {
  const KEY = "serverlab.scores";
  function loadScores() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function saveScore(id, right, total) {
    try { const s = loadScores(); s[id] = { right, total, at: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // `backticks` in question/option/why text become <code>, everything else stays plain text
  function rich(tag, cls, text) {
    const e = el(tag, cls);
    String(text).split("`").forEach((part, i) => e.append(i % 2 ? el("code", null, part) : document.createTextNode(part)));
    return e;
  }

  function render(root) {
    const data = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    const id = root.dataset.quiz || "quiz";
    let answered = 0, right = 0;
    root.replaceChildren();
    const score = el("p", "quiz-score");
    function paintScore() {
      score.replaceChildren();
      if (answered < data.length) { score.append(`${answered} of ${data.length} answered`); return; }
      const b = el("b", null, `${right} / ${data.length}`); score.append("Score: ", b,
        right === data.length ? ": all correct. Come back in a few days and try again without rereading." :
        ": reread the explanations for the ones you missed, then retry.");
      const again = el("button", "q-retry", "Retry"); again.type = "button";
      again.onclick = () => render(root); score.append(again);
    }
    // keep the JSON in the DOM so Retry can re-render from it
    const keep = el("script"); keep.type = "application/json"; keep.textContent = JSON.stringify(data);

    data.forEach((item, i) => {
      const box = el("div", "q");
      box.append(el("div", "q-n", `Question ${i + 1}`), rich("p", "q-text", item.q));
      if (item.pre) box.append(el("pre", null, item.pre));
      const opts = el("div", "q-opts"); const why = el("p", "q-why"); why.hidden = true;
      item.options.forEach((label, j) => {
        const b = rich("button", "q-opt", label); b.type = "button";
        b.onclick = () => {
          opts.querySelectorAll("button").forEach(x => x.disabled = true);
          const ok = j === item.answer;
          b.classList.add(ok ? "right" : "wrong");
          opts.children[item.answer].classList.add("right");
          why.replaceChildren(el("b", null, ok ? "Correct. " : "Not quite. "), ...rich("span", null, item.why).childNodes);
          why.classList.toggle("miss", !ok); why.hidden = false; answered++; if (ok) right++;
          if (answered === data.length) saveScore(id, right, data.length);
          paintScore();
        };
        opts.append(b);
      });
      box.append(opts, why); root.append(box);
    });
    root.append(score, keep); paintScore();
  }
  document.querySelectorAll(".quiz").forEach(render);
})();
