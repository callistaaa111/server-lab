/* Margin drawings for wide screens (1280px and up): a rack elevation on the left, the packet's path on the right.
   Loaded by theme.js on every page. Drawn inline so the lines use the page's colour tokens (light and dark) and fonts;
   course.css (.ma*) styles them, and hides them below 1280px and in print. With reduced motion there is no animation. */
(function () {
  if (document.querySelector(".ma")) return;
  const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const blink = (dur, begin) => still ? "" : `<animate attributeName="opacity" values="1;.15;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;
  const T = (x, y, s, cls = "ma-t", anchor = "start") => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;

  /* ---------- left: rack A01, front elevation ---------- */
  function rack() {
    const X0 = 70, X1 = 230, R0 = 82, R1 = 218, TOP = 84, U = 13.5;   // frame, rails, first U, unit height
    const y = i => TOP + i * U;                                         // i = slot from the top (0 = U42)
    const dev = (i, n, inner = "", cls = "ma-dev") => `<rect class="${cls}" x="${R0 + 2}" y="${y(i) + 1}" width="${R1 - R0 - 4}" height="${n * U - 2}" rx="1.5"/>${inner}`;
    const ports = (i, row, count, x0, step, w = 3.2, h = 3.2) => { let s = ""; for (let k = 0; k < count; k++) s += `<rect class="ma-d" x="${x0 + k * step}" y="${y(i) + row}" width="${w}" height="${h}"/>`; return s; };
    const bays = (i, n, count, x0, step, w) => { let s = ""; for (let k = 0; k < count; k++) s += `<rect class="ma-d" x="${x0 + k * step}" y="${y(i) + 3}" width="${w}" height="${n * U - 8}" rx="1"/>`; return s; };
    const led = (i, x, cls = "ma-led", anim = "") => `<circle class="${cls}" cx="${x}" cy="${y(i) + U / 2}" r="2">${anim}</circle>`;
    const label = (i, n, s, cls = "ma-t") => { const cy = y(i) + n * U / 2; return `<path class="ma-lead" d="M${R1 + 2} ${cy}H${R1 + 18}"/>` + T(R1 + 22, cy + 3.5, s, cls); };

    let s = "";
    s += T(20, 34, "Rack A01", "ma-h") + T(20, 50, "front elevation · 42U · 19 in");
    // frame, posts, top and bottom panels, casters
    s += `<rect class="ma-frame" x="${X0}" y="${TOP - 14}" width="${X1 - X0}" height="${42 * U + 26}" rx="3"/>`;
    s += `<path class="ma-line" d="M${R0} ${TOP}V${y(42)}M${R1} ${TOP}V${y(42)}M${X0} ${TOP - 4}H${X1}M${X0} ${y(42) + 4}H${X1}"/>`;
    s += `<circle class="ma-line" cx="${X0 + 16}" cy="${y(42) + 22}" r="5"/><circle class="ma-line" cx="${X1 - 16}" cy="${y(42) + 22}" r="5"/>`;
    // rail holes every U, U numbers every 6U
    let ticks = ""; for (let i = 0; i <= 42; i++) ticks += `M${R0 - 4} ${y(i)}H${R0}M${R1} ${y(i)}H${R1 + 4}`;
    s += `<path class="ma-d" d="${ticks}"/>`;
    for (let u = 42; u >= 1; u -= 6) s += T(X0 - 6, y(42 - u) + U - 3, u, "ma-t ma-small", "end");
    s += T(X0 - 6, y(41) + U - 3, 1, "ma-t ma-small", "end");
    // height dimension on the far left
    s += `<path class="ma-lead" d="M28 ${TOP}H40M28 ${y(42)}H40M34 ${TOP}V${y(42)}M31 ${TOP + 7}l3 -7 3 7M31 ${y(42) - 7}l3 7 3 -7"/>`;
    s += `<text class="ma-t" transform="translate(28 ${(TOP + y(42)) / 2}) rotate(-90)" text-anchor="middle">1866 mm</text>`;

    // equipment, top to bottom
    s += dev(0, 1, ports(0, 5, 16, R0 + 10, 7.6)) + label(0, 1, "patch panel");
    s += dev(1, 1, `<path class="ma-d" d="M${R0 + 10} ${y(1) + U / 2}H${R1 - 10}" stroke-dasharray="3 3"/>`);
    s += dev(2, 1, ports(2, 2.5, 12, R0 + 8, 7) + ports(2, 7.5, 12, R0 + 8, 7) + led(2, R1 - 12, "ma-led acc", blink(1.6, 0)) + led(2, R1 - 20, "ma-led acc", blink(2.2, .5))) + label(2, 1, "switch");
    s += dev(4, 1, `<rect class="ma-d" x="${R0 + 8}" y="${y(4) + 3.5}" width="30" height="6.5"/>` + ports(4, 4, 4, R1 - 44, 8, 4, 5) + led(4, R1 - 10, "ma-led acc")) + label(4, 1, "firewall");
    for (const i of [7, 8, 9]) s += dev(i, 1, bays(i, 1, 4, R0 + 8, 9, 6) + `<path class="ma-d" d="M${R0 + 50} ${y(i) + U / 2}H${R1 - 26}"/>` + led(i, R1 - 12, "ma-led", i === 8 ? blink(3, 1) : ""));
    s += label(7, 3, "servers");
    s += dev(11, 2, bays(11, 2, 8, R0 + 8, 11, 8) + led(11.5, R1 - 12, "ma-led acc", blink(2.6, .3)), "ma-dev acc") + label(11, 2, "game server", "ma-t acc");
    let disks = ""; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) disks += `<rect class="ma-d" x="${R0 + 8 + c * 32}" y="${y(15) + 4 + r * 17}" width="28" height="13" rx="1.5"/>`;
    s += dev(15, 4, disks) + label(15, 4, "storage");
    s += dev(22, 1, `<path class="ma-d" d="M${R0 + 50} ${y(22) + 4}h36v6h-36z"/>`) + label(22, 1, "KVM drawer");
    for (const i of [24, 27, 30, 33]) s += `<rect class="ma-blank" x="${R0 + 2}" y="${y(i) + 1}" width="${R1 - R0 - 4}" height="${3 * U - 2}" rx="1.5"/>`;
    s += label(27, 6, "blank panels", "ma-t ma-faint");
    let outlets = ""; for (let k = 0; k < 10; k++) outlets += `<rect class="ma-d" x="${R0 + 10 + k * 12.5}" y="${y(37) + 4}" width="6" height="5.5" rx="1"/>`;
    s += dev(37, 1, outlets) + label(37, 1, "PDU");
    let vents = ""; for (let k = 0; k < 9; k++) vents += `M${R0 + 64 + k * 8} ${y(39) + 10}v${3 * U - 20}`;
    s += dev(39, 3, `<rect class="ma-d" x="${R0 + 10}" y="${y(39) + 8}" width="40" height="16" rx="1.5"/><path class="ma-d" d="${vents}"/>`) + label(39, 3, "UPS");

    // title block
    const tb = y(42) + 46;
    s += `<rect class="ma-frame" x="20" y="${tb}" width="280" height="44"/><path class="ma-line" d="M20 ${tb + 22}H300M180 ${tb}V${tb + 44}"/>`;
    s += T(28, tb + 15, "Server Lab · data hall 1") + T(188, tb + 15, "sheet M-1") + T(28, tb + 37, "elevation, not to scale") + T(188, tb + 37, "rev A");
    return `<svg viewBox="0 0 320 ${tb + 56}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${s}</svg>`;
  }

  /* ---------- right: a packet's path to the game ---------- */
  function path() {
    const C = 130, NX = 44;                       // centre line, checkpoint numbers
    let s = "";
    s += T(20, 34, "Packet path", "ma-h") + T(20, 50, "one-line diagram · UDP 8211");
    const route = `M${C} 112V160M${C} 196V222M${C} 274V294M${C} 334V410M${C} 504V540M${C} 568V600`;
    s += `<path class="ma-wire" d="${route}"/>`;
    const lab = (yy, t, sub, cls = "ma-t") => T(C + 52, yy, t, cls) + (sub ? T(C + 52, yy + 13, sub, "ma-t ma-faint") : "");
    const cp = (yy, n) => `<path class="ma-lead" d="M${NX + 9} ${yy}H${C - 30}" stroke-dasharray="2 3"/><circle class="ma-cp" cx="${NX}" cy="${yy}" r="9"/>` + T(NX, yy + 3.6, n, "ma-t ma-cpn", "middle");
    // laptop
    s += `<rect class="ma-line" x="${C - 26}" y="74" width="52" height="34" rx="2"/><rect class="ma-d" x="${C - 21}" y="79" width="42" height="24"/><path class="ma-line" d="M${C - 34} 112h68l-6 6h-56z"/>` + lab(92, "your laptop", "the client");
    // home router with antennas
    s += `<rect class="ma-line" x="${C - 24}" y="160" width="48" height="36" rx="3"/><path class="ma-line" d="M${C - 14} 160l-6 -16M${C + 14} 160l6 -16"/><path class="ma-d" d="M${C - 14} 178h4M${C - 6} 178h4M${C + 2} 178h4M${C + 10} 178h4"/>` + lab(176, "home router", "Wi-Fi + NAT");
    // internet cloud
    s += `<path class="ma-line" d="M${C - 34} 274c-18 0-22-22-6-27 0-17 22-23 30-11 8-15 36-12 36 8 16-3 24 20 8 30z"/>` + lab(252, "the internet", "many hops");
    // 1 gateway (router symbol)
    s += `<circle class="ma-line" cx="${C}" cy="314" r="20"/><path class="ma-line" d="M${C - 11} 309h20l-5 -5M${C + 11} 319h-20l5 5"/>` + cp(314, 1) + lab(310, "internet gateway", "swaps public → private");
    // 2 security list (wall)
    s += `<rect class="ma-dev" x="${C - 24}" y="348" width="48" height="34"/><path class="ma-d" d="M${C - 24} 359h48M${C - 24} 370h48M${C - 12} 348v11M${C + 8} 348v11M${C - 2} 359v11M${C + 16} 359v11M${C - 18} 359v11M${C - 12} 370v12M${C + 8} 370v12"/>` + cp(365, 2) + lab(362, "security list", "cloud firewall");
    // the server
    s += `<rect class="ma-zone" x="${C - 60}" y="392" width="${120 + 116}" height="236" rx="6"/>` + T(C - 50, 406, "the server", "ma-t ma-faint");
    // 3 iptables
    s += `<rect class="ma-dev" x="${C - 26}" y="410" width="52" height="30" rx="2"/><path class="ma-d" d="M${C - 18} 419h36M${C - 18} 425h36M${C - 18} 431h22"/>`;
    s += `<path class="ma-wire" d="M${C} 440V474"/>` + cp(425, 3) + lab(422, "iptables", "on the server");
    // 4 docker port map
    s += `<rect class="ma-dev" x="${C - 26}" y="474" width="52" height="30" rx="2"/><path class="ma-line" d="M${C - 16} 489h10M${C + 6} 489h10M${C + 12} 485l4 4-4 4"/>` + cp(489, 4) + lab(486, "docker", "8211 → container");
    // 5 container
    s += `<rect class="ma-dev acc" x="${C - 30}" y="540" width="60" height="60" rx="3"/><path class="ma-d" d="M${C - 22} 552h44M${C - 22} 560h32M${C - 22} 568h38"/>` + T(C, 590, ":8211", "ma-t acc", "middle") + cp(570, 5) + lab(566, "the game", "container", "ma-t acc");
    // packet travelling down the route
    if (!still) s += `<circle class="ma-pkt" r="4.5"><animateMotion dur="9s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.8;1" calcMode="linear" path="M${C} 112V600"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.05;.76;.8;1" dur="9s" repeatCount="indefinite"/></circle>`;
    // title block + note
    s += `<rect class="ma-frame" x="20" y="656" width="280" height="44"/><path class="ma-line" d="M20 678H300M180 656V700"/>`;
    s += T(28, 671, "Server Lab · lesson 06") + T(188, 671, "sheet N-1") + T(28, 693, "stops at a checkpoint?") + T(188, 693, "check that one");
    return `<svg viewBox="0 0 320 712" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${s}</svg>`;
  }

  const add = (cls, svg) => { const d = document.createElement("div"); d.className = "ma " + cls; d.setAttribute("aria-hidden", "true"); d.innerHTML = svg; document.body.append(d); };
  add("ma-left", rack());
  add("ma-right", path());
})();
