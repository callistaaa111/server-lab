/* Dark mode switch: shared by every page. Load in <head> (not deferred) so the saved choice applies before the page paints.
   Saves "light" or "dark" in localStorage under serverlab.theme; with nothing saved the page follows the device setting.
   The switch goes in the XP rail on lessons (lab.js, or lesson 21's own rail), next to nav.top on reference sheets,
   or at the top of main on the home page. */
(function () {
  const KEY = "serverlab.theme";
  const root = document.documentElement;
  const sys = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const saved = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v === "dark" || v === "light" ? v : null; } catch (e) { return null; } };
  const isDark = () => (saved() || root.dataset.theme || (sys && sys.matches ? "dark" : "light")) === "dark";
  const s = saved(); if (s) root.dataset.theme = s;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "theme-btn"; btn.setAttribute("role", "switch"); btn.setAttribute("aria-label", "Dark mode");
    btn.innerHTML = '<span class="theme-track" aria-hidden="true"><span class="theme-knob"></span></span><span class="theme-label">Dark mode</span>';
    const paint = () => btn.setAttribute("aria-checked", String(isDark()));
    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
      paint();
    });
    if (sys && sys.addEventListener) sys.addEventListener("change", paint);
    paint();

    // lab.js builds the lesson rail in a setTimeout (and removes nav.top), so on lessons wait for the rail before placing
    const usesLab = !!document.querySelector('script[src$="lab.js"]');
    let tries = 0;
    const place = () => {
      const rail = document.querySelector(".rail-in, .rail .wrap");
      if (!rail && usesLab && tries++ < 40) return setTimeout(place, 25);
      const top = document.querySelector("main > nav.top");
      if (rail) { const rank = rail.querySelector(".rank"); if (rank) rank.after(btn); else rail.insertBefore(btn, rail.querySelector(".jump")); }
      else if (top) { top.classList.add("with-theme"); top.append(btn); }
      else { const main = document.querySelector("main"); if (!main) return; const row = document.createElement("div"); row.className = "theme-row"; row.append(btn); main.prepend(row); }
    };
    place();
  });
})();
