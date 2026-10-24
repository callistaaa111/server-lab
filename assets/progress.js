/* Course-home progress: marks a lesson card done when all its quizzes have been completed,
   and shows course-wide XP and rank (same formula as lab.js).
   Reads what quiz.js, terminal.js, match.js, lab.js and Lesson 21 store. Each card lists its quiz ids in data-quizzes="id1 id2". */
(function () {
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } };
  const s = load("serverlab.scores");
  document.querySelectorAll("[data-quizzes]").forEach(card => {
    const ids = card.dataset.quizzes.split(/\s+/).filter(Boolean);
    const done = ids.filter(id => s[id]);
    const st = card.querySelector(".st"); if (!st) return;
    if (done.length === ids.length) {
      const right = done.reduce((a, id) => a + s[id].right, 0), total = done.reduce((a, id) => a + s[id].total, 0);
      st.textContent = `✓ ${right}/${total}`; st.classList.add("done");
    } else if (done.length) { st.textContent = `${done.length}/${ids.length} quizzes`; st.classList.add("part"); }
  });
  let xp = 0;
  for (const k in s) xp += (s[k].right || 0) * 10;
  const tm = load("serverlab.terms"); for (const k in tm) xp += (tm[k].done || 0) * 15;
  xp += Object.keys(load("serverlab.match")).length * 30;
  const x = load("serverlab.xp"); for (const k in x) xp += x[k] || 0;
  xp += load("serverlab-l21-v1").xp || 0;
  const RANKS = [[0, "Visitor"], [150, "Guard trainee"], [500, "Shift guard"], [1200, "Head of security"], [2200, "NOC-ready"]];
  let rank = RANKS[0][1], next = null;
  for (const [n, name] of RANKS) { if (xp >= n) rank = name; else if (!next) next = [n, name]; }
  const r = document.getElementById("home-rank"), v = document.getElementById("home-xp");
  if (r) r.textContent = rank;
  if (v) v.textContent = `${xp.toLocaleString()}${next ? ` · ${(next[0] - xp).toLocaleString()} to ${next[1]}` : ""}`;
})();
