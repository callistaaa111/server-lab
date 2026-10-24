/* Part 2 simulators for Server Lab (Lessons 10–20). Mount with <div class="sim" data-sim2="NAME"></div>.
   Load after lab.js (uses Lab.award / Lab.addMax for XP).
     subnet    : type any IP/prefix, see the street (Lesson 10)
     vlsm      : plan subnets for groups, biggest first, optional spare % (Lessons 10, 19)
     dora      : step through DHCP Discover/Offer/Request/Ack, or a dead DHCP server (Lesson 11)
     vlan      : six PCs on one switch, assign VLANs, run the ping matrix (Lesson 12)
     poe       : PoE budget for cameras, APs and phones (Lesson 12)
     routing   : router-on-a-stick + static routes; find the missing config (Lesson 13)
     power     : A/B power chain; fail parts and see what stays up (Lesson 14)
     ticket    : write timeline lines and get them checked (Lesson 15)
     terraform : plan / apply / drift / destroy on a pretend AWS account (Lesson 17)
     health    : run healthcheck.sh against a pretend server (Lesson 18)
     design    : capstone design checker: ports, PoE, UPS (Lesson 19)
     callbacks : application funnel diagnosis (Lesson 20) */
(function () {
  const L = window.Lab || { award() {}, addMax() {}, had() { return false; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, cls) => { const b = el("button", cls || "sim-btn", label); b.type = "button"; return b; };
  const head = (root, h, p) => { root.replaceChildren(el("div", "sim-h", h)); if (p) root.append(el("p", "sim-p", p)); };
  const goalsList = (root, goals, id) => {
    const ul = el("ul", "sim-goals"); root.append(ul);
    const lis = goals.map((g, i) => { const li = el("li", L.had(`${id}:g${i}`) ? "done" : "", g); ul.append(li); return li; });
    L.addMax(goals.length * 10);
    return i => { if (!lis[i].classList.contains("done")) { lis[i].classList.add("done"); L.award(`${id}:g${i}`, 10, "goal done"); } };
  };
  const field = (label, input) => { const f = el("label", "s2-field"); f.append(label, input); return f; };
  const num = (v, min, max, step) => { const i = el("input"); i.type = "number"; i.value = v; if (min != null) i.min = min; if (max != null) i.max = max; if (step) i.step = step; return i; };

  /* ---------- IPv4 helpers ---------- */
  const ip2n = s => { const p = String(s).trim().split("."); if (p.length !== 4) return null; let n = 0; for (const x of p) { if (!/^\d{1,3}$/.test(x) || +x > 255) return null; n = n * 256 + +x; } return n >>> 0; };
  const n2ip = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const maskOf = p => p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  function street(ip, p) {
    const m = maskOf(p), net = (ip & m) >>> 0, bc = (net | (~m >>> 0)) >>> 0, size = 2 ** (32 - p);
    return { net, bc, m, size, first: p >= 31 ? net : net + 1, last: p >= 31 ? bc : bc - 1, hosts: p >= 31 ? (p === 31 ? 2 : 1) : size - 2 };
  }

  /* ---------- subnet explorer ---------- */
  function subnet(root) {
    head(root, "Explorer · which street is this address on?", "Type an address with a slash number, like 192.168.10.100/26. The tool shows the street, the two reserved addresses, and the bits.");
    const inp = el("input", "sim-input"); inp.value = "10.0.0.84/24"; inp.setAttribute("aria-label", "Address with prefix"); inp.spellcheck = false;
    const row = el("div", "sim-row"); row.append(inp); root.append(row);
    const out = el("div", "s2-grid"); root.append(out);
    const done = goalsList(root, ["Find the street of 192.168.10.100/26", "Look at a /30, the tiny router-to-router street", "Check the camera from Lesson 10's break/fix: 10.20.0.191/26"], "subnet");
    function paint() {
      const m = inp.value.trim().match(/^([\d.]+)\s*\/\s*(\d{1,2})$/);
      const ip = m && ip2n(m[1]), p = m && +m[2];
      if (!m || ip === null || p > 32) { out.replaceChildren(el("p", "lab-bad", "Type it like 10.20.0.150/26: four numbers 0–255, a slash, and a prefix 0–32.")); return; }
      const s = street(ip, p);
      const a = el("div", "s2-panel"), b = el("div", "s2-panel");
      a.append(el("div", "s2-big", `${n2ip(s.net)}/${p}`));
      const dl = el("dl", "s2-kv");
      const kv = (k, v) => dl.append(el("dt", null, k), el("dd", null, v));
      kv("Subnet mask", n2ip(s.m)); kv("Block size", String(s.size)); kv("Network (street name)", n2ip(s.net));
      kv("First usable", n2ip(s.first)); kv("Last usable", n2ip(s.last)); kv("Broadcast", n2ip(s.bc));
      kv("Usable hosts", s.hosts.toLocaleString()); if (p >= 16 && p <= 28) kv("AWS usable (5 reserved)", (s.size - 5).toLocaleString());
      a.append(dl);
      let verdict = "";
      if (p < 31 && ip === s.net) verdict = "This is the NETWORK address: the street's name. No device may use it.";
      else if (p < 31 && ip === s.bc) verdict = "This is the BROADCAST address: “everyone on this street”. No device may use it.";
      else verdict = `${n2ip(ip)} is a normal house on this street. Its gateway would usually be ${n2ip(s.first)}.`;
      a.append(el("p", ip === s.net || ip === s.bc ? "lab-bad" : "lab-ok", verdict));
      b.append(el("div", "sim-label", "The 32 bits: street part highlighted, house part grey"));
      const bits = el("div", "s2-bits");
      for (let i = 31; i >= 0; i--) { const sp = el("span", 31 - i < p ? "n" : "h", String((ip >>> i) & 1)); bits.append(sp); if (i % 8 === 0 && i) bits.append(document.createTextNode(" . ")); }
      b.append(bits, el("p", "small", `${p} street bits, ${32 - p} house bits → 2^${32 - p} = ${s.size.toLocaleString()} addresses.`));
      out.replaceChildren(a, b);
      if (n2ip(s.net) === "192.168.10.64" && p === 26) done(0);
      if (p === 30) done(1);
      if (ip === ip2n("10.20.0.191") && p === 26) done(2);
    }
    inp.addEventListener("input", paint); paint();
  }

  /* ---------- VLSM planner ---------- */
  function vlsm(root) {
    const cfg = (() => { const s = root.querySelector("script"); return s ? JSON.parse(s.textContent) : {}; })();
    const id = root.dataset.id || "vlsm";
    head(root, "Planner · cut a block into streets, biggest first", cfg.intro || "Change the device counts. The planner gives the biggest group its street first, then the next, and checks it all fits.");
    const base = el("input", "sim-input"); base.value = cfg.base || "10.20.0.0/24"; base.setAttribute("aria-label", "Address block");
    const spare = num(cfg.spare ?? 0, 0, 200, 5);
    const top = el("div", "s2-fields"); top.append(field("Address block", base), field("Spare % to add", spare)); root.append(top);
    const groups = (cfg.groups || [["Staff PCs", 100], ["Guest Wi-Fi", 50], ["CCTV", 40]]).map(([n, c]) => ({ n, c }));
    const gbox = el("div", "s2-fields"); root.append(gbox);
    const inputs = groups.map(g => { const i = num(g.c, 1, 100000); gbox.append(field(g.n, i)); i.addEventListener("input", paint); return i; });
    const out = el("div", "table-wrap"); root.append(out);
    const msg = el("p", "sim-log"); root.append(msg);
    if (cfg.goal) L.addMax(15);
    function paint() {
      const m = base.value.trim().match(/^([\d.]+)\/(\d{1,2})$/), ip = m && ip2n(m[1]);
      if (!m || ip === null) { msg.replaceChildren(el("span", "lab-bad", "Type the block like 10.20.0.0/24.")); out.replaceChildren(); return; }
      const bp = +m[2], b = street(ip, bp), sp = Math.max(0, +spare.value || 0) / 100;
      const need = groups.map((g, i) => { const c = Math.max(1, +inputs[i].value || 1), want = Math.ceil(c * (1 + sp)); let p = 30; while (p > 0 && 2 ** (32 - p) - 2 < want) p--; return { n: g.n, c, want, p }; });
      const order = need.map((x, i) => i).sort((a, z) => need[a].p - need[z].p || need[z].c - need[a].c);
      let at = b.net, fits = true; const rows = [];
      order.forEach(i => { const x = need[i], size = 2 ** (32 - x.p); if (at % size) at = Math.ceil(at / size) * size; const s = street(at, x.p); if (s.bc > b.bc || s.net < b.net) fits = false; rows.push({ ...x, s }); at = s.bc + 1; });
      const t = el("table", "s2-table"); t.innerHTML = "<thead><tr><th>Group</th><th>Needs</th><th>Street</th><th>Usable</th><th>Gateway</th><th>Broadcast</th></tr></thead>";
      const tb = el("tbody");
      rows.forEach(r => { const tr = el("tr", r.s.bc > b.bc ? "fail" : "");
        [r.n, `${r.c}${sp ? ` → ${r.want}` : ""}`, `${n2ip(r.s.net)}/${r.p}`, `${n2ip(r.s.first)} – ${n2ip(r.s.last)} (${r.s.hosts})`, n2ip(r.s.first), n2ip(r.s.bc)].forEach(v => tr.append(el("td", null, v))); tb.append(tr); });
      t.append(tb); out.replaceChildren(t);
      const used = rows.reduce((a, r) => a + r.s.size, 0);
      msg.replaceChildren(el("b", fits ? "lab-ok" : "lab-bad", fits ? `Fits: ${used} of ${b.size} addresses used.` : `Does not fit: needs ${used} addresses, the block has ${b.size}. Use a bigger block (smaller slash number) or smaller groups.`));
      if (cfg.goal && fits && sp >= 0.25 && rows.length >= 4) L.award(`${id}:goal`, 15, "IP plan fits with spare");
    }
    [base, spare].forEach(i => i.addEventListener("input", paint)); paint();
  }

  /* ---------- DORA ---------- */
  function dora(root) {
    head(root, "Animation · watch a laptop get its address", "Press Next to walk through each message. Then turn the DHCP server off and try again.");
    const row = el("div", "sim-row"); const next = btn("Next message"), again = btn("Start over", "sim-chip");
    const lab = el("label", "sim-check"); const off = el("input"); off.type = "checkbox"; lab.append(off, document.createTextNode(" DHCP server is down"));
    row.append(next, again, lab); root.append(row);
    const stage = el("div", "guard-stage"); const cells = ["Laptop", "Network", "DHCP server (router)"].map(t => { const c = el("div", "guard-cell", t); stage.append(c); return c; });
    root.append(stage); const log = el("pre", "s2-log"); root.append(log);
    const done = goalsList(root, ["Watch all four DORA messages", "Turn the server off and see what the laptop does"], "dora");
    const OK = [["D", "Discover", "Laptop shouts to everyone (broadcast): “Is there a leasing office?”", 0], ["O", "Offer", "Server: “You can have 192.168.1.23 for 24 hours.”", 2],
      ["R", "Request", "Laptop: “Yes please, I'll take 192.168.1.23.”", 0], ["A", "Acknowledge", "Server: “Confirmed. Mask 255.255.255.0, gateway 192.168.1.1, DNS 192.168.1.1.”", 2]];
    let step = 0;
    function reset() { step = 0; cells.forEach(c => c.className = "guard-cell"); log.textContent = "ipconfig: no address yet"; next.disabled = false; }
    next.onclick = () => {
      cells.forEach(c => c.className = "guard-cell");
      if (off.checked) {
        if (step < 3) { cells[0].classList.add("on"); cells[1].classList.add("on"); cells[2].classList.add("bad"); log.textContent += `\nDiscover #${step + 1} → … no answer`; step++; return; }
        cells[0].classList.add("bad"); log.textContent += "\nNo offer after 3 tries. Windows gives itself 169.254.71.12 (APIPA).\nipconfig: IPv4 169.254.71.12 · no gateway · can't reach anything off this cable";
        next.disabled = true; done(1); return;
      }
      const [k, name, text, who] = OK[step]; cells[who].classList.add("on"); cells[1].classList.add("on");
      log.textContent += `\n${k} · ${name}: ${text}`; step++;
      if (step === 4) { cells[0].classList.add("ok"); log.textContent += "\nipconfig: IPv4 192.168.1.23 · mask 255.255.255.0 · gateway 192.168.1.1 · DNS 192.168.1.1"; next.disabled = true; done(0); }
    };
    again.onclick = reset; off.onchange = reset; reset();
  }

  /* ---------- VLAN switch ---------- */
  function vlan(root) {
    head(root, "Simulator · put locked doors in the hallway", "Six PCs share one switch and one test street (192.168.1.1–.6). Pick a VLAN for each port, then run the ping matrix. Same VLAN = same hallway.");
    const want = [10, 10, 20, 20, 30, 30], names = ["PC1 staff", "PC2 staff", "PC3 CCTV", "PC4 CCTV", "PC5 guest", "PC6 guest"];
    const vl = [1, 1, 1, 1, 1, 1];
    const grid = el("div", "s2-fields"); root.append(grid);
    const sels = vl.map((v, i) => { const s = el("select"); [[1, "VLAN 1 (default)"], [10, "VLAN 10 STAFF"], [20, "VLAN 20 CCTV"], [30, "VLAN 30 GUEST"]].forEach(([n, t]) => { const o = el("option", null, t); o.value = n; s.append(o); });
      s.value = v; s.onchange = () => { vl[i] = +s.value; }; grid.append(field(`Fa0/${i + 1} · ${names[i]}`, s)); return s; });
    const row = el("div", "sim-row"); const run = btn("Run the ping matrix"); row.append(run); root.append(row);
    const out = el("div", "table-wrap"); root.append(out);
    const done = goalsList(root, ["Ping with every port still in VLAN 1: everyone reaches everyone", "Match the Lesson 12 design so all six checks pass"], "vlan");
    const tests = [[0, 1, true], [0, 2, false], [0, 4, false], [2, 3, true], [4, 5, true], [4, 2, false]];
    run.onclick = () => {
      const t = el("table", "s2-table"); t.innerHTML = "<thead><tr><th>From → To</th><th>Design says</th><th>Result</th></tr></thead>"; const tb = el("tbody"); let pass = 0;
      tests.forEach(([a, b, exp]) => { const ok = vl[a] === vl[b], good = ok === exp; if (good) pass++;
        const tr = el("tr", good ? "pass" : "fail"); [`${names[a]} → ${names[b]}`, exp ? "success" : "fails", (ok ? "success" : "fails") + (good ? " ✓" : " ✗")].forEach(v => tr.append(el("td", null, v))); tb.append(tr); });
      t.append(tb); out.replaceChildren(t, el("p", pass === 6 ? "lab-ok" : "lab-bad", pass === 6 ? "6/6. This is what show vlan brief should match in Packet Tracer." : `${pass}/6 match the design.`));
      if (vl.every(v => v === 1)) done(0);
      if (vl.every((v, i) => v === want[i])) done(1);
    };
  }

  /* ---------- PoE budget ---------- */
  function poe(root) {
    head(root, "Calculator · PoE budget", "Add up the loads, compare with the switch's PoE budget, keep at least 20% headroom.");
    const types = [["Cameras (7 W)", 7, 30], ["Wi-Fi APs (25.5 W)", 25.5, 8], ["IP phones (6.5 W)", 6.5, 0]];
    const f = el("div", "s2-fields"); root.append(f);
    const ins = types.map(([t, w, c]) => { const i = num(c, 0, 500); f.append(field(t, i)); i.addEventListener("input", paint); return i; });
    const bud = el("select"); [185, 370, 740].forEach(w => { const o = el("option", null, `${w} W switch`); o.value = w; bud.append(o); }); bud.value = 370; bud.onchange = paint; f.append(field("Switch PoE budget", bud));
    const out = el("div", "s2-panel"); root.append(out);
    const done = goalsList(root, ["30 cameras + 8 APs: pick a switch that stays at or under 80%"], "poe");
    function paint() {
      const load = types.reduce((a, [, w], i) => a + w * (+ins[i].value || 0), 0), b = +bud.value, pct = load / b * 100;
      const mt = el("div", "s2-meter"); const bar = el("i", pct > 100 ? "over" : pct > 80 ? "warn" : ""); bar.style.width = Math.min(100, pct) + "%"; mt.append(bar);
      out.replaceChildren(el("div", "s2-big", `${load.toFixed(1)} W of ${b} W · ${pct.toFixed(0)}%`), mt,
        el("p", pct > 100 ? "lab-bad" : pct > 80 ? "lab-bad" : "lab-ok", pct > 100 ? "Over budget: some devices won't power on." : pct > 80 ? "Fits, but under 20% headroom. Pick a bigger budget or a second switch." : "Comfortable: 20% or more headroom."),
        el("p", "small", "APs at 25.5 W need PoE+ (802.3at, 30 W per port). 802.3af gives only 15.4 W per port."));
      if (+ins[0].value === 30 && +ins[1].value === 8 && pct <= 80) done(0);
    }
    paint();
  }

  /* ---------- routing ---------- */
  function routing(root) {
    head(root, "Simulator · the junction with signposts", "Your Lesson 13 lab as switches. Each mission secretly removes one piece of config. Ping and tracert to find which, then fix it.");
    const PARTS = [["trunk", "SW1 g0/1 is a trunk"], ["subif", "R1 sub-interfaces g0/0.10/.20/.30"], ["r1", "R1: ip route 10.30.0.0/24 → 172.16.0.2"], ["r2", "R2: ip route 10.20.0.0/24 → 172.16.0.1 (return)"], ["gw", "Server gateway = 10.30.0.1"]];
    const st = { trunk: true, subif: true, r1: true, r2: true, gw: true };
    const MISSIONS = [["Mission A · “Staff can't reach the CCTV recorder, or anything else off their street.”", "trunk"], ["Mission B · “Staff can reach R2 at 172.16.0.2 but not the server.”", "gw"], ["Mission C · “Staff can't reach R2 or the server, but PC1 → PC3 works.”", "r2"]];
    let mi = 0;
    const tabs = el("div", "sim-row"); root.append(tabs);
    const brief = el("p", "callout"); root.append(brief);
    const cfgBox = el("div", "sim-row"); root.append(cfgBox);
    const prow = el("div", "sim-row"); root.append(prow);
    const log = el("pre", "s2-log"); root.append(log);
    L.addMax(MISSIONS.length * 15);
    const cbs = {};
    PARTS.forEach(([k, t]) => { const lab = el("label", "sim-check"); const cb = el("input"); cb.type = "checkbox";
      cb.onchange = () => { st[k] = cb.checked; log.textContent = cb.checked ? `Configured: ${t}. Ping again to prove it.` : `Removed: ${t}. Tick it again to put it back.`; };
      cbs[k] = cb; lab.append(cb, document.createTextNode(" " + t)); cfgBox.append(lab); });
    [["ping 10.20.0.200", "PC1 → PC3 (CCTV)"], ["ping 172.16.0.2", "PC1 → R2"], ["ping 10.30.0.10", "PC1 → server"], ["tracert 10.30.0.10", "PC1 tracert server"]].forEach(([c, t]) => { const b = btn(t, "sim-chip"); b.onclick = () => run(c); prow.append(b); });
    function load(i) {
      mi = i; PARTS.forEach(([k]) => { st[k] = true; }); st[MISSIONS[i][1]] = false;
      PARTS.forEach(([k]) => { cbs[k].checked = true; }); // the learner doesn't see which one is off until they find it
      brief.textContent = MISSIONS[i][0] + " The ticks show what the config SHOULD have, but one line is secretly missing. Ping to narrow it down, then untick and re-tick your suspect to configure it again.";
      log.textContent = "C:\\> (send a ping)"; paintTabs();
    }
    function paintTabs() { tabs.replaceChildren(...MISSIONS.map((m, i) => { const b = btn(`Mission ${"ABC"[i]}${L.had(`routing:m${i}`) ? " ✓" : ""}`, "sim-tab" + (i === mi ? " on" : "")); b.onclick = () => load(i); return b; })); }
    function run(cmd) {
      const lanOK = st.trunk && st.subif, lines = [`C:\\> ${cmd}`];
      const reach = dst => {
        if (!lanOK) return { ok: false, why: "Request timed out. (PC1 can't even reach its gateway 10.20.0.1.)" };
        if (dst === "cctv") return { ok: true };
        if (dst === "r2") return st.r2 ? { ok: true } : { ok: false, why: "Request timed out. (R2 got it, but has no route back to 10.20.0.0/24.)" };
        if (!st.r1) return { ok: false, why: "Reply from 10.20.0.1: Destination host unreachable. (R1 has no signpost to 10.30.0.0/24.)" };
        if (!st.r2) return { ok: false, why: "Request timed out. (Reply can't get home: R2 has no return route.)" };
        if (!st.gw) return { ok: false, why: "Request timed out. (The server can't send replies off its own street: no gateway.)" };
        return { ok: true };
      };
      if (cmd.startsWith("tracert")) {
        lines.push("  1  " + (lanOK ? "1 ms  10.20.0.1" : "*  Request timed out."));
        if (lanOK) lines.push("  2  " + (st.r1 && st.r2 ? "2 ms  172.16.0.2" : st.r1 ? "*  Request timed out." : "10.20.0.1 reports: Destination host unreachable."));
        if (lanOK && st.r1 && st.r2) lines.push("  3  " + (st.gw ? "3 ms  10.30.0.10\nTrace complete." : "*  Request timed out."));
      } else {
        const dst = cmd.includes("200") ? "cctv" : cmd.includes("172") ? "r2" : "srv", r = reach(dst);
        lines.push(r.ok ? `Reply from ${cmd.split(" ")[1]}: bytes=32 time=2ms TTL=126 (x4)` : r.why);
      }
      log.textContent = lines.join("\n");
      if (!cmd.startsWith("tracert") && cmd.includes("10.30.0.10") && st[MISSIONS[mi][1]] && reach("srv").ok && reach("r2").ok && reach("cctv").ok) {
        if (L.award(`routing:m${mi}`, 15, "network fixed")) paintTabs();
        log.textContent += "\n\nAll paths work. Mission solved.";
      }
    }
    load(0);
  }

  /* ---------- power chain ---------- */
  function power(root) {
    head(root, "Simulator · break the power chain", "Toggle failures. Dual-corded racks stay up if either feed is alive. The red box is a single-corded device on the A feed only.");
    const F = [["util", "Meralco utility fails"], ["gen", "Generator fails to start"], ["upsA", "UPS-A down for maintenance"], ["pduB", "PDU-B trips"]];
    const st = {}; const row = el("div", "sim-row"); root.append(row);
    F.forEach(([k, t]) => { const lab = el("label", "sim-check"); const cb = el("input"); cb.type = "checkbox"; cb.onchange = () => { st[k] = cb.checked; paint(); }; lab.append(cb, document.createTextNode(" " + t)); row.append(lab); });
    const topo = el("div", "s2-topo"); root.append(topo);
    const log = el("pre", "s2-log"); root.append(log);
    const done = goalsList(root, ["Utility fails: who carries the load?", "UPS-A in maintenance: does anything go off?", "Utility fails AND generator won't start", "PDU-B trips", "Find the scenario that takes the red device down"], "power");
    function paint() {
      const src = !st.util || !st.gen; // utility, or generator once it starts
      const upsA = !st.upsA, upsB = true, a = upsA && true, b = upsB && !st.pduB;
      const battery = st.util && st.gen;
      const live = x => x ? "live" : "dead";
      const N = (x, y, w, t, s, on) => `<g><rect class="node ${on === false ? "off" : on ? "up" : ""}" x="${x}" y="${y}" width="${w}" height="34"/><text x="${x + w / 2}" y="${y + 15}" text-anchor="middle">${t}</text><text class="sub" x="${x + w / 2}" y="${y + 27}" text-anchor="middle">${s}</text></g>`;
      const W = (x1, y1, x2, y2, ok) => `<line class="wire ${live(ok)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      const feedA = a, feedB = b;
      topo.innerHTML = `<svg viewBox="0 0 640 330" role="img" aria-label="Power one-line: utility and generator to ATS, two UPS, two PDUs, three racks and one single-corded device">
        ${W(110, 44, 250, 44, !st.util)}${W(390, 44, 290, 44, !st.gen && st.util)}${W(270, 61, 170, 110, src)}${W(270, 61, 450, 110, src)}
        ${W(170, 144, 170, 180, upsA)}${W(450, 144, 450, 180, upsB)}
        ${W(170, 214, 90, 270, feedA)}${W(170, 214, 250, 270, feedA)}${W(170, 214, 410, 270, feedA)}${W(170, 214, 560, 270, feedA)}
        ${W(450, 214, 110, 270, feedB)}${W(450, 214, 270, 270, feedB)}${W(450, 214, 430, 270, feedB)}
        ${N(20, 27, 90, "Utility", "Meralco", !st.util)}${N(230, 27, 80, "ATS", "transfer switch")}${N(390, 27, 100, "Generator", st.util ? (st.gen ? "won't start" : "running") : "standby", st.util ? !st.gen : undefined)}
        ${N(115, 110, 110, "UPS-A", battery && upsA ? "on battery!" : "A side", upsA)}${N(395, 110, 110, "UPS-B", battery ? "on battery!" : "B side", upsB)}
        ${N(115, 180, 110, "PDU-A", "", feedA)}${N(395, 180, 110, "PDU-B", st.pduB ? "tripped" : "", feedB)}
        ${N(50, 270, 100, "Rack R01", "A + B", feedA || feedB)}${N(210, 270, 100, "Rack R02", "A + B", feedA || feedB)}${N(370, 270, 100, "Rack R03", "A + B", feedA || feedB)}
        <g><rect class="node ${feedA ? "up" : "off"}" x="520" y="270" width="100" height="34" style="stroke:var(--bad);stroke-width:2.5"/><text x="570" y="285" text-anchor="middle">Old switch</text><text class="sub" x="570" y="297" text-anchor="middle">A only · SPOF</text></g>
      </svg>`;
      const lines = [];
      if (!st.util) lines.push("Utility is on. Generator on standby.");
      else if (!st.gen) lines.push("Utility lost → UPS batteries carry the load for seconds → generator starts → ATS switches over. Servers never notice.");
      else lines.push("Utility lost and the generator won't start: both UPS run on battery. You have MINUTES. Follow the EOP: escalate now, prepare a controlled shutdown.");
      if (st.upsA && st.pduB) lines.push("UPS-A down AND PDU-B tripped: A and B are both gone, so every rack is DOWN. Never do maintenance on one side while the other is faulty.");
      else if (st.upsA) lines.push("UPS-A down: every rack runs on its B feed alone, so each B side must carry the FULL load. The red device loses power.");
      else if (st.pduB) lines.push("PDU-B tripped: racks run on their A feed. The red device is on A, so it's fine.");
      log.textContent = lines.join("\n");
      if (st.util && !st.gen && !st.upsA && !st.pduB) done(0);
      if (st.upsA && !st.util && !st.pduB) done(1);
      if (st.util && st.gen) done(2);
      if (st.pduB && !st.upsA) done(3);
      if (!feedA) done(4);
    }
    paint();
  }

  /* ---------- ticket lines ---------- */
  function ticket(root) {
    head(root, "Checker · write a timeline a 3 AM engineer can use", "One line per action. Start each with a 24-hour time (02:14), then what you checked and what you saw. Write at least four.");
    const ta = el("textarea"); ta.rows = 6; ta.style.width = "100%"; ta.setAttribute("aria-label", "Ticket timeline");
    ta.className = "sim-input"; ta.placeholder = "02:10 PRTG alert: ping to CCTV recorder 192.168.1.50 down, acknowledged\n02:12 ..."; root.append(ta);
    const row = el("div", "sim-row"); const go = btn("Check my lines"); row.append(go); root.append(row);
    const out = el("pre", "s2-log"); root.append(out);
    L.addMax(20);
    const vague = /^(checking|fixed|done|ok|server down|down|investigating)\.?$/i;
    go.onclick = () => {
      const lines = ta.value.split(/\n/).map(s => s.trim()).filter(Boolean); let good = 0;
      out.replaceChildren(...lines.map(l => {
        const m = l.match(/^([01]\d|2[0-3]):[0-5]\d\s+(.*)$/), rest = m ? m[2] : "", words = rest.split(/\s+/).filter(Boolean).length;
        const fact = /\d|ping|port|up|down|green|red|reachable|fail|timed|ack|escalat|restor|verif|closed/i.test(rest);
        const why = !m ? "needs a 24-hour time first (like 02:14)" : vague.test(rest) || words < 5 ? "too vague: say what you checked and what you saw" : !fact ? "add the fact you saw (an address, a result, a status)" : "";
        if (!why) good++; const d = el("div", why ? "bad" : "ok", (why ? "✗ " : "✓ ") + l + (why ? `  ← ${why}` : "")); return d;
      }));
      out.append(el("div", good >= 4 ? "ok" : "m", `\n${good} useful line${good === 1 ? "" : "s"}${good >= 4 ? ". That's a ticket someone else can pick up." : ". Aim for at least 4."}`));
      if (good >= 4) L.award("ticket", 20, "ticket written");
    };
  }

  /* ---------- terraform ---------- */
  function terraform(root) {
    head(root, "Simulator · make reality match the drawing", "The file main.tf lists 7 resources. The right panel is your pretend AWS account. Run commands and watch the plan.");
    const RES = ["aws_vpc.lab", "aws_subnet.public", "aws_subnet.private", "aws_internet_gateway.igw", "aws_route_table.public", "aws_route_table_association.public", "aws_security_group.game"];
    const real = new Set(); let inited = false;
    const row = el("div", "sim-row"); root.append(row);
    const g = el("div", "s2-grid"); const term = el("pre", "s2-log"), acct = el("div", "s2-panel"); g.append(term, acct); root.append(g);
    const done = goalsList(root, ["init, then plan: see “7 to add”", "apply it, then plan again: “No changes”", "Drift drill: delete the security group by hand, plan shows 1 to add, apply repairs it", "destroy everything: 7 destroyed"], "tf");
    let drifted = false;
    const say = t => { term.textContent = t; };
    function paintAcct() {
      acct.replaceChildren(el("div", "sim-label", "AWS account (ap-southeast-1)"));
      if (!real.size) acct.append(el("p", "small", "Empty. Bill: $0.00"));
      RES.forEach(r => { if (real.has(r)) { const d = el("div", "lab-row"); d.append(el("code", null, r.split(".")[0].replace("aws_", "")), document.createTextNode(" ")); if (r === "aws_security_group.game") { const x = btn("delete by hand", "sim-btn small"); x.onclick = () => { real.delete(r); drifted = true; paintAcct(); say("(You deleted palhaven-game in the AWS console. Terraform doesn't know yet.)"); }; d.append(x); } acct.append(d); } });
    }
    const cmds = {
      init: () => { inited = true; say("$ terraform init\nInitializing provider plugins...\n- Installing hashicorp/aws v5.x...\nTerraform has been successfully initialized!"); },
      plan: () => { if (!inited) return say("$ terraform plan\nError: Inconsistent dependency lock file. Run \"terraform init\"."); const add = RES.filter(r => !real.has(r));
        say("$ terraform plan\n" + (add.length ? add.map(r => `  + ${r}`).join("\n") + `\n\nPlan: ${add.length} to add, 0 to change, 0 to destroy.` : "No changes. Your infrastructure matches the configuration."));
        if (add.length === 7) done(0); if (!add.length && real.size === 7) done(1); if (drifted && add.length === 1) drifted = "seen"; },
      apply: () => { if (!inited) return say("$ terraform apply\nError: run \"terraform init\" first."); const add = RES.filter(r => !real.has(r)); add.forEach(r => real.add(r));
        say(`$ terraform apply\n  (type yes)\n${add.map(r => `${r}: Creation complete`).join("\n")}\n\nApply complete! Resources: ${add.length} added, 0 changed, 0 destroyed.`); if (drifted === "seen" && add.length === 1) { done(2); drifted = false; } paintAcct(); },
      destroy: () => { if (!inited) return say("$ terraform destroy\nError: run \"terraform init\" first."); const n = real.size; real.clear(); paintAcct();
        say(`$ terraform destroy\n  (type yes)\n\nDestroy complete! Resources: ${n} destroyed.\n$ terraform state list\n(nothing)`); if (n === 7) done(3); }
    };
    Object.keys(cmds).forEach(k => { const b = btn("terraform " + k, "sim-chip"); b.onclick = cmds[k]; row.append(b); });
    say("$ (pick a command)"); paintAcct();
  }

  /* ---------- healthcheck.sh ---------- */
  function health(root) {
    head(root, "Simulator · run healthcheck.sh on a pretend server", "Change the server's state and read what the script prints and which exit code it returns.");
    const f = el("div", "s2-fields"); root.append(f);
    const disk = num(41, 0, 100), mem = num(9800, 0, 24000, 100), age = num(6, 0, 200);
    const cont = el("select"); [["Up 3 hours (healthy)", "h"], ["Up 3 hours (unhealthy)", "u"], ["Up 3 hours (health: starting)", "s"], ["no container running", "n"]].forEach(([t, v]) => { const o = el("option", null, t); o.value = v; cont.append(o); });
    const grepSel = el("select"); [["grep -q '(healthy)'", "b"], ["grep -q healthy  (no brackets)", "n"]].forEach(([t, v]) => { const o = el("option", null, t); o.value = v; grepSel.append(o); });
    f.append(field("Disk used %", disk), field("Memory available (MB)", mem), field("Newest backup age (hours)", age), field("docker ps status", cont), field("Health check line uses", grepSel));
    const row = el("div", "sim-row"); const run = btn("./healthcheck.sh ; echo $?"); row.append(run); root.append(row);
    const out = el("pre", "s2-log"); root.append(out);
    const done = goalsList(root, ["Get four OK lines and exit code 0", "Make the disk check fail (85% or more)", "Catch the trap: an unhealthy container that still prints OK"], "health");
    run.onclick = () => {
      let st = 0; const L2 = [];
      const d = +disk.value; if (d >= 85) { L2.push(`WARN disk ${d}% used`); st = 1; } else L2.push(`OK   disk ${d}% used`);
      const m = +mem.value; if (m < 2048) { L2.push(`WARN only ${m} MB memory available`); st = 1; } else L2.push(`OK   ${m} MB memory available`);
      const s = { h: "Up 3 hours (healthy)", u: "Up 3 hours (unhealthy)", s: "Up 3 hours (health: starting)", n: "" }[cont.value];
      const hit = grepSel.value === "b" ? s.includes("(healthy)") : s.includes("healthy");
      if (hit) L2.push("OK   a container reports healthy"); else { L2.push("WARN no healthy container"); st = 1; }
      if (+age.value <= 25) L2.push("OK   backup newer than 25 h"); else { L2.push("WARN no backup in the last 25 h"); st = 1; }
      out.textContent = `$ ./healthcheck.sh\n${L2.join("\n")}\n$ echo $?\n${st}`;
      if (st === 0 && L2.every(x => x.startsWith("OK"))) done(0);
      if (d >= 85) done(1);
      if (cont.value === "u" && grepSel.value === "n" && hit) { done(2); out.textContent += "\n\nCaught it: \"unhealthy\" contains \"healthy\", so the check lied. That's why the brackets matter."; }
    };
  }

  /* ---------- capstone design checker ---------- */
  function design(root) {
    head(root, "Checker · your floor against the PASS rules", "Starts with the worked example. Put in your own building's numbers. Every row must say PASS.");
    const f = el("div", "s2-fields"); root.append(f); let touched = false;
    const I = { drops: num(40, 0), aps: num(4, 0), apw: num(25.5, 0, 90, 0.5), cams: num(10, 0), camw: num(7, 0, 30, 0.5), sw48: num(1, 0), sw24: num(1, 0), budget: num(370, 0, 2000, 5), run: num(78, 0, 200), eqw: num(1276, 0), ups: num(2000, 0, 20000, 100) };
    [["Data drops", "drops"], ["Wi-Fi APs", "aps"], ["W per AP", "apw"], ["Cameras", "cams"], ["W per camera", "camw"], ["48-port switches", "sw48"], ["24-port switches", "sw24"], ["PoE budget per floor (W)", "budget"], ["Longest cable run (m)", "run"], ["MDF rack equipment (W)", "eqw"], ["UPS size (VA)", "ups"]].forEach(([t, k]) => { f.append(field(t, I[k])); I[k].addEventListener("input", () => { touched = true; paint(); }); });
    const out = el("div", "table-wrap"); root.append(out);
    L.addMax(15);
    function paint() {
      const v = k => +I[k].value || 0, devices = v("drops") + v("aps") + v("cams"), need = Math.ceil(devices * 1.2), have = v("sw48") * 48 + v("sw24") * 24;
      const poeW = v("aps") * v("apw") + v("cams") * v("camw"), poePct = v("budget") ? poeW / v("budget") * 100 : Infinity;
      const va = v("eqw") / 0.9 * 1.25;
      const rows = [["Ports: devices + 20% spare", `${devices} × 1.2 → ${need} needed, ${have} installed`, have >= need],
        ["PoE at or under 80% of budget", `${poeW.toFixed(1)} W of ${v("budget")} W = ${isFinite(poePct) ? poePct.toFixed(0) : "∞"}%`, poePct <= 80],
        ["Longest run within 90 m (TIA-568)", `${v("run")} m`, v("run") <= 90],
        ["UPS covers load ÷ 0.9 PF + 25%", `${v("eqw")} W → ${Math.ceil(va)} VA needed, ${v("ups")} VA chosen`, v("ups") >= va]];
      const t = el("table", "s2-table"); t.innerHTML = "<thead><tr><th>Rule</th><th>Your numbers</th><th>Result</th></tr></thead>"; const tb = el("tbody");
      rows.forEach(([a, b, ok]) => { const tr = el("tr", ok ? "pass" : "fail"); [a, b, ok ? "PASS" : "FAIL"].forEach(x => tr.append(el("td", null, x))); tb.append(tr); });
      t.append(tb); out.replaceChildren(t);
      if (touched && rows.every(r => r[2])) L.award("design", 15, "design passes");
    }
    paint();
  }

  /* ---------- callbacks ---------- */
  function callbacks(root) {
    head(root, "Diagnosis · what is your job search telling you?", "Fill in your application numbers. The rule from Part 4 tells you what to change.");
    const f = el("div", "s2-fields"); root.append(f);
    const I = { apps: num(30, 0), calls: num(2, 0), ints: num(1, 0), offers: num(0, 0) };
    [["Applications sent", "apps"], ["Callbacks", "calls"], ["Interviews", "ints"], ["Offers", "offers"]].forEach(([t, k]) => { f.append(field(t, I[k])); I[k].addEventListener("input", paint); });
    const out = el("div", "s2-panel"); root.append(out);
    function paint() {
      const v = k => +I[k].value || 0, rate = v("apps") ? (v("calls") + v("ints") + v("offers")) / v("apps") * 100 : 0;
      let say;
      if (v("apps") < 30) say = `Keep going: ${30 - v("apps")} more applications before judging. Five a week.`;
      else if (rate < 10) say = "Under 10% callbacks: change the resume headline or the job family. Studying more won't fix this.";
      else if (v("ints") === 0) say = "Callbacks but no interviews: the phone screen is the issue. Practise the 20-second pitch.";
      else if (v("offers") === 0) say = "Interviews but no offers: mock interviews on the 10 questions until 8 are smooth.";
      else say = "You have an offer. Compare it with your target list before you accept.";
      out.replaceChildren(el("div", "s2-big", `Callback rate ${rate.toFixed(0)}%`), el("p", null, say), el("p", "small", "Callback rate = (callbacks + interviews + offers) ÷ applications."));
    }
    paint();
  }

  const S = { subnet, vlsm, dora, vlan, poe, routing, power, ticket, terraform, health, design, callbacks };
  document.querySelectorAll("[data-sim2]").forEach(r => { const f = S[r.dataset.sim2]; if (f) { try { f(r); } catch (e) { r.textContent = "This simulator failed to load: " + e.message; } } });
})();
