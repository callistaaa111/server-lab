/* Move progress between devices with a copy-and-paste code (course home only).
   Everything the course saves lives in localStorage keys starting with "serverlab". Export packs them into one code;
   import MERGES them into this browser, keeping the better result for each item, so nothing already here is lost.
   The code never leaves the page unless you copy it yourself. */
(function () {
  const box = document.getElementById("sync"); if (!box) return;
  const $ = s => box.querySelector(s);
  const PREFIX = "serverlab";
  const status = (msg, ok) => { const p = $("#sync-status"); p.textContent = msg; p.className = "sync-status " + (ok === false ? "bad" : ok ? "ok" : ""); };

  function gather() {
    const d = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) d[k] = localStorage.getItem(k); } } catch (e) {}
    return d;
  }
  const b64 = bytes => { let s = ""; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream("deflate-raw"))).arrayBuffer()); }
  async function encode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify({ v: 1, d: obj }));
    if (window.CompressionStream) { try { return "SLZ1." + b64(await pipe(raw, CompressionStream)); } catch (e) {} }
    return "SL1." + b64(raw);
  }
  async function decode(code) {
    code = code.replace(/\s+/g, "");
    const damaged = new Error("That code is damaged or cut short. Copy it again, all of it.");
    if (!code.startsWith("SLZ1.") && !code.startsWith("SL1.")) throw new Error("That isn't a Server Lab progress code. It should start with SLZ1. or SL1.");
    if (code.startsWith("SLZ1.") && !window.DecompressionStream) throw new Error("This browser is too old to read that code. Update it, or make the code on a newer browser.");
    let o;
    try {
      const bytes = code.startsWith("SLZ1.") ? await pipe(unb64(code.slice(5)), DecompressionStream) : unb64(code.slice(4));
      o = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { throw damaged; }
    if (!o || o.v !== 1 || typeof o.d !== "object") throw damaged;
    return o.d;
  }

  const parse = s => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  // keep the better result per item; never throw away what this device already has
  function mergeKey(key, mine, theirs) {
    const a = parse(mine), b = parse(theirs);
    if (a === undefined) return theirs;
    if (b === undefined || typeof a !== "object" || typeof b !== "object" || !a || !b) return mine;
    if (key === "serverlab.scores") { for (const k in b) if (!a[k] || (b[k].right || 0) > (a[k].right || 0)) a[k] = b[k]; }
    else if (key === "serverlab.terms") { for (const k in b) if (!a[k] || (b[k].done || 0) > (a[k].done || 0)) a[k] = b[k]; }
    else if (key === "serverlab.match") { for (const k in b) if (a[k] === undefined || b[k] < a[k]) a[k] = b[k]; }
    else if (key === "serverlab.xp") { for (const k in b) if (a[k] === undefined || b[k] > a[k]) a[k] = b[k]; }
    else if (key === "serverlab.checks") { for (const k in b) a[k] = !!(a[k] || b[k]); }
    else if (key === "serverlab-l21-v1") {
      a.got = a.got || {}; for (const k in b.got || {}) if (a.got[k] === undefined || b.got[k] > a.got[k]) a.got[k] = b.got[k];
      a.missions = a.missions || {}; for (const k in b.missions || {}) a.missions[k] = !!(a.missions[k] || b.missions[k]);
      a.labs = a.labs || {}; for (const k in b.labs || {}) a.labs[k] = !!(a.labs[k] || b.labs[k]);
      a.acl = Object.assign({}, b.acl || {}, a.acl || {});
      a.xp = Object.values(a.got).reduce((t, v) => t + (v || 0), 0);
    }
    else { for (const k in b) if (a[k] === undefined || a[k] === "") a[k] = b[k]; }   // answers, notes, builder fields
    return JSON.stringify(a);
  }

  $("#sync-make").addEventListener("click", async () => {
    const d = gather(), n = Object.keys(d).length;
    if (!n) { status("Nothing saved in this browser yet. Do a quiz first.", false); return; }
    const code = await encode(d), out = $("#sync-code");
    out.value = code; out.hidden = false; $("#sync-copy").hidden = false;
    status(`Code ready (${code.length.toLocaleString()} characters). Copy it and send it to yourself.`, true);
  });
  $("#sync-copy").addEventListener("click", () => {
    const out = $("#sync-code");
    const sel = () => { out.focus(); out.select(); status("Selected. Press Ctrl+C (or long-press → Copy on a phone).", true); };
    try { navigator.clipboard.writeText(out.value).then(() => status("Copied. Paste it into a message to yourself.", true), sel); } catch (e) { sel(); }
  });
  $("#sync-load").addEventListener("click", async () => {
    const code = $("#sync-paste").value.trim();
    if (!code) { status("Paste a code first.", false); return; }
    try {
      const d = await decode(code); let n = 0;
      for (const k in d) {
        if (!k.startsWith(PREFIX) || typeof d[k] !== "string") continue;
        let mine = null; try { mine = localStorage.getItem(k); } catch (e) {}
        const v = mine === null ? d[k] : mergeKey(k, mine, d[k]);
        try { localStorage.setItem(k, v); n++; } catch (e) { throw new Error("This browser won't save data (private mode?)."); }
      }
      $("#sync-paste").value = "";
      status(`Added ${n} saved item${n === 1 ? "" : "s"} to this device. Reloading…`, true);
      setTimeout(() => location.reload(), 900);
    } catch (e) { status(e.message || "That code didn't work. Copy it again, all of it.", false); }
  });
})();
