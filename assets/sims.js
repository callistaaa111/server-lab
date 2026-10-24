/* Interactive simulators for Server Lab lessons. Mount with <div class="sim" data-sim="NAME">,
   optionally with a <script type="application/json"> config inside.
     guard    : lobby-guard firewall (Lesson 01)
     address  : address checker: IP vs port, public/private (Lessons 01–02)
     protocol : TCP vs UDP race with lost packets (Lesson 03)
     explain  : click any line of a file/output to see what it means (Lessons 03, 05, 06)
     journey  : five-checkpoint packet journey + mystery tickets (Lesson 06)
     builder  : fill-in form that writes text for you, saved in this browser (Lesson 09) */
(function () {
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls) { const b = el("button", cls || "sim-btn", label); b.type = "button"; return b; }
  function cfgOf(root) { const s = root.querySelector('script[type="application/json"]'); return s ? JSON.parse(s.textContent) : {}; }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const PORTNAMES = { 22: "SSH (remote control)", 53: "DNS (name lookups)", 80: "website (http)", 443: "secure website (https)",
    3389: "Windows Remote Desktop", 8211: "Palworld", 25565: "Minecraft", 25575: "game admin (RCON)", 8797: "your monitor" };

  /* ---------- guard: the lobby guard with a list ---------- */
  function guard(root) {
    const ports = [22, 80, 3389, 8211];
    const allowed = new Set([22]);
    root.replaceChildren();
    root.append(el("div", "sim-h", "Simulator · be the lobby guard"));
    const p = el("p", "sim-p", "The guard’s list decides which units (ports) visitors may reach. Right now only unit 22 is on it. Send visitors in, then change the list.");
    const listBox = el("div", "sim-row"); listBox.append(el("span", "sim-label", "Guard’s list:"));
    ports.forEach(n => {
      const lab = el("label", "sim-check"); const cb = el("input"); cb.type = "checkbox"; cb.checked = allowed.has(n);
      cb.onchange = () => { cb.checked ? allowed.add(n) : allowed.delete(n); };
      lab.append(cb, document.createTextNode(` ${n}`)); listBox.append(lab);
    });
    const sendBox = el("div", "sim-row"); sendBox.append(el("span", "sim-label", "Send a visitor to:"));
    const stage = el("div", "guard-stage");
    const lanes = {};
    ["Internet", "Guard", "Unit"].forEach(k => { const d = el("div", "guard-cell", k); lanes[k] = d; stage.append(d); });
    const log = el("div", "sim-log"); log.setAttribute("aria-live", "polite");
    const goals = el("ul", "sim-goals");
    const G = [
      ["Send a visitor to unit 22 (SSH)", r => r.port === 22 && r.ok],
      ["Send a friend to unit 8211 (Palworld) while it’s NOT on the list", r => r.port === 8211 && !r.ok],
      ["Fix it: put 8211 on the list and send your friend again", r => r.port === 8211 && r.ok],
    ];
    const gDone = G.map(() => false);
    const gEls = G.map(g => { const li = el("li", null, g[0]); goals.append(li); return li; });
    let busy = false;
    ports.forEach(n => {
      const b = btn(`${n} · ${PORTNAMES[n].split(" (")[0]}`);
      b.onclick = async () => {
        if (busy) return; busy = true;
        Object.values(lanes).forEach(c => c.className = "guard-cell");
        lanes.Internet.className = "guard-cell on"; lanes.Internet.textContent = `Visitor → port ${n}`;
        await wait(450);
        const ok = allowed.has(n);
        lanes.Guard.className = "guard-cell " + (ok ? "ok" : "bad"); lanes.Guard.textContent = ok ? `✓ ${n} is on the list` : `✗ ${n} not on the list`;
        await wait(450);
        if (ok) { lanes.Unit.className = "guard-cell ok"; lanes.Unit.textContent = `${PORTNAMES[n]} answers`; }
        else { lanes.Unit.className = "guard-cell"; lanes.Unit.textContent = "never reached"; }
        log.textContent = ok ? `Let in. Port ${n} leads to ${PORTNAMES[n]}.`
          : `Turned away at the lobby. ${n === 8211 ? "This is exactly why “opening port 8211” was needed when the server was set up." : "Good: nothing on the server needs this port, so it stays closed."}`;
        const r = { port: n, ok };
        G.forEach((g, i) => { if (!gDone[i] && g[1](r) && (i === 0 || gDone[i - 1])) { gDone[i] = true; gEls[i].classList.add("done"); } });
        if (gDone.every(Boolean)) log.textContent += " All goals done! Bonus thought: why not just tick every port? Because each open port is a door a stranger could try.";
        busy = false;
      };
      sendBox.append(b);
    });
    root.append(p, listBox, sendBox, stage, log, el("div", "sim-label", "Goals"), goals);
  }

  /* ---------- address: decode any address ---------- */
  function address(root) {
    const cfg = cfgOf(root);
    root.replaceChildren();
    root.append(el("div", "sim-h", "Tool · address checker"));
    root.append(el("p", "sim-p", "Type any address, with or without a port, and see what each part means."));
    const f = el("form", "sim-row"); const inp = el("input", "sim-input"); inp.value = cfg.start || "203.0.113.84:8211";
    inp.setAttribute("aria-label", "Address to check"); const b = btn("Check"); b.type = "submit";
    f.append(inp, b);
    const chips = el("div", "sim-row"); chips.append(el("span", "sim-label", "Try:"));
    (cfg.examples || ["203.0.113.84:8211", "10.0.0.84", "192.168.1.15:3389", "127.0.0.1:8797", "172.18.0.2:8211", "8.8.8.8:53", "192.168.1.300"]).forEach(x => {
      const c = btn(x, "sim-chip"); c.onclick = () => { inp.value = x; show(); }; chips.append(c);
    });
    const out = el("div", "addr-out"); out.setAttribute("aria-live", "polite");
    function kind(o) {
      const [a, b2] = o;
      if (a === 10) return ["private", "Private: the 10.x range. Only works inside one network (like your server’s 10.0.0.84)."];
      if (a === 172 && b2 >= 16 && b2 <= 31) return ["private", "Private: the 172.16–31.x range (Docker uses this inside your server)."];
      if (a === 192 && b2 === 168) return ["private", "Private: the 192.168.x range, used by almost every home Wi-Fi router."];
      if (a === 127) return ["special", "Localhost: “this computer itself”. Only reachable from inside the same machine."];
      if (a === 0) return ["special", "0.0.0.0: in a listener list it means “every address this machine has”."];
      if (a === 100 && b2 >= 64 && b2 <= 127) return ["special", "Shared range (100.64–127.x): Tailscale uses it for your private device network."];
      return ["public", "Public: reachable from anywhere on the internet."];
    }
    function show() {
      out.replaceChildren();
      const v = inp.value.trim(); const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/);
      if (!m) { out.append(el("p", "addr-bad", "That doesn’t look like an IP address. It should be four numbers with dots, like 10.0.0.84, optionally followed by :port.")); return; }
      const o = m.slice(1, 5).map(Number), port = m[5];
      const parts = el("div", "addr-parts");
      o.forEach((n, i) => { const s = el("span", "addr-num" + (n > 255 ? " addr-badnum" : ""), String(n)); parts.append(s); if (i < 3) parts.append(el("span", "addr-dot", ".")); });
      if (port) { parts.append(el("span", "addr-dot", ":"), el("span", "addr-port", port)); }
      out.append(parts);
      const legend = el("div", "addr-legend");
      legend.append(el("span", "addr-key addr-key-ip", "IP address: which computer (the building)"));
      if (port) legend.append(el("span", "addr-key addr-key-port", "port: which program (the unit)"));
      out.append(legend);
      const bad = o.filter(n => n > 255);
      if (bad.length) { out.append(el("p", "addr-bad", `Not a real IP address: ${bad.join(", ")} is bigger than 255. Each of the four numbers must be 0–255.`)); return; }
      const [k, msg] = kind(o);
      out.append(el("p", "addr-kind addr-" + k, msg));
      if (port) {
        const pn = Number(port);
        out.append(el("p", "sim-p", pn > 65535 ? `Port ${port} is impossible: ports go from 0 to 65535.` :
          PORTNAMES[pn] ? `Port ${pn} usually means: ${PORTNAMES[pn]}.` : `Port ${pn}: not one of the well-known ones in this course. It’s whatever program the owner set up.`));
      }
    }
    f.onsubmit = e => { e.preventDefault(); show(); };
    root.append(f, chips, out); show();
  }

  /* ---------- protocol: TCP vs UDP race ---------- */
  function protocol(root) {
    root.replaceChildren();
    root.append(el("div", "sim-h", "Simulator · TCP vs UDP race"));
    root.append(el("p", "sim-p", "Send the same 10 packets both ways over a bad connection where some get lost. Watch what each protocol does about it."));
    const ctl = el("div", "sim-row"); const go = btn("Send 10 packets");
    const lossLab = el("label", "sim-label"); const loss = el("select");
    [["Good Wi-Fi (5% lost)", 0.05], ["Weak signal (25% lost)", 0.25], ["Terrible (45% lost)", 0.45]].forEach(([t, v], i) => {
      const o = el("option", null, t); o.value = v; if (i === 1) o.selected = true; loss.append(o); });
    lossLab.append("Connection: ", loss); ctl.append(go, lossLab);
    const lanes = el("div", "proto-lanes");
    function lane(name, desc) {
      const row = el("div", "proto-lane"); const h = el("div", "proto-name"); h.append(el("b", null, name), el("span", null, desc));
      const cells = el("div", "proto-cells"); const cs = [];
      for (let i = 0; i < 10; i++) { const c = el("span", "proto-cell", String(i + 1)); cs.push(c); cells.append(c); }
      const stat = el("div", "proto-stat", "waiting…"); row.append(h, cells, stat); lanes.append(row); return { cs, stat };
    }
    const T = lane("TCP", "registered courier"), U = lane("UDP", "shouting updates");
    const legend = el("div", "proto-legend"); legend.innerHTML = '<span class="proto-cell ok">✓</span> arrived <span class="proto-cell lost">✗</span> lost <span class="proto-cell resent">↻</span> lost, then resent';
    const verdict = el("p", "sim-log"); verdict.setAttribute("aria-live", "polite");
    root.append(ctl, lanes, legend, verdict);
    let running = false;
    go.onclick = async () => {
      if (running) return; running = true; verdict.textContent = "";
      const p = Number(loss.value);
      const lost = Array.from({ length: 10 }, () => Math.random() < p);
      [T, U].forEach(L => { L.cs.forEach(c => c.className = "proto-cell"); L.stat.textContent = "sending…"; });
      let tt = 0, ut = 0, resends = 0, ugot = 0;
      for (let i = 0; i < 10; i++) {
        // UDP: one shot
        ut += 1; U.cs[i].className = "proto-cell " + (lost[i] ? "lost" : "ok"); if (!lost[i]) ugot++;
        // TCP: wait for "got it"; if lost, wait for timeout then resend (may be lost again)
        tt += 1; let tries = lost[i];
        T.cs[i].className = "proto-cell " + (lost[i] ? "lost" : "ok");
        while (tries) { await wait(260); tt += 3; resends++; tries = Math.random() < p; }
        if (lost[i]) T.cs[i].className = "proto-cell resent";
        T.stat.textContent = `${i + 1}/10 delivered · ${tt} time units`; U.stat.textContent = `${ugot}/${i + 1} arrived · ${ut} time units`;
        await wait(200);
      }
      T.stat.textContent = `10/10 delivered, in order · ${tt} time units (${resends} resend${resends === 1 ? "" : "s"})`;
      U.stat.textContent = `${ugot}/10 arrived · ${ut} time units · lost ones never come back`;
      verdict.textContent = resends
        ? `TCP got everything, but every lost packet cost a wait-and-resend, so it took ${tt - ut} extra time units. UDP finished at once but skipped ${10 - ugot}. For a game that’s fine: the next position update replaces a lost one. For an SSH command it would be a disaster. Run it again: the losses are random.`
        : "No packets were lost this time, so both arrived the same. Try a worse connection.";
      running = false;
    };
  }

  /* ---------- explain: clickable annotated lines ---------- */
  function explain(root) {
    const cfg = cfgOf(root);
    root.replaceChildren();
    root.append(el("div", "sim-h", cfg.title || "Explorer · click any line"));
    if (cfg.intro) root.append(el("p", "sim-p", cfg.intro));
    const wrap = el("div", "explain-wrap"); const code = el("div", "explain-code"); const note = el("div", "explain-note");
    note.setAttribute("aria-live", "polite");
    note.textContent = "← Click a highlighted line to see what it means.";
    const seen = new Set(); const total = cfg.lines.filter(l => l.note).length;
    const count = el("div", "sim-label");
    function paintCount() { count.textContent = `${seen.size} of ${total} lines explored`; }
    cfg.lines.forEach((l, i) => {
      const row = l.note ? el("button", "explain-line has-note", l.code || " ") : el("div", "explain-line", l.code || " ");
      if (l.note) { row.type = "button";
        row.onclick = () => { code.querySelectorAll(".sel").forEach(x => x.classList.remove("sel")); row.classList.add("sel", "seen");
          note.replaceChildren(el("code", null, l.code.trim()), el("p", null, l.note)); seen.add(i); paintCount(); }; }
      code.append(row);
    });
    wrap.append(code, note); root.append(wrap, count); paintCount();
  }

  /* ---------- journey: five checkpoints ---------- */
  const CHECKS = [
    { name: "The road", sub: "server on + receptionist", how: "Test-NetConnection 203.0.113.84 -Port 22 -InformationLevel Quiet",
      good: "True", bad: "False\n(Oracle website › Instances › State: STOPPED)", why: "The server is switched off, so nothing behind it exists." },
    { name: "Village gate guard", sub: "Oracle security list", how: "Oracle website › Default Security List › Ingress rules",
      good: "TCP 22 from 0.0.0.0/0\nUDP 8211 from 0.0.0.0/0", bad: "TCP 22 from 0.0.0.0/0\n(no UDP 8211 rule!)", why: "Oracle’s firewall no longer allows UDP 8211." },
    { name: "Lobby guard", sub: "iptables on the server", how: "sudo iptables -L INPUT -n --line-numbers",
      good: "5  ACCEPT tcp dpt:22\n6  ACCEPT udp dpt:8211\n7  REJECT all", bad: "5  ACCEPT tcp dpt:22\n6  REJECT all\n(no 8211 rule above the REJECT)", why: "The server’s own firewall rejects port 8211." },
    { name: "Forwarding desk", sub: "Docker port mapping", how: "sudo docker port palworld",
      good: "8211/udp -> 0.0.0.0:8211", bad: "(no output at all)", why: "No port is mapped into the container." },
    { name: "Someone home", sub: "Palworld running", how: "sudo docker ps",
      good: "palworld   Up 3 hours (healthy)", bad: "palworld   Restarting (1) 12 seconds ago", why: "Palworld keeps crashing, so nobody answers." },
  ];
  const TICKETS = [
    "“Nobody can get in since this morning!”, from a friend on Discord.",
    "“The server list says Palhaven but joining just times out.”",
    "“Was playing fine, then got kicked and can’t rejoin.”",
    "“It worked yesterday. Did you change something?”",
  ];
  function journey(root) {
    root.replaceChildren();
    root.append(el("div", "sim-h", "Simulator · the five checkpoints"));
    const tabs = el("div", "sim-row"); const t1 = btn("Free play", "sim-tab on"), t2 = btn("Mystery ticket", "sim-tab");
    tabs.append(t1, t2);
    const area = el("div"); root.append(tabs, area);
    t1.onclick = () => { t1.classList.add("on"); t2.classList.remove("on"); free(); };
    t2.onclick = () => { t2.classList.add("on"); t1.classList.remove("on"); mystery(); };

    function track(states, onCheck) {
      const ol = el("ol", "jr-track");
      const items = CHECKS.map((c, i) => {
        const li = el("li", "jr-step"); const n = el("span", "jr-num", String(i + 1));
        const t = el("div", "jr-txt"); t.append(el("b", null, c.name), el("span", null, c.sub));
        li.append(n, t);
        if (states) { const lab = el("label", "jr-toggle"); const cb = el("input"); cb.type = "checkbox"; cb.checked = states[i];
          cb.onchange = () => { states[i] = cb.checked; li.classList.toggle("broken", !cb.checked); };
          lab.append(cb, document.createTextNode(" working")); li.append(lab); li.classList.toggle("broken", !states[i]); }
        if (onCheck) { const b = btn("Check", "sim-btn small"); b.onclick = () => onCheck(i, li, b); li.append(b); }
        ol.append(li); return li;
      });
      return { ol, items };
    }

    function free() {
      area.replaceChildren();
      const states = CHECKS.map(() => true);
      area.append(el("p", "sim-p", "Untick a checkpoint to break it, then send a packet and watch where it stops."));
      const { ol, items } = track(states);
      const go = btn("Send a Palworld packet"); const log = el("p", "sim-log"); log.setAttribute("aria-live", "polite");
      let busy = false;
      go.onclick = async () => {
        if (busy) return; busy = true; log.textContent = "";
        items.forEach(li => li.classList.remove("pass", "stop"));
        for (let i = 0; i < CHECKS.length; i++) {
          await wait(380);
          if (!states[i]) { items[i].classList.add("stop"); log.textContent = `Stopped at checkpoint ${i + 1} (${CHECKS[i].name}): ${CHECKS[i].why} Checkpoints after it never even see the packet.`; busy = false; return; }
          items[i].classList.add("pass");
        }
        log.textContent = "The packet made it all the way: Palworld answered. Your friend is in!"; busy = false;
      };
      area.append(ol, go, log);
    }

    function mystery() {
      area.replaceChildren();
      const broken = Math.floor(Math.random() * CHECKS.length);
      const ticket = TICKETS[Math.floor(Math.random() * TICKETS.length)];
      const tk = el("div", "jr-ticket"); tk.append(el("b", null, "Ticket: "), document.createTextNode(ticket));
      area.append(tk, el("p", "sim-p", "One checkpoint is broken. Click Check to run that checkpoint’s test (each check is one step), then name the culprit. Pros go outside-in."));
      const outBox = el("pre", "jr-out", "(test output appears here)");
      let steps = 0; const checked = new Set();
      const { ol } = track(null, (i, li) => {
        steps += checked.has(i) ? 0 : 1; checked.add(i);
        const c = CHECKS[i], bad = i === broken;
        outBox.textContent = `$ ${c.how}\n${bad ? c.bad : c.good}`;
        li.classList.add(bad ? "stop" : "pass");
      });
      const pick = el("div", "sim-row"); pick.append(el("span", "sim-label", "The broken one is:"));
      const log = el("p", "sim-log"); log.setAttribute("aria-live", "polite");
      CHECKS.forEach((c, i) => { const b = btn(String(i + 1), "sim-chip"); b.onclick = () => {
        if (i !== broken) { log.textContent = `Not checkpoint ${i + 1}. Run more checks: a guess without evidence is how outages drag on.`; return; }
        const best = broken + 1;
        log.textContent = `Correct: checkpoint ${i + 1}, ${c.name}. ${c.why} You used ${steps} check${steps === 1 ? "" : "s"}; outside-in needs ${best}. ${steps <= best ? "Textbook troubleshooting!" : "Tip: start at 1 and stop at the first failure."}`;
        pick.querySelectorAll("button").forEach(x => x.disabled = true);
        const again = btn("New ticket"); again.onclick = mystery; log.append(" ", again);
      }; pick.append(b); });
      area.append(ol, outBox, pick, log);
    }
    free();
  }

  /* ---------- builder: fill-in form that assembles text ---------- */
  function builder(root) {
    const cfg = cfgOf(root); const key = "serverlab.builder." + (root.dataset.id || cfg.id || "x");
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}
    root.replaceChildren();
    root.append(el("div", "sim-h", cfg.title || "Builder"));
    if (cfg.intro) root.append(el("p", "sim-p", cfg.intro));
    const form = el("div", "bld-form"); const vals = {};
    cfg.fields.forEach(f => {
      const lab = el("label", "bld-field"); lab.append(el("span", "sim-label", f.label));
      const ta = el("textarea"); ta.rows = f.rows || 2; ta.placeholder = f.placeholder || ""; ta.value = saved[f.id] != null ? saved[f.id] : (f.value || "");
      vals[f.id] = ta; ta.oninput = render; lab.append(ta); form.append(lab);
    });
    const outH = el("div", "sim-label", "Your text (updates as you type, saved in this browser)");
    const out = el("pre", "bld-out");
    const row = el("div", "sim-row"); const copy = btn("Copy text"); const st = el("span", "sim-label");
    copy.onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); st.textContent = "Copied!"; } catch (e) { st.textContent = "Select the text above and copy it."; } };
    row.append(copy, st);
    function render() {
      const data = {}; Object.entries(vals).forEach(([k, ta]) => data[k] = ta.value.trim());
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
      out.textContent = cfg.template.replace(/\{(\w+)\}/g, (_, k) => data[k] || `[${(cfg.fields.find(f => f.id === k) || {}).label || k}]`);
    }
    root.append(form, outH, out, row); render();
  }

  const SIMS = { guard, address, protocol, explain, journey, builder };
  document.querySelectorAll(".sim[data-sim]").forEach(r => { const f = SIMS[r.dataset.sim]; if (f) f(r); });
})();
