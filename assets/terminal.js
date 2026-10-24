/* Practice terminal: a safe, fake copy of the Palhaven server (and your laptop's PowerShell).
   Outputs are real ones captured from the server one day (secrets and player data removed).
   Usage:
     <div class="terminal" data-term="lesson-04"><script type="application/json">
       { "start": "server" | "laptop",
         "tasks": [ { "text": "Show where you are", "cmd": "^pwd$", "note": "optional teacher comment" },
                    { "text": "What is the private IP?", "ask": true, "answers": ["10.0.0.84"] } ] }
     </script></div>
   Nothing typed here touches the real server. Commands that would change things are refused. */
(function () {
  const COMPOSE = `services:
  palworld:
    image: thijsvanloef/palworld-server-docker:latest
    container_name: palworld
    restart: unless-stopped
    stop_grace_period: 60s
    ports:
      - 8211:8211/udp
    environment:
      PUID: 1000
      PGID: 1000
      TZ: Asia/Manila
      PORT: 8211
      PLAYERS: 16
      MULTITHREADING: "true"
      SERVER_NAME: "Palhaven"
      SERVER_DESCRIPTION: "Friends-only server"
      SERVER_PASSWORD: "********"
      ADMIN_PASSWORD: "********"
      COMMUNITY: "false"
      RCON_ENABLED: "true"
      RCON_PORT: 25575
      UPDATE_ON_BOOT: "true"
      BACKUP_ENABLED: "true"
      BACKUP_CRON_EXPRESSION: "45 3 * * *"
      DELETE_OLD_BACKUPS: "true"
      OLD_BACKUP_DAYS: 7
      AUTO_REBOOT_ENABLED: "true"
      AUTO_REBOOT_CRON_EXPRESSION: "55 3 * * *"
      AUTO_REBOOT_WARN_MINUTES: 5
    volumes:
      - ./data:/palworld
# (passwords replaced with ******** in this practice copy)`;

  const OS_RELEASE = `PRETTY_NAME="Ubuntu 24.04.5 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.5 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"`;

  // directory tree: path -> { ls, ll } (ll = ls -l output)
  const DIRS = {
    "/": { ls: "bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var" },
    "/home": { ls: "opc  ubuntu" },
    "/home/ubuntu": { ls: "backups", la: `total 48
drwxr-x--- 6 ubuntu ubuntu 4096 Mar  7 06:25 .
drwxr-xr-x 4 root   root   4096 Mar  7 01:55 ..
-rw------- 1 ubuntu ubuntu 6426 Mar  7 06:14 .bash_history
-rw-r--r-- 1 ubuntu ubuntu 3771 Mar 31  2024 .bashrc
-rw-r--r-- 1 ubuntu ubuntu  807 Mar 31  2024 .profile
drwx------ 2 ubuntu ubuntu 4096 Oct 16 04:03 .ssh
drwxr-xr-x 2 root   root   4096 Mar  8 06:25 backups`, ll: `total 4
drwxr-xr-x 2 root root 4096 Mar  8 06:25 backups` },
    "/home/ubuntu/backups": { ls: "" },
    "/etc": { ls: "apt  cron.d  default  hostname  hosts  iptables  os-release  passwd  ssh  systemd  ...(and many more)" },
    "/opt": { ls: "containerd  palworld  palworld-monitor  unified-monitoring-agent", ll: `total 16
drwx--x--x 4 root   root   4096 Oct 16 05:10 containerd
drwxr-xr-x 3 root   root   4096 Mar  7 03:16 palworld
drwxr-xr-x 5 ubuntu ubuntu 4096 Mar  7 05:47 palworld-monitor
drwxr-xr-x 3 root   root   4096 Oct 16 04:00 unified-monitoring-agent` },
    "/opt/palworld": { ls: "apply-when-empty.sh  data  docker-compose.yml  docker-compose.yml.bak", ll: `total 16
-rwx------ 1 root root  510 Mar  7 03:16 apply-when-empty.sh
drwxr-xr-x 9 opc  opc  4096 Mar  8 10:14 data
-rw------- 1 root root 1051 Mar  7 03:16 docker-compose.yml
-rw------- 1 root root  923 Mar  7 02:59 docker-compose.yml.bak` },
    "/opt/palworld/data": { ls: `DefaultPalWorldSettings.ini  Engine  Pal  PalServer-arm64.sh  PalServer.sh  backups
libsteamwebrtc.so  linux64  steamapps  steamclient.so` },
    "/opt/palworld/data/backups": { ls: `palworld-save-2025-03-07_10-25-43.tar.gz  palworld-save-2025-03-07_12-35-46.tar.gz
palworld-save-2025-03-08_03-45-00.tar.gz`, ll: `total 252K
-rw-r--r-- 1 opc opc  19K Mar  7 02:25 palworld-save-2025-03-07_10-25-43.tar.gz
-rw-r--r-- 1 opc opc  57K Mar  7 04:35 palworld-save-2025-03-07_12-35-46.tar.gz
-rw-r--r-- 1 opc opc 170K Mar  7 20:45 palworld-save-2025-03-08_03-45-00.tar.gz` },
    "/opt/palworld-monitor": { ls: "data  server.py  static  venv" },
    "/var": { ls: "backups  cache  lib  local  lock  log  mail  opt  run  spool  tmp" },
    "/var/log": { ls: "apt  auth.log  dpkg.log  journal  kern.log  syslog  ...(and more)" },
  };
  // files: path -> { text, root: true if only root may read }
  const FILES = {
    "/etc/os-release": { text: OS_RELEASE },
    "/etc/hostname": { text: "en" },
    "/opt/palworld/docker-compose.yml": { text: COMPOSE, root: true },
    "/opt/palworld/docker-compose.yml.bak": { text: "(an older copy of the compose file)", root: true },
  };

  const OUT = {
    "whoami": "ubuntu",
    "hostname": "en",
    "uptime -p": "up 1 hour, 40 minutes",
    "uptime": " 11:54:30 up  1:40,  1 user,  load average: 0.62, 0.47, 0.47",
    "free -h": `               total        used        free      shared  buff/cache   available
Mem:            23Gi       2.9Gi        18Gi       7.5Mi       1.8Gi        20Gi
Swap:             0B          0B          0B`,
    "df -h /": `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   13G   84G  13% /`,
    "nproc": "4",
    "top": `top - 11:54:30 up  1:40,  1 user,  load average: 0.62, 0.47, 0.47
Tasks: 212 total,   1 running, 211 sleeping,   0 stopped,   0 zombie
%Cpu(s):  4.8 us,  2.4 sy,  2.4 ni, 90.5 id,  0.0 wa
MiB Mem :  23972.8 total,  19368.7 free,   3001.0 used,   1883.2 buff/cache

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   2474 opc       20   0 5442820   2.3g 175888 S  40.0   9.7  37:45.66 PalServer
      1 root      20   0   22592  13268   9100 S   0.0   0.1   0:02.57 systemd
   1839 ubuntu    20   0  312004 158700  21032 S   0.3   0.6   0:36.57 python
#(practice terminal: the real top keeps updating until you press q; this shows one snapshot)`,
    "ip -4 -br a": `lo               UNKNOWN        127.0.0.1/8
enp0s6           UP             10.0.0.84/24 metric 100
tailscale0       UNKNOWN        100.64.0.10/32
docker0          DOWN           172.17.0.1/16
br-7a0cd315a496  UP             172.18.0.1/16`,
    "ip route": `default via 10.0.0.1 dev enp0s6 proto dhcp src 10.0.0.84 metric 100
10.0.0.0/24 dev enp0s6 proto kernel scope link src 10.0.0.84 metric 100
169.254.169.254 dev enp0s6 proto dhcp scope link src 10.0.0.84 metric 100
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
172.18.0.0/16 dev br-7a0cd315a496 proto kernel scope link src 172.18.0.1`,
    "docker ps": `CONTAINER ID   IMAGE                                        CREATED        STATUS                 PORTS                     NAMES
e8b09ee80643   thijsvanloef/palworld-server-docker:latest   33 hours ago   Up 2 hours (healthy)   0.0.0.0:8211->8211/udp    palworld`,
    "docker images": `REPOSITORY                            TAG       IMAGE ID       SIZE
thijsvanloef/palworld-server-docker   latest    a308e2eaa494   1.98GB`,
    "docker port palworld": `8211/udp -> 0.0.0.0:8211
8211/udp -> [::]:8211`,
    "docker stats --no-stream": `CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT     MEM %     NET I/O         PIDS
e8b09ee80643   palworld   43.36%    2.416GiB / 23.41GiB   10.32%    299kB / 519kB   56`,
    "docker exec palworld rest-cli players": `{"players": []}
#(practice copy: on the real server this lists whoever is online right now)`,
    "systemctl status palworld-monitor": `● palworld-monitor.service - Palworld server monitor (dashboard on 127.0.0.1:8797)
     Loaded: loaded (/etc/systemd/system/palworld-monitor.service; enabled; preset: enabled)
     Active: active (running) since Sat 2025-03-08 10:14:38 UTC; 1h 39min ago
   Main PID: 1839 (python)
     Memory: 158.7M
     CGroup: /system.slice/palworld-monitor.service
             └─1839 /opt/palworld-monitor/venv/bin/python -u /opt/palworld-monitor/server.py`,
  };
  const LOGS = `[2025-03-08 19:53:59] [LOG] REST accessed endpoint /v1/api/players OK
[2025-03-08 19:54:04] [LOG] REST accessed endpoint /v1/api/metrics OK
[2025-03-08 19:54:04] [LOG] REST accessed endpoint /v1/api/players OK
[2025-03-08 19:54:09] [LOG] REST accessed endpoint /v1/api/metrics OK
[2025-03-08 19:54:09] [LOG] REST accessed endpoint /v1/api/players OK
#(these lines are your monitor asking Palworld "who's online?" every 5 seconds)`;
  const SS_ROWS = [
    ["udp", "UNCONN", "0.0.0.0:8211", 'users:(("docker-proxy",pid=1805))'],
    ["udp", "UNCONN", "0.0.0.0:41641", 'users:(("tailscaled",pid=969))'],
    ["udp", "UNCONN", "127.0.0.53%lo:53", 'users:(("systemd-resolve",pid=699))'],
    ["udp", "UNCONN", "0.0.0.0:111", 'users:(("rpcbind",pid=694))'],
    ["tcp", "LISTEN", "0.0.0.0:22", 'users:(("sshd",pid=2738))'],
    ["tcp", "LISTEN", "127.0.0.1:8797", 'users:(("python",pid=1839))'],
    ["tcp", "LISTEN", "100.64.0.10:8797", 'users:(("python",pid=1839))'],
    ["tcp", "LISTEN", "127.0.0.1:7681", 'users:(("ttyd",pid=956))'],
    ["tcp", "LISTEN", "127.0.0.53%lo:53", 'users:(("systemd-resolve",pid=699))'],
    ["tcp", "LISTEN", "0.0.0.0:111", 'users:(("rpcbind",pid=694))'],
  ];
  const ss = withProc => "Netid State   Local Address:Port       " + (withProc ? "Process" : "") + "\n" +
    SS_ROWS.map(r => `${r[0].padEnd(5)} ${r[1].padEnd(7)} ${r[2].padEnd(24)} ${withProc ? r[3] : ""}`).join("\n");
  const IPTABLES = `Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    ts-input   0    --  0.0.0.0/0            0.0.0.0/0
2    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0            state RELATED,ESTABLISHED
3    ACCEPT     1    --  0.0.0.0/0            0.0.0.0/0
4    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0
5    ACCEPT     6    --  0.0.0.0/0            0.0.0.0/0            state NEW tcp dpt:22
6    ACCEPT     17   --  0.0.0.0/0            0.0.0.0/0            udp dpt:8211
7    REJECT     0    --  0.0.0.0/0            0.0.0.0/0            reject-with icmp-host-prohibited
#(prot 6 = TCP, 17 = UDP, 1 = ICMP/ping. dpt = destination port)`;
  const IPCONFIG = `Windows IP Configuration

Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . :
   IPv4 Address. . . . . . . . . . . : 192.168.1.23
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
#(practice copy with sample numbers: run ipconfig on your real laptop to see yours)`;

  const BLOCKED = /^(docker\s+(restart|stop|start|rm|kill|compose)|reboot|shutdown|poweroff|rm\s|apt|apt-get|kill|systemctl\s+(restart|stop|start|disable)|iptables\s+-[AIDF]|nano|vi|vim|mv\s|cp\s|chmod|chown)/;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function mount(root) {
    const cfg = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    const tasks = cfg.tasks || [];
    let host = cfg.start || "server", cwd = "/home/ubuntu";
    const hist = []; let hi = 0;
    root.replaceChildren();

    const head = el("div", "term-head");
    head.append(el("span", "term-dot"), el("span", "term-dot"), el("span", "term-dot"),
      el("span", "term-title", "Practice terminal · safe copy of your server · type help"));
    const screen = el("div", "term-screen"); screen.setAttribute("role", "log"); screen.setAttribute("aria-live", "polite");
    const line = el("div", "term-line"); const pr = el("span", "term-prompt");
    const input = el("input", "term-input"); input.type = "text"; input.autocomplete = "off"; input.spellcheck = false;
    input.setAttribute("aria-label", "Type a command"); input.setAttribute("autocapitalize", "off");
    line.append(pr, input);
    const body = el("div", "term-body"); body.append(screen, line);
    body.addEventListener("click", () => input.focus());

    // task panel
    const panel = el("div", "term-tasks"); const list = el("ol", "term-tasklist");
    const done = tasks.map(() => false);
    panel.append(el("div", "term-tasks-h", "Your missions"), list);
    const taskEls = tasks.map((t, i) => {
      const li = el("li"); const txt = el("span", null, t.text); li.append(txt);
      if (t.ask) {
        const f = el("form", "term-ask"); const inp = el("input"); inp.type = "text"; inp.placeholder = "your answer";
        inp.setAttribute("aria-label", t.text); const b = el("button", null, "Check"); b.type = "submit";
        const fb = el("span", "term-ask-fb");
        f.append(inp, b, fb);
        f.onsubmit = e => { e.preventDefault();
          const v = inp.value.trim().toLowerCase();
          if (t.answers.some(a => a.toLowerCase() === v)) { fb.textContent = "✓"; inp.disabled = b.disabled = true; complete(i); }
          else { fb.textContent = "Not quite. Look at the output again."; } };
        li.append(f);
      }
      list.append(li); return li;
    });
    const score = el("div", "term-score");
    panel.append(score);
    function paintTasks() {
      const cur = done.indexOf(false);
      taskEls.forEach((li, i) => { li.classList.toggle("done", done[i]); li.classList.toggle("current", i === cur); });
      const n = done.filter(Boolean).length;
      score.textContent = tasks.length ? (n === tasks.length ? `All ${n} missions done. Nice work!` : `${n} of ${tasks.length} done`) : "";
    }
    function complete(i) {
      if (done[i]) return; done[i] = true; paintTasks();
      if (tasks[i].note) print(`✓ ${tasks[i].note}`, "term-note");
      try { const k = "serverlab.terms", s = JSON.parse(localStorage.getItem(k) || "{}");
        s[root.dataset.term || "term"] = { done: done.filter(Boolean).length, total: tasks.length }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {}
    }

    const wrap = el("div", "term-wrap"); const termBox = el("div", "term"); termBox.append(head, body);
    wrap.append(termBox); if (tasks.length) wrap.append(panel);
    root.append(wrap);

    function prompt() {
      if (host === "laptop") return "PS C:\\Users\\me> ";
      const p = cwd === "/home/ubuntu" ? "~" : cwd.startsWith("/home/ubuntu/") ? "~" + cwd.slice(12) : cwd;
      return `ubuntu@en:${p}$ `;
    }
    function print(text, cls) {
      String(text).split("\n").forEach(l => {
        const d = el("div", cls || (l.startsWith("#(") ? "term-hint" : "term-out"), l.startsWith("#(") ? l.slice(1) : l);
        screen.append(d);
      });
      body.scrollTop = body.scrollHeight;
    }
    function resolve(p) {
      if (!p || p === "~") return "/home/ubuntu";
      if (p.startsWith("~/")) p = "/home/ubuntu/" + p.slice(2);
      let parts = (p.startsWith("/") ? p : cwd + "/" + p).split("/");
      const out = [];
      for (const s of parts) { if (!s || s === ".") continue; if (s === "..") out.pop(); else out.push(s); }
      return "/" + out.join("/");
    }

    function runServer(raw) {
      let c = raw.trim().replace(/\s+/g, " ");
      const sudo = /^sudo /.test(c); if (sudo) c = c.slice(5);
      if (c === "help") return `Commands that work in this practice terminal:
  pwd  ls  ls -l  ls -la  cd <folder>  cat <file>  grep <word> <file>  whoami  hostname  clear  exit
  uptime -p  free -h  df -h /  nproc  top
  ip -4 -br a  ip route  ss -tulpn  iptables -L INPUT -n --line-numbers
  docker ps  docker images  docker port palworld  docker stats --no-stream
  docker logs --tail 20 palworld  docker exec palworld rest-cli players
  systemctl status palworld-monitor
Put sudo in front when you need administrator rights. Up arrow = previous command, Tab = complete.`;
      if (c === "clear") { screen.replaceChildren(); return null; }
      if (c === "exit" || c === "logout") { host = "laptop"; return "logout\nConnection to 203.0.113.84 closed.\n#(you're back on your laptop. Type ssh gameserver to log in again)"; }
      if (BLOCKED.test(c)) return "🛑 This command would CHANGE the real server, so it's switched off in the practice terminal.\n#(that's the right instinct to check first: on the real server, make sure nobody is playing)";
      if (c === "pwd") return cwd;
      if (c === "cd" || c.startsWith("cd ")) {
        const t = resolve(c.slice(3).trim());
        if (DIRS[t]) { cwd = t; return null; }
        if (FILES[t]) return `-bash: cd: ${c.slice(3).trim()}: Not a directory`;
        return `-bash: cd: ${c.slice(3).trim()}: No such file or directory`;
      }
      const ls = c.match(/^ls(?:\s+(-[a-zA-Z]+))?(?:\s+(\S+))?$/);
      if (ls) {
        const flag = ls[1] || "", t = resolve(ls[2] || "."), d = DIRS[t];
        if (!d) return FILES[t] ? (ls[2]) : `ls: cannot access '${ls[2]}': No such file or directory`;
        if (flag.includes("a") && d.la) return d.la;
        if (flag.includes("l")) return d.ll || d.ls;
        return d.ls;
      }
      const cat = c.match(/^cat\s+(\S+)$/);
      if (cat) {
        const t = resolve(cat[1]), f = FILES[t];
        if (DIRS[t]) return `cat: ${cat[1]}: Is a directory`;
        if (!f) return `cat: ${cat[1]}: No such file or directory`;
        if (f.root && !sudo) return `cat: ${cat[1]}: Permission denied\n#(this file belongs to root and holds passwords. sudo is the key card)`;
        return f.text;
      }
      const grep = c.match(/^grep\s+(?:-i\s+)?("?)([^"\s]+)\1\s+(\S+)$/);
      if (grep) {
        const t = resolve(grep[3]), f = FILES[t], ci = /\s-i\s/.test(c);
        if (!f) return `grep: ${grep[3]}: No such file or directory`;
        if (f.root && !sudo) return `grep: ${grep[3]}: Permission denied`;
        const w = ci ? grep[2].toLowerCase() : grep[2];
        const hits = f.text.split("\n").filter(l => (ci ? l.toLowerCase() : l).includes(w));
        return hits.length ? hits.join("\n") : null;
      }
      if (c === "df -h") return OUT["df -h /"];
      if (c === "ip a" || c === "ip addr" || c === "ip -br a") return OUT["ip -4 -br a"];
      if (c === "ss -tulpn" || c === "ss -tuln") return ss(sudo && c === "ss -tulpn") + (sudo || c === "ss -tuln" ? "" : "\n#(no Process column: without sudo, ss can't see which program owns each port)");
      if (/^iptables -L/.test(c)) return sudo ? IPTABLES : "iptables v1.8.10 (nf_tables): Permission denied (you must be root)\n#(firewall rules need the key card: put sudo in front)";
      const logs = c.match(/^docker logs(?: --tail (\d+))? palworld$/);
      if (logs) return LOGS;
      if (c === "docker ps -a") return OUT["docker ps"];
      if (c === "docker stats") return OUT["docker stats --no-stream"] + "\n#(the real command keeps updating until Ctrl+C; --no-stream shows one snapshot)";
      if (c === "systemctl status") return "#(add the service name: systemctl status palworld-monitor)";
      if (OUT[c] != null) return OUT[c];
      if (/^(ipconfig|test-netconnection)/i.test(c)) return `${c.split(" ")[0]}: command not found\n#(that's a Windows command. You're on the Linux server: type exit to go back to your laptop)`;
      if (/^ssh /.test(c)) return "#(you're already logged in to the server: look at the prompt)";
      const w = c.split(" ")[0];
      return `${w}: command not found\n#(or it isn't in this practice copy yet. Type help to see what works here)`;
    }

    function runLaptop(raw) {
      const c = raw.trim().replace(/\s+/g, " "); const lc = c.toLowerCase();
      if (lc === "help") return `Commands that work on this practice laptop:
  ssh gameserver         log in to the server
  ipconfig               your laptop's network addresses
  Test-NetConnection 203.0.113.84 -Port 22 -InformationLevel Quiet
  clear`;
      if (lc === "clear" || lc === "cls") { screen.replaceChildren(); return null; }
      if (lc === "ssh gameserver" || /^ssh (-i \S+ )?ubuntu@203\.0\.113\.84$/.test(lc)) {
        host = "server"; cwd = "/home/ubuntu";
        return "Welcome to Ubuntu 24.04.5 LTS (GNU/Linux, aarch64)\n#(you're now typing on the server in Singapore: notice the prompt changed)";
      }
      if (lc === "ipconfig" || lc === "ipconfig /all") return IPCONFIG;
      const tnc = lc.match(/^test-netconnection\s+(\S+)\s+-port\s+(\d+)(\s+-informationlevel\s+quiet)?$/);
      if (tnc) {
        const ok = tnc[1] === "203.0.113.84" && tnc[2] === "22";
        const quiet = !!tnc[3];
        if (quiet) return ok ? "True" : "False" + (tnc[2] === "8211" ? "\n#(8211 is UDP. This test only knocks the TCP way, so it can't check Palworld. Lesson 03 explains)" : "\n#(not on the guards' list, so nothing answered. On the real laptop this takes ~20 seconds)");
        return ok ? `ComputerName     : ${tnc[1]}\nRemoteAddress    : ${tnc[1]}\nRemotePort       : 22\nTcpTestSucceeded : True`
                  : `WARNING: TCP connect to (${tnc[1]} : ${tnc[2]}) failed\nComputerName     : ${tnc[1]}\nRemotePort       : ${tnc[2]}\nTcpTestSucceeded : False`;
      }
      if (/^(ls|pwd|cd|cat|sudo|docker|free|df|uptime|ip|ss|iptables|systemctl|nproc|top)\b/.test(lc)) return `#(that's a server command, but you're on your laptop. Log in first with: ssh gameserver)`;
      return `${c.split(" ")[0]} : The term '${c.split(" ")[0]}' is not recognized as the name of a cmdlet.\n#(type help to see what works on this practice laptop)`;
    }

    function run(raw) {
      print(prompt() + raw, "term-echo");
      if (!raw.trim()) return;
      hist.push(raw); hi = hist.length;
      const out = host === "laptop" ? runLaptop(raw) : runServer(raw);
      if (out) print(out);
      const norm = raw.trim().replace(/\s+/g, " ");
      tasks.forEach((t, i) => { if (!done[i] && t.cmd && new RegExp(t.cmd, "i").test(norm)) complete(i); });
      pr.textContent = prompt();
    }

    const COMPLETIONS = ["sudo ", "docker ", "ps", "images", "port palworld", "stats --no-stream", "logs --tail 20 palworld", "systemctl status palworld-monitor",
      "iptables -L INPUT -n --line-numbers", "uptime -p", "free -h", "df -h /", "nproc", "ip -4 -br a", "ip route", "ss -tulpn", "cat ", "grep ", "ssh gameserver", "ipconfig"];
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { const v = input.value; input.value = ""; run(v); }
      else if (e.key === "ArrowUp") { if (hi > 0) { hi--; input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === "ArrowDown") { if (hi < hist.length) { hi++; input.value = hist[hi] || ""; } e.preventDefault(); }
      else if (e.key === "Tab") {
        e.preventDefault();
        const v = input.value, sp = v.lastIndexOf(" "), last = v.slice(sp + 1), before = v.slice(0, sp + 1);
        // complete folder/file names in the current folder, else known command words
        const dir = last.includes("/") ? resolve(last.slice(0, last.lastIndexOf("/") + 1) || "/") : cwd;
        const stem = last.slice(last.lastIndexOf("/") + 1);
        const names = host === "server" && DIRS[dir] ? DIRS[dir].ls.split(/\s+/).filter(Boolean) : [];
        const m = names.filter(n => n.startsWith(stem));
        if (stem && m.length === 1) { const full = (last.slice(0, last.lastIndexOf("/") + 1)) + m[0]; input.value = before + full + (DIRS[resolve(full)] ? "/" : " "); return; }
        const cm = COMPLETIONS.filter(x => x.startsWith(last) && last);
        if (cm.length === 1) input.value = before + cm[0];
      }
      else if (e.key === "c" && e.ctrlKey && !window.getSelection().toString()) { print(prompt() + input.value + "^C", "term-echo"); input.value = ""; e.preventDefault(); }
    });

    print(host === "laptop" ? "#(this is a practice copy of PowerShell on your laptop. Type help for commands)" : "#(you're logged in to a practice copy of your server. Nothing you type here changes the real one. Type help)");
    pr.textContent = prompt(); paintTasks();
  }
  document.querySelectorAll(".terminal").forEach(mount);
})();
