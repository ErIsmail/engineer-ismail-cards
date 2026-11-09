/*
 * Engineer Ismail Cards
 * Custom dashboard cards for Home Assistant: Page Style, Room, AC, Scenes, Security, Energy and TV Remote.
 *
 * MIT License - Copyright (c) 2026 Engineer Ismail
 */
const EI_VERSION = "1.1.0";

if (!customElements.get("ei-room-card")) {
  (() => {
    // Helpers
    const esc = (s) =>
      String(s == null ? "" : s).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
    const clean = (s) => String(s).replace(/[;"<>{}]/g, "");
    const col = (v, d) => {
      if (Array.isArray(v) && v.length >= 3) return "rgb(" + +v[0] + "," + +v[1] + "," + +v[2] + ")";
      if (typeof v === "string" && v.trim()) return clean(v.trim());
      return d;
    };
    const rgbOf = (v) => {
      if (Array.isArray(v) && v.length >= 3) return v.map(Number);
      if (typeof v === "string") {
        const m = v.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) {
          let h = m[1];
          if (h.length === 3)
            h = h
              .split("")
              .map((x) => x + x)
              .join("");
          return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
        }
      }
      return null;
    };
    const lightish = (v) => {
      const c = rgbOf(v);
      return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.6 : null;
    };
    const st = (h, id) => (h && id ? h.states[id] : undefined);
    const unav = (s) => !s || s.state === "unavailable" || s.state === "unknown";
    const ON_STATES = [
      "on",
      "open",
      "opening",
      "unlocked",
      "playing",
      "home",
      "heat",
      "cool",
      "auto",
      "dry",
      "fan_only",
      "heat_cool",
    ];
    const isOn = (s) => !!s && ON_STATES.includes(s.state);
    const dom = (id) => String(id || "").split(".")[0];
    const fname = (h, id) => {
      const s = st(h, id);
      return (s && s.attributes.friendly_name) || id;
    };
    const num = (s) => {
      if (unav(s)) return null;
      const n = parseFloat(s.state);
      return isNaN(n) ? null : n;
    };
    const unit = (s) => (s && s.attributes.unit_of_measurement) || "";
    const fix = (n, d) => (n == null ? "--" : (+n).toFixed(d));
    const asList = (v) =>
      (Array.isArray(v) ? v : v ? [v] : [])
        .map((e) => (typeof e === "string" ? { entity: e } : e))
        .filter((e) => e && e.entity);
    const short = (name, room) => {
      let n = String(name || "");
      const r = String(room || "")
        .trim()
        .toLowerCase();
      if (r && n.toLowerCase().startsWith(r + " ")) n = n.slice(r.length + 1);
      return n ? n.charAt(0).toUpperCase() + n.slice(1) : n;
    };
    const ago = (iso) => {
      const t = Date.parse(iso);
      if (isNaN(t)) return "";
      const s = Math.max(0, (Date.now() - t) / 1000);
      if (s < 60) return "now";
      if (s < 3600) return Math.floor(s / 60) + " min";
      if (s < 86400) return Math.floor(s / 3600) + " h";
      return Math.floor(s / 86400) + " d";
    };
    const watts = (s) => {
      const n = num(s);
      if (n == null) return null;
      return /^kw$/i.test(unit(s)) ? n * 1000 : n;
    };
    const pick = (h, test, n) =>
      Object.keys((h && h.states) || {})
        .filter((id) => test(id, h.states[id]))
        .slice(0, n);
    const dc = (s) => (s && s.attributes.device_class) || "";
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const DEG = "\u00b0";

    // Icons: match by device name first, then by domain
    const NAME_ICON = [
      [/chandelier/i, "mdi:chandelier"],
      [/cove|strip|led/i, "mdi:led-strip-variant"],
      [/wall/i, "mdi:wall-sconce-flat"],
      [/spot|down ?light|recess/i, "mdi:light-recessed"],
      [/pendant|ceiling/i, "mdi:ceiling-light"],
      [/lamp/i, "mdi:floor-lamp"],
      [/mirror/i, "mdi:mirror"],
      [/bed/i, "mdi:bed"],
      [/exhaust/i, "mdi:fan"],
      [/fan/i, "mdi:ceiling-fan"],
      [/curtain|sheer/i, "mdi:curtains"],
      [/blind|shutter/i, "mdi:blinds"],
      [/tv|television/i, "mdi:television"],
      [/heater|geyser/i, "mdi:water-boiler"],
      [/garden|outdoor/i, "mdi:outdoor-lamp"],
    ];
    const DICON = {
      light: "mdi:lightbulb",
      switch: "mdi:toggle-switch-variant",
      fan: "mdi:fan",
      input_boolean: "mdi:toggle-switch",
      cover: "mdi:curtains",
      media_player: "mdi:television",
      climate: "mdi:air-conditioner",
      lock: "mdi:lock",
      scene: "mdi:palette",
      script: "mdi:script-text-play",
      button: "mdi:gesture-tap-button",
      input_button: "mdi:gesture-tap-button",
      automation: "mdi:robot",
    };
    const iconFor = (s, id, over, name) => {
      if (over) return over;
      if (s && s.attributes.icon) return s.attributes.icon;
      const n = name || (s && s.attributes.friendly_name) || "";
      const m = NAME_ICON.find((r) => r[0].test(n));
      if (m) {
        if (m[1] === "mdi:curtains" && s && s.state === "closed") return "mdi:curtains-closed";
        return m[1];
      }
      if (dom(id) === "cover" && s && s.state === "closed") return "mdi:curtains-closed";
      return DICON[dom(id)] || "mdi:circle-outline";
    };

    // Looks
    const STYLES = {
      midnight: {
        font: '"Outfit", "Segoe UI", system-ui, sans-serif',
        fw: 500,
        bw: 300,
        card: "linear-gradient(160deg,#1d2846 0%,#111a31 55%,#0b1123 100%)",
        solid: "#0e162b",
        border: "rgba(255,255,255,.09)",
        shadow: "0 24px 48px -24px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.07)",
        tile: "rgba(255,255,255,.05)",
        tileb: "rgba(255,255,255,.06)",
        track: "rgba(255,255,255,.09)",
        tx: "#ffffff",
        mut: "#93a0bd",
        icon: "#8592b0",
        ok: "#34d399",
        warm: ["#ffd27a", "#ff9f43"],
        cool: ["#38bdf8", "#818cf8"],
        alert: ["#fb7185", "#e11d48"],
        atx: "#2a1600",
        ctx: "#ffffff",
        altx: "#ffffff",
      },
      gold: {
        font: '"Manrope", "Segoe UI", system-ui, sans-serif',
        fw: 700,
        bw: 300,
        caps: true,
        outline: true,
        card: "linear-gradient(180deg,#211d1a 0%,#161412 100%)",
        solid: "#191614",
        border: "#2f2a25",
        shadow: "0 24px 50px -24px #000, inset 0 1px 0 rgba(255,235,200,.05)",
        tile: "#23201c",
        tileb: "#2e2924",
        track: "#2e2924",
        tx: "#f5eee4",
        mut: "#9b9081",
        icon: "#776d61",
        ok: "#a3c48d",
        warm: ["#f6dca8", "#b8925a"],
        cool: ["#f0d29a", "#a88752"],
        alert: ["#f4a3a3", "#c2453f"],
        atx: "#241c10",
        ctx: "#241c10",
        altx: "#ffffff",
      },
      amber: {
        font: '"Inter", "Segoe UI", system-ui, sans-serif',
        fw: 700,
        bw: 700,
        solidOn: true,
        card: "#ffffff",
        solid: "#ffffff",
        border: "rgba(28,25,23,.06)",
        shadow: "0 1px 2px rgba(28,25,23,.05), 0 16px 36px -20px rgba(28,25,23,.28)",
        tile: "#f5f3ef",
        tileb: "rgba(28,25,23,.03)",
        track: "#eeebe5",
        tx: "#1c1917",
        mut: "#78716c",
        icon: "#8a827a",
        ok: "#16a34a",
        warm: ["#fbbf24", "#f59e0b"],
        cool: ["#38bdf8", "#2563eb"],
        alert: ["#fb7185", "#e11d48"],
        atx: "#2b1700",
        ctx: "#ffffff",
        altx: "#ffffff",
      },
      theme: {
        font: "var(--ha-font-family-body, var(--primary-font-family, Roboto, sans-serif))",
        fw: 600,
        bw: 400,
        card: "var(--ha-card-background, var(--card-background-color, #fff))",
        solid: "var(--ha-card-background, var(--card-background-color, #fff))",
        border: "var(--divider-color, rgba(0,0,0,.12))",
        shadow: "var(--ha-card-box-shadow, none)",
        tile: "color-mix(in srgb, var(--primary-text-color, #212121) 5%, transparent)",
        tileb: "transparent",
        track: "color-mix(in srgb, var(--primary-text-color, #212121) 10%, transparent)",
        tx: "var(--primary-text-color, #212121)",
        mut: "var(--secondary-text-color, #727272)",
        icon: "var(--state-icon-color, #44739e)",
        ok: "var(--success-color, #43a047)",
        warm: ["var(--amber-color, #ffc107)", "var(--orange-color, #ff9800)"],
        cool: ["var(--light-blue-color, #03a9f4)", "var(--blue-color, #2196f3)"],
        alert: ["var(--pink-color, #e91e63)", "var(--red-color, #f44336)"],
        atx: "#2b1700",
        ctx: "#ffffff",
        altx: "#ffffff",
      },
    };
    const ALIAS = { ivory: "amber", espresso: "gold", glass: "midnight", light: "amber", dark: "midnight" };
    // Page look shared by every card on the dashboard (set by the Page Style card)
    const PAGE = window.__eiPage || (window.__eiPage = { style: null, follow: false, cards: new Set() });
    const styleKey = (c) => {
      const k = ALIAS[c.style] || c.style;
      if (k && STYLES[k]) return k;
      return PAGE.follow && PAGE.style && STYLES[PAGE.style] ? PAGE.style : "midnight";
    };
    const styleOf = (c) => STYLES[styleKey(c)];

    try {
      if (!document.getElementById("ei-cards-fonts")) {
        const l = document.createElement("link");
        l.id = "ei-cards-fonts";
        l.rel = "stylesheet";
        l.href =
          "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Manrope:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
        document.head.appendChild(l);
      }
    } catch (e) {}
    try {
      CSS.registerProperty({ name: "--p", syntax: "<number>", inherits: true, initialValue: "0" });
    } catch (e) {}

    // Shared styles
    const BASE_CSS = `
:host{display:block;container-type:inline-size;height:100%}
*{box-sizing:border-box;margin:0}
.card{position:relative;height:100%;display:flex;flex-direction:column;background:var(--card);color:var(--tx);border:1px solid var(--bd);
  border-radius:26px;padding:18px;box-shadow:var(--sh);font-family:var(--font);overflow:hidden;-webkit-font-smoothing:antialiased;
  font-variant-numeric:tabular-nums;transition:background .4s,border-color .4s}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:inherit;
  user-select:none;-webkit-user-select:none}
button:focus-visible{outline:2px solid var(--a1);outline-offset:2px}
ha-icon{display:flex;--mdc-icon-size:22px}
.hd{display:flex;align-items:center;gap:12px;min-height:46px}
.hi{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;flex:none;background:var(--tile);border:1px solid var(--tileb);
  color:var(--icon);transition:background .4s,color .4s,box-shadow .4s,border-color .4s}
.hi ha-icon{--mdc-icon-size:24px}
.hi.on{background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);border-color:transparent;
  box-shadow:0 0 26px -4px color-mix(in srgb,var(--a2) 55%,transparent)}
.ol .hi.on{background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--a2) 30%,var(--solid)),var(--solid));color:var(--a1);
  border-color:color-mix(in srgb,var(--a2) 75%,transparent);box-shadow:0 0 22px -6px color-mix(in srgb,var(--a1) 45%,transparent)}
.ti{flex:1;min-width:0}
.nm{font-size:19px;font-weight:var(--fw);letter-spacing:-.015em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.caps .nm{letter-spacing:.005em}
.sb{font-size:13px;color:var(--mut);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pill{flex:none;font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:99px;background:var(--tile);border:1px solid var(--tileb);
  color:var(--tx);white-space:nowrap;transition:background .3s,color .3s,border-color .3s}
.pill:active{transform:scale(.96)}
.caps .pill{text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;font-weight:800;background:transparent;
  border-color:color-mix(in srgb,var(--a2) 70%,transparent);color:var(--a1)}
.pill.ok{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent);border-color:color-mix(in srgb,var(--ok) 35%,transparent)}
.pill.al{color:var(--atx);background:linear-gradient(135deg,var(--a1),var(--a2));border-color:transparent}
.ol .pill.al{color:var(--a1);background:color-mix(in srgb,var(--a2) 16%,transparent);border-color:var(--a2)}
.badge{flex:none;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--mut);white-space:nowrap}
.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--track)}
.badge.on{color:var(--a1)}
.badge.on::before{background:var(--a1);box-shadow:0 0 10px var(--a1)}
.solid .badge.on{color:var(--a2)}
.solid .badge.on::before{background:var(--a2);box-shadow:0 0 10px var(--a2)}
.caps .badge{text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;font-weight:800}
.lb{font-size:11.5px;color:var(--mut)}
.caps .lb{text-transform:uppercase;letter-spacing:.14em;font-size:10px}
.empty{margin-top:16px;padding:16px;border-radius:16px;background:var(--tile);border:1px dashed var(--tileb);color:var(--mut);font-size:13px;text-align:center;line-height:1.5}

/* tiles (room + scenes) */
.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;margin-top:16px}
.t{grid-column:span var(--sp,4);height:var(--th,96px);border-radius:18px;padding:12px 13px;display:flex;flex-direction:column;justify-content:space-between;
  align-items:flex-start;background:var(--tile);border:1px solid var(--tileb);min-width:0;
  transition:background .35s,border-color .35s,box-shadow .35s,transform .15s}
.t:active{transform:scale(.97)}
.t .ic{color:var(--icon);--mdc-icon-size:24px;transition:color .35s,filter .35s}
.t .tx{width:100%;min-width:0}
.t .n{font-size:13.5px;font-weight:600;line-height:1.22;overflow:hidden;display:-webkit-box!important;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;word-break:break-word}
.t .s{font-size:11.5px;color:var(--mut);margin-top:2px;white-space:nowrap;transition:color .35s}
.caps .t .s{text-transform:uppercase;letter-spacing:.08em;font-size:10px;margin-top:3px}
.t.on{background:linear-gradient(150deg,color-mix(in srgb,var(--a1) 28%,transparent),color-mix(in srgb,var(--a2) 9%,transparent));
  border-color:color-mix(in srgb,var(--a1) 42%,transparent);box-shadow:0 0 30px -10px color-mix(in srgb,var(--a2) 70%,transparent)}
.t.on .ic{color:var(--a1);filter:drop-shadow(0 0 8px color-mix(in srgb,var(--a1) 70%,transparent))}
.t.on .s{color:var(--a1)}
.solid .t.on{background:linear-gradient(150deg,var(--a1),var(--a2));border-color:transparent;box-shadow:0 12px 26px -14px var(--a2)}
.solid .t.on .ic{color:var(--atx);filter:none}
.solid .t.on .n{color:var(--atx)}
.solid .t.on .s{color:color-mix(in srgb,var(--atx) 70%,transparent)}
.t.un{opacity:.42}

/* dial (AC + energy) */
.dx{display:flex;align-items:center;gap:18px;margin-top:16px}
.dial{--sz:156px;width:var(--sz);height:var(--sz);border-radius:50%;flex:none;position:relative;display:grid;place-items:center;
  background:conic-gradient(from 220deg,var(--d1) 0deg,var(--d2) calc(var(--p) * 280deg),var(--track) calc(var(--p) * 280deg) 280deg,transparent 280deg);
  transition:--p .9s cubic-bezier(.2,.8,.2,1)}
.dial.on{filter:drop-shadow(0 0 14px color-mix(in srgb,var(--a2) 32%,transparent))}
.dial::before{content:"";position:absolute;inset:10px;border-radius:50%;background:var(--solid);
  box-shadow:inset 0 0 30px color-mix(in srgb,var(--d2) 12%,transparent)}
.dc{position:relative;text-align:center;line-height:1}
.v{font-size:46px;font-weight:var(--bw);letter-spacing:-.04em}
.v.sm{font-size:36px}
.v small{font-size:.38em;vertical-align:top;margin-left:2px;letter-spacing:0;font-weight:500;color:var(--mut)}
.dc .lb{margin-top:6px}
.dm,.dp{position:absolute;bottom:0;width:36px;height:36px;border-radius:50%;background:var(--tile);border:1px solid var(--tileb);
  display:grid;place-items:center;color:var(--tx);transition:transform .12s,background .2s}
.dm{left:calc(50% - 42px)}.dp{right:calc(50% - 42px)}
.dm:active,.dp:active{transform:scale(.9)}
.dm ha-icon,.dp ha-icon{--mdc-icon-size:20px}
.side{flex:1;display:grid;gap:8px;min-width:0}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 13px;border-radius:14px;background:var(--tile);
  border:1px solid var(--tileb);font-size:13px;color:var(--mut);min-width:0;width:100%}
.row b{color:var(--tx);font-weight:600;white-space:nowrap}
.caps .row{font-size:12px}
@container (max-width:360px){
  .card{padding:15px;border-radius:22px}.nm{font-size:17px}.hi{width:42px;height:42px;border-radius:14px}
  .grid{gap:8px}.t{padding:11px}
  .t .n{font-size:13px;line-height:1.2}
  .dx{flex-direction:column;gap:14px}.dial{--sz:172px}.side{width:100%;grid-template-columns:repeat(var(--rc,3),minmax(0,1fr))}
  .row{flex-direction:column;align-items:flex-start;gap:4px;padding:9px 11px}
}
@container (min-width:600px){
  .card{padding:22px}.nm{font-size:21px}.sb{font-size:13.5px}.hi{width:52px;height:52px;border-radius:17px}
  .t .n{font-size:14.5px}.dial{--sz:180px}.v{font-size:54px}.v.sm{font-size:42px}.row{padding:13px 15px;font-size:14px}
}
`;

    // Choose a tile layout that fills every row
    function tileLayout(n, w) {
      const minT = w < 360 ? 92 : w >= 600 ? 124 : 104,
        gap = 10;
      const maxC = Math.max(1, Math.min(6, Math.floor((w + gap) / (minT + gap))));
      const okC = [6, 4, 3, 2, 1].filter((c) => c <= maxC && (c > 1 || maxC === 1));
      let c;
      if (n <= maxC && 12 % n === 0) c = n;
      else {
        let best = null;
        okC.forEach((o) => {
          const r = n % o;
          const score = (r === 0 ? 0 : 12 % r !== 0 ? 1 : (o - r) / o) + Math.ceil(n / o) * 0.05;
          if (!best || score < best.score - 1e-9) best = { c: o, score };
        });
        c = best ? best.c : 1;
      }
      const base = 12 / c,
        r = n % c,
        spans = [];
      for (let i = 0; i < n; i++) spans.push(r && i >= n - r && 12 % r === 0 ? 12 / r : base);
      const th = w < 360 ? 100 : w >= 600 ? 114 : 104;
      return { spans, th };
    }

    // Base card
    class EIBase extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._sig = "";
        this._w = 0;
        const sr = this.shadowRoot;
        sr.addEventListener("click", (e) => {
          if (this._lp) {
            this._lp = false;
            return;
          }
          const t = e.target.closest("[data-a]");
          if (t) this._act(t.dataset.a, t.dataset.v || "", t);
        });
        sr.addEventListener("pointerdown", (e) => {
          const t = e.target.closest("[data-m]");
          if (!t) return;
          this._lpXY = [e.clientX, e.clientY];
          clearTimeout(this._lpT);
          this._lpT = setTimeout(() => {
            this._lp = true;
            this._more(t.dataset.m);
          }, 550);
        });
        sr.addEventListener("pointermove", (e) => {
          if (this._lpXY && Math.hypot(e.clientX - this._lpXY[0], e.clientY - this._lpXY[1]) > 10)
            clearTimeout(this._lpT);
        });
        ["pointerup", "pointercancel"].forEach((n) => sr.addEventListener(n, () => clearTimeout(this._lpT)));
        sr.addEventListener("contextmenu", (e) => {
          if (e.target.closest("[data-m]")) e.preventDefault();
        });
      }
      connectedCallback() {
        if (!this._ro && window.ResizeObserver) {
          this._ro = new ResizeObserver((en) => {
            const w = Math.round(en[0].contentRect.width);
            if (w && Math.abs(w - this._w) > 1) {
              this._w = w;
              this._redraw();
            }
          });
        }
        if (this._ro) this._ro.observe(this);
        if (this.constructor.tick) this._tick = setInterval(() => this._redraw(), 60000);
        if (!this._onPage) this._onPage = () => this._redraw();
        window.addEventListener("ei-page-change", this._onPage);
      }
      disconnectedCallback() {
        if (this._ro) this._ro.disconnect();
        clearInterval(this._tick);
        window.removeEventListener("ei-page-change", this._onPage);
      }
      static get defaults() {
        return {};
      }
      static get accent() {
        return "warm";
      }
      setConfig(c) {
        if (!c || typeof c !== "object") throw new Error("Invalid configuration");
        this._cfg = Object.assign({}, this.constructor.defaults, c);
        this._sig = "";
        this._draw();
      }
      set hass(h) {
        this._hass = h;
        this._draw();
      }
      get hass() {
        return this._hass;
      }
      getCardSize() {
        return 3;
      }
      getGridOptions() {
        return { columns: 12, min_columns: 6 };
      }
      _ids() {
        return [];
      }
      _extra() {
        return "";
      }
      _draw() {
        if (!this._cfg) return;
        const h = this._hass;
        let sig = JSON.stringify(this._cfg) + "|" + this._w + "|" + styleKey(this._cfg) + "|" + this._extra();
        if (h)
          for (const id of this._ids()) {
            const s = h.states[id];
            sig += "|" + id + (s ? s.state + s.last_changed + JSON.stringify(s.attributes) : "-");
          }
        if (sig === this._sig) return;
        this._sig = sig;
        const old = this.shadowRoot.querySelector(".dial");
        const oldP = old ? old.style.getPropertyValue("--p") : "";
        this.shadowRoot.innerHTML = "<style>" + BASE_CSS + (this.constructor.css || "") + "</style>" + this._html();
        const d = this.shadowRoot.querySelector(".dial");
        if (d) {
          const to = d.style.getPropertyValue("--p");
          if (to !== "") {
            d.style.setProperty("--p", oldP !== "" ? oldP : "0");
            requestAnimationFrame(() => requestAnimationFrame(() => d.style.setProperty("--p", to)));
          }
        }
      }
      _redraw() {
        this._sig = "";
        this._draw();
      }
      _width() {
        return this._w || 420;
      }
      _vars(kindOver) {
        const c = this._cfg,
          p = styleOf(c),
          kind = kindOver || this.constructor.accent;
        const bg = col(c.background, null);
        const tx = col(c.text_color, p.tx);
        const v = {
          "--card": bg || p.card,
          "--solid": bg || p.solid,
          "--tx": tx,
          "--mut": c.text_color ? "color-mix(in srgb," + tx + " 60%,transparent)" : p.mut,
          "--tile": bg ? "color-mix(in srgb," + tx + " 7%," + bg + ")" : p.tile,
          "--tileb": bg ? "color-mix(in srgb," + tx + " 7%,transparent)" : p.tileb,
          "--bd": bg ? "color-mix(in srgb," + tx + " 10%,transparent)" : p.border,
          "--track": bg ? "color-mix(in srgb," + tx + " 12%,transparent)" : p.track,
          "--sh": p.shadow,
          "--icon": col(c.icon_color, p.icon),
          "--font": p.font,
          "--fw": p.fw,
          "--bw": p.bw,
          "--ok": col(c.ok_color, p.ok),
        };
        let a = p[kind] || p.warm;
        let atx = kind === "cool" ? p.ctx : kind === "alert" ? p.altx : p.atx;
        if (c.on_color != null && c.on_color !== "") {
          const oc = col(c.on_color, null);
          a = ["color-mix(in srgb," + oc + " 70%,#ffffff)", oc];
          const li = lightish(c.on_color);
          if (li != null) atx = li ? "#1c1917" : "#ffffff";
        }
        v["--a1"] = a[0];
        v["--a2"] = a[1];
        v["--atx"] = atx;
        v["--w1"] = p.warm[0];
        v["--w2"] = p.warm[1];
        return Object.keys(v)
          .map((k) => k + ":" + v[k])
          .join(";");
      }
      _wrap(inner, cls, kind) {
        const p = styleOf(this._cfg);
        const k = [p.caps ? "caps" : "", p.outline ? "ol" : "", p.solidOn ? "solid" : "", cls || ""].join(" ");
        return '<div class="card ' + k + '" style="' + esc(this._vars(kind)) + '">' + inner + "</div>";
      }
      _head(icon, name, sub, right, on, act) {
        return (
          '<div class="hd"><button class="hi' +
          (on ? " on" : "") +
          '"' +
          (act || "") +
          '><ha-icon icon="' +
          esc(icon) +
          '"></ha-icon></button>' +
          '<div class="ti"><div class="nm">' +
          esc(name) +
          "</div>" +
          (sub ? '<div class="sb">' + sub + "</div>" : "") +
          "</div>" +
          (right || "") +
          "</div>"
        );
      }
      _dial(p, on, inner, btns) {
        return (
          '<div class="dial' +
          (on ? " on" : "") +
          '" style="--p:' +
          clamp01(p).toFixed(3) +
          ";--d1:" +
          (on ? "var(--a1)" : "color-mix(in srgb,var(--mut) 45%,transparent)") +
          ";--d2:" +
          (on ? "var(--a2)" : "color-mix(in srgb,var(--mut) 70%,transparent)") +
          '"><div class="dc">' +
          inner +
          "</div>" +
          (btns || "") +
          "</div>"
        );
      }
      _call(d, s, data) {
        if (this._hass) this._hass.callService(d, s, data);
      }
      _more(id) {
        if (id)
          this.dispatchEvent(
            new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }),
          );
      }
      _act() {}
    }

    // Room card
    class EIRoomCard extends EIBase {
      static get defaults() {
        return { name: "Living Room", icon: "mdi:sofa-outline", entities: [] };
      }
      getCardSize() {
        return 1 + Math.ceil(asList(this._cfg && this._cfg.entities).length / 3) * 2;
      }
      _list() {
        return asList(this._cfg.entities);
      }
      _ids() {
        const c = this._cfg;
        return this._list()
          .map((e) => e.entity)
          .concat([c.temperature, c.humidity].filter(Boolean));
      }
      _temp(id) {
        const s = st(this._hass, id);
        if (!s) return null;
        const v = dom(id) === "climate" ? s.attributes.current_temperature : num(s);
        return v == null ? null : (+v).toFixed(1) + DEG;
      }
      _html() {
        const c = this._cfg,
          h = this._hass,
          list = this._list();
        const live = list.filter((e) => !unav(st(h, e.entity)));
        const onN = live.filter((e) => isOn(st(h, e.entity))).length;
        const bits = [];
        if (list.length) bits.push(onN ? onN + " of " + list.length + " on" : "All off");
        const t = c.temperature && this._temp(c.temperature);
        if (t) bits.push(t);
        const hu = c.humidity && num(st(h, c.humidity));
        if (hu != null) bits.push(Math.round(hu) + "%");
        const right = live.length
          ? '<button class="pill" data-a="all">' + (onN ? "All off" : "All on") + "</button>"
          : "";
        let body;
        if (!list.length) body = '<div class="empty">Open the card settings and pick your lights and switches.</div>';
        else {
          const L = tileLayout(list.length, this._width());
          body =
            '<div class="grid" style="--th:' +
            L.th +
            'px">' +
            list
              .map((e, i) => {
                const s = st(h, e.entity),
                  on = isOn(s),
                  u = unav(s);
                const nm = e.name || short(fname(h, e.entity), c.name);
                let ds = u ? "Offline" : on ? "On" : "Off";
                if (on && s.attributes.brightness != null)
                  ds = "On \u00b7 " + Math.round(s.attributes.brightness / 2.55) + "%";
                if (dom(e.entity) === "cover" && !u)
                  ds = s.state === "open" ? "Open" : s.state === "closed" ? "Closed" : short(s.state);
                return (
                  '<button class="t' +
                  (on ? " on" : "") +
                  (u ? " un" : "") +
                  '" style="--sp:' +
                  L.spans[i] +
                  '" data-a="t" data-v="' +
                  esc(e.entity) +
                  '" data-m="' +
                  esc(e.entity) +
                  '">' +
                  '<ha-icon class="ic" icon="' +
                  esc(iconFor(s, e.entity, e.icon, nm)) +
                  '"></ha-icon>' +
                  '<span class="tx"><span class="n" style="display:block">' +
                  esc(nm) +
                  '</span><span class="s" style="display:block">' +
                  ds +
                  "</span></span></button>"
                );
              })
              .join("") +
            "</div>";
        }
        return this._wrap(this._head(c.icon, c.name, bits.join(" \u00b7 "), right, onN > 0, ' data-a="all"') + body);
      }
      _act(a, v, el) {
        if (a === "t") {
          if (unav(st(this._hass, v))) return this._more(v);
          el.classList.toggle("on");
          this._call("homeassistant", "toggle", { entity_id: v });
        } else if (a === "all") {
          const h = this._hass;
          const ids = this._list()
            .map((e) => e.entity)
            .filter((id) => !unav(st(h, id)));
          if (!ids.length) return;
          const anyOn = ids.some((id) => isOn(st(h, id)));
          this.shadowRoot.querySelectorAll(".t").forEach((t) => t.classList.toggle("on", !anyOn));
          this._call("homeassistant", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
        }
      }
      static getConfigElement() {
        return mkEditor("room");
      }
      static getStubConfig(h) {
        return {
          name: "Living Room",
          icon: "mdi:sofa-outline",
          entities: pick(h, (id) => /^(light|switch)\./.test(id), 4),
        };
      }
    }

    // AC card
    const MODES = {
      off: ["Off", "mdi:power"],
      cool: ["Cool", "mdi:snowflake"],
      heat: ["Heat", "mdi:fire"],
      dry: ["Dry", "mdi:water-percent"],
      fan_only: ["Fan", "mdi:fan"],
      auto: ["Auto", "mdi:thermostat-auto"],
      heat_cool: ["Auto", "mdi:sun-snowflake-variant"],
    };
    const ACTION = {
      cooling: "Cooling",
      heating: "Heating",
      drying: "Drying",
      fan: "Fan only",
      idle: "Idle",
      off: "Off",
    };
    class EIACCard extends EIBase {
      static get defaults() {
        return { name: "Bedroom AC", icon: "mdi:air-conditioner", power_threshold: 30, max_power: 2500 };
      }
      static get accent() {
        return "cool";
      }
      static get css() {
        return `
.modes{display:flex;gap:8px;margin-top:14px}
.m{flex:1;min-width:0;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--tile);
  border:1px solid var(--tileb);color:var(--icon);font-size:12.5px;font-weight:600;transition:background .3s,color .3s,box-shadow .3s}
.m span{display:none}
.m.on{background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);border-color:transparent;box-shadow:0 8px 20px -10px var(--a2)}
.ol .m.on{background:color-mix(in srgb,var(--a2) 16%,transparent);color:var(--a1);border-color:var(--a2);box-shadow:none}
.m.on.off{background:var(--tx);color:var(--solid);box-shadow:none;border-color:transparent}
.row.fan{cursor:pointer}
.row.fan:active{transform:scale(.98)}
@container (min-width:600px){.m span{display:inline}}
`;
      }
      getCardSize() {
        return 5;
      }
      _ids() {
        const c = this._cfg;
        return [c.entity, c.power, c.energy, c.humidity].filter(Boolean);
      }
      _extra() {
        return String(this._pendT);
      }
      _powerW() {
        return this._cfg.power ? watts(st(this._hass, this._cfg.power)) : null;
      }
      _running(s) {
        if (unav(s)) return false;
        if (dom(this._cfg.entity) === "climate") return s.state !== "off";
        if (!isOn(s)) return false;
        const w = this._powerW();
        return w == null ? true : w > (+this._cfg.power_threshold || 0);
      }
      _target(s) {
        const a = s.attributes.temperature;
        if (this._pendT != null) {
          if (Date.now() - this._pendAt > 30000 || (a != null && Math.abs(a - this._pendT) < 0.01 && !this._tT))
            this._pendT = null;
          else return this._pendT;
        }
        return a;
      }
      _html() {
        const c = this._cfg,
          h = this._hass,
          id = c.entity;
        if (!id)
          return this._wrap(
            this._head(c.icon, c.name, "Not set up", "", false) +
              '<div class="empty">Open the card settings and pick your AC.</div>',
          );
        const s = st(h, id),
          u = unav(s),
          run = this._running(s),
          w = this._powerW(),
          clim = dom(id) === "climate";
        const badge =
          '<span class="badge' +
          (run ? " on" : "") +
          '">' +
          (u
            ? "Offline"
            : run
              ? "AC on" + (w != null ? " \u00b7 " + (w / 1000).toFixed(2) + " kW" : "")
              : isOn(s)
                ? "Idle"
                : "Off") +
          "</span>";
        if (u)
          return this._wrap(
            this._head(c.icon, c.name, "Offline", badge, false, ' data-a="more"') +
              '<div class="empty">This AC is offline right now.</div>',
          );
        let sub,
          dial,
          rows = [],
          extra = "";
        if (clim) {
          const a = s.attributes,
            tgt = this._target(s);
          const mn = a.min_temp != null ? +a.min_temp : 16,
            mx = a.max_temp != null ? +a.max_temp : 30;
          sub = run
            ? (ACTION[a.hvac_action] || (MODES[s.state] || [s.state])[0]) +
              (tgt != null ? " to " + (+tgt).toFixed(tgt % 1 ? 1 : 0) + DEG : "")
            : "Off";
          const btns =
            tgt != null
              ? '<button class="dm" data-a="tm" aria-label="Lower"><ha-icon icon="mdi:minus"></ha-icon></button><button class="dp" data-a="tp" aria-label="Higher"><ha-icon icon="mdi:plus"></ha-icon></button>'
              : "";
          dial = this._dial(
            tgt == null ? 0 : (tgt - mn) / (mx - mn || 1),
            run,
            '<div class="v">' +
              (tgt == null ? "--" : (+tgt).toFixed(tgt % 1 ? 1 : 0)) +
              "<small>" +
              DEG +
              '</small></div><div class="lb">' +
              (run ? "Set to" : "Off") +
              "</div>",
            btns,
          );
          if (a.current_temperature != null) rows.push(["Room", (+a.current_temperature).toFixed(1) + DEG]);
          const hu = c.humidity ? num(st(h, c.humidity)) : a.current_humidity;
          if (hu != null) rows.push(["Humidity", Math.round(hu) + "%"]);
          if (w != null) rows.push(["Power", (w / 1000).toFixed(2) + " kW"]);
          const fans = a.fan_modes || [];
          if (fans.length) rows.push(["Fan", short(a.fan_mode || "-"), "fan"]);
          const modes = (a.hvac_modes || []).filter((m) => MODES[m]);
          if (modes.length)
            extra =
              '<div class="modes">' +
              modes
                .map(
                  (m) =>
                    '<button class="m' +
                    (s.state === m ? " on" : "") +
                    (m === "off" ? " off" : "") +
                    '" data-a="mode" data-v="' +
                    esc(m) +
                    '" title="' +
                    MODES[m][0] +
                    '"><ha-icon icon="' +
                    MODES[m][1] +
                    '"></ha-icon><span>' +
                    MODES[m][0] +
                    "</span></button>",
                )
                .join("") +
              "</div>";
        } else {
          sub = run ? "Running" : isOn(s) ? "On, not cooling" : "Off";
          const max = +c.max_power || 2500;
          dial = this._dial(
            w == null ? (isOn(s) ? 1 : 0) : w / max,
            run,
            w != null
              ? '<div class="v sm">' + (w / 1000).toFixed(2) + '<small>kW</small></div><div class="lb">Power</div>'
              : '<div class="v">' + (isOn(s) ? "On" : "Off") + '</div><div class="lb">State</div>',
          );
          rows.push(["State", run ? "Running" : isOn(s) ? "On" : "Off"]);
          if (w != null) rows.push(["Power", Math.round(w) + " W"]);
          const e = c.energy ? num(st(h, c.energy)) : null;
          if (e != null) rows.push(["Energy", e.toFixed(2) + " " + (unit(st(h, c.energy)) || "kWh")]);
          extra =
            '<div class="modes"><button class="m' +
            (isOn(s) ? " on" : " on off") +
            '" data-a="pw"><ha-icon icon="mdi:power"></ha-icon><span style="display:inline">' +
            (isOn(s) ? "Turn off" : "Turn on") +
            "</span></button></div>";
        }
        const side =
          '<div class="side" style="--rc:' +
          Math.min(3, rows.length || 1) +
          '">' +
          rows
            .slice(0, 3)
            .map(
              (r) =>
                '<div class="row' +
                (r[2] ? " " + r[2] : "") +
                '"' +
                (r[2] === "fan" ? ' data-a="fan"' : "") +
                "><span>" +
                r[0] +
                "</span><b>" +
                esc(r[1]) +
                "</b></div>",
            )
            .join("") +
          "</div>";
        return this._wrap(
          this._head(c.icon, c.name, sub, badge, run, ' data-a="more"') +
            '<div class="dx">' +
            dial +
            side +
            "</div>" +
            extra,
        );
      }
      _act(a, v, el) {
        const c = this._cfg,
          id = c.entity,
          s = st(this._hass, id);
        if (!id) return;
        if (a === "more" || unav(s)) return this._more(id);
        if (a === "pw") {
          if (dom(id) === "climate")
            this._call("climate", s.state === "off" ? "turn_on" : "turn_off", { entity_id: id });
          else this._call("homeassistant", "toggle", { entity_id: id });
        } else if (a === "mode") {
          this.shadowRoot.querySelectorAll(".m").forEach((m) => m.classList.toggle("on", m === el));
          this._call("climate", "set_hvac_mode", { entity_id: id, hvac_mode: v });
        } else if (a === "fan") {
          const f = s.attributes.fan_modes || [];
          if (!f.length) return;
          const nx = f[(f.indexOf(s.attributes.fan_mode) + 1) % f.length];
          el.querySelector("b").textContent = short(nx);
          this._call("climate", "set_fan_mode", { entity_id: id, fan_mode: nx });
        } else if (a === "tp" || a === "tm") {
          const at = s.attributes;
          const step = +at.target_temp_step || (/F/.test(at.temperature_unit || "") ? 1 : 0.5);
          const cur = this._target(s);
          if (cur == null) return;
          let nv = Math.round((+cur + (a === "tp" ? step : -step)) / step) * step;
          if (at.min_temp != null) nv = Math.max(+at.min_temp, nv);
          if (at.max_temp != null) nv = Math.min(+at.max_temp, nv);
          this._pendT = nv;
          this._pendAt = Date.now();
          clearTimeout(this._tT);
          this._tT = setTimeout(() => {
            this._tT = null;
            this._call("climate", "set_temperature", { entity_id: id, temperature: nv });
          }, 700);
          this._redraw();
        }
      }
      static getConfigElement() {
        return mkEditor("ac");
      }
      static getStubConfig(h) {
        const e =
          pick(h, (id) => dom(id) === "climate", 1)[0] ||
          pick(h, (id) => dom(id) === "switch" && /ac|air/.test(id), 1)[0];
        return { name: "Bedroom AC", icon: "mdi:air-conditioner", entity: e || "" };
      }
    }

    // Scenes card
    const SCENE_ICON = [
      [/off|shut/i, "mdi:power"],
      [/leave|away|exit|bye/i, "mdi:exit-run"],
      [/movie|cinema|tv/i, "mdi:movie-open"],
      [/night|sleep|bed/i, "mdi:weather-night"],
      [/morning|wake|sun/i, "mdi:weather-sunny"],
      [/welcome|home|arrive/i, "mdi:home-heart"],
      [/party/i, "mdi:party-popper"],
      [/relax|chill|read/i, "mdi:sofa"],
      [/dinner|eat|kitchen/i, "mdi:silverware-fork-knife"],
      [/guest/i, "mdi:account-group"],
    ];
    class EIScenesCard extends EIBase {
      static get defaults() {
        return { title: "Scenes", icon: "mdi:palette-outline", scenes: [], off_scenes: [], turn_off: [] };
      }
      getCardSize() {
        return 3;
      }
      _ids() {
        return asList(this._cfg.scenes).map((e) => e.entity);
      }
      _extra() {
        return this._fl || "";
      }
      _html() {
        const c = this._cfg,
          h = this._hass,
          list = asList(c.scenes);
        const head = c.title
          ? this._head(c.icon, c.title, list.length ? list.length + " scenes" : "", "", !!this._fl, ' data-a="none"')
          : "";
        if (!list.length)
          return this._wrap(head + '<div class="empty">Open the card settings and pick your scenes.</div>');
        const L = tileLayout(list.length, this._width());
        const offs = asList(c.off_scenes).map((e) => e.entity);
        return this._wrap(
          head +
            '<div class="grid" style="--th:' +
            L.th +
            "px;" +
            (head ? "" : "margin-top:0") +
            '">' +
            list
              .map((e, i) => {
                const s = st(h, e.entity),
                  nm = e.name || fname(h, e.entity);
                let ic = e.icon || (s && s.attributes.icon);
                if (!ic) {
                  const m = SCENE_ICON.find((r) => r[0].test(nm));
                  ic = m ? m[1] : iconFor(s, e.entity);
                }
                const sub = offs.includes(e.entity) ? "All off" : dom(e.entity) === "script" ? "Script" : "Scene";
                return (
                  '<button class="t' +
                  (this._fl === e.entity ? " on" : "") +
                  '" style="--sp:' +
                  L.spans[i] +
                  '" data-a="run" data-v="' +
                  esc(e.entity) +
                  '" data-m="' +
                  esc(e.entity) +
                  '">' +
                  '<ha-icon class="ic" icon="' +
                  esc(ic) +
                  '"></ha-icon><span class="tx"><span class="n" style="display:block">' +
                  esc(nm) +
                  '</span><span class="s" style="display:block">' +
                  (this._fl === e.entity ? "Running" : sub) +
                  "</span></span></button>"
                );
              })
              .join("") +
            "</div>",
        );
      }
      _act(a, v) {
        if (a !== "run") return;
        const d = dom(v);
        if (d === "scene") this._call("scene", "turn_on", { entity_id: v });
        else if (d === "script") this._call("script", "turn_on", { entity_id: v });
        else if (d === "button" || d === "input_button") this._call(d, "press", { entity_id: v });
        else if (d === "automation") this._call("automation", "trigger", { entity_id: v });
        else this._call("homeassistant", "turn_on", { entity_id: v });
        const offs = asList(this._cfg.off_scenes).map((e) => e.entity);
        const kill = asList(this._cfg.turn_off).map((e) => e.entity);
        if (offs.includes(v) && kill.length) this._call("homeassistant", "turn_off", { entity_id: kill });
        this._fl = v;
        this._redraw();
        clearTimeout(this._flT);
        this._flT = setTimeout(() => {
          this._fl = "";
          this._redraw();
        }, 1500);
      }
      static getConfigElement() {
        return mkEditor("scenes");
      }
      static getStubConfig(h) {
        return { title: "Scenes", scenes: pick(h, (id) => dom(id) === "scene", 4) };
      }
    }

    // Security card
    const SEC = {
      door: ["Open", "Closed", "mdi:door-open", "mdi:door-closed", "open"],
      garage_door: ["Open", "Closed", "mdi:garage-open", "mdi:garage", "open"],
      opening: ["Open", "Closed", "mdi:square-rounded-outline", "mdi:square-rounded", "open"],
      window: ["Open", "Closed", "mdi:window-open-variant", "mdi:window-closed-variant", "open"],
      motion: ["Motion", "Clear", "mdi:motion-sensor", "mdi:motion-sensor-off", "motion"],
      occupancy: ["Detected", "Clear", "mdi:home-account", "mdi:home-outline", "motion"],
      presence: ["Home", "Away", "mdi:home-account", "mdi:home-outline", "motion"],
      smoke: ["Smoke", "OK", "mdi:smoke-detector-alert", "mdi:smoke-detector", "alarm"],
      gas: ["Gas", "OK", "mdi:gas-cylinder", "mdi:gas-cylinder", "alarm"],
      moisture: ["Wet", "Dry", "mdi:water-alert", "mdi:water-off", "alarm"],
      lock: ["Unlocked", "Locked", "mdi:lock-open-variant", "mdi:lock", "open"],
      cover: ["Open", "Closed", "mdi:window-shutter-open", "mdi:window-shutter", "open"],
    };
    class EISecurityCard extends EIBase {
      static get defaults() {
        return { title: "Security", icon: "mdi:shield-home-outline", entities: [] };
      }
      static get accent() {
        return "alert";
      }
      static get tick() {
        return true;
      }
      static get css() {
        return `
.list{display:grid;gap:8px;margin-top:16px}
.r{display:flex;align-items:center;gap:12px;padding:9px 12px 9px 9px;border-radius:15px;background:var(--tile);border:1px solid var(--tileb);
  width:100%;min-width:0;transition:background .35s,border-color .35s}
.r .ri{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--tx) 6%,transparent);color:var(--icon);transition:.35s}
.r .rn{flex:1;min-width:0;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r .rs{font-size:12.5px;font-weight:600;color:var(--mut);white-space:nowrap}
.caps .r .rs{text-transform:uppercase;letter-spacing:.1em;font-size:10px}
.r .rt{font-size:11.5px;color:var(--mut);min-width:42px;text-align:right;white-space:nowrap}
.r.on{background:linear-gradient(150deg,color-mix(in srgb,var(--a1) 22%,transparent),color-mix(in srgb,var(--a2) 7%,transparent));border-color:color-mix(in srgb,var(--a1) 40%,transparent)}
.r.on .ri{background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;box-shadow:0 0 18px -4px var(--a2)}
.r.on .rs{color:var(--a1)}
.solid .r.on .rs{color:var(--a2)}
.r.mo{background:linear-gradient(150deg,color-mix(in srgb,var(--w1) 22%,transparent),color-mix(in srgb,var(--w2) 7%,transparent));border-color:color-mix(in srgb,var(--w1) 40%,transparent)}
.r.mo .ri{background:linear-gradient(135deg,var(--w1),var(--w2));color:#2a1600;box-shadow:0 0 18px -4px var(--w2)}
.r.mo .rs{color:var(--w1)}
.solid .r.mo .rs{color:var(--w2)}
.r.un{opacity:.45}
.hi.ok{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent);border-color:color-mix(in srgb,var(--ok) 30%,transparent)}
@container (min-width:600px){.list{grid-template-columns:1fr 1fr}}
`;
      }
      getCardSize() {
        return 1 + asList(this._cfg && this._cfg.entities).length;
      }
      _ids() {
        return asList(this._cfg.entities).map((e) => e.entity);
      }
      _kind(id, s) {
        const d = dom(id);
        if (d === "lock" || d === "cover") return SEC[d];
        return SEC[dc(s)] || null;
      }
      _active(id, s) {
        const d = dom(id);
        if (d === "lock") return s.state !== "locked";
        if (d === "cover") return s.state !== "closed";
        return s.state === "on";
      }
      _html() {
        const c = this._cfg,
          h = this._hass,
          list = asList(c.entities);
        let open = 0,
          mot = 0,
          alarm = 0;
        const rows = list
          .map((e) => {
            const s = st(h, e.entity),
              u = unav(s),
              k = this._kind(e.entity, s);
            const act = !u && this._active(e.entity, s),
              g = k ? k[4] : "open";
            if (act) {
              if (g === "motion") mot++;
              else if (g === "alarm") alarm++;
              else open++;
            }
            const txt = u ? "Offline" : k ? (act ? k[0] : k[1]) : act ? "On" : "Off";
            const ic =
              e.icon || (s && s.attributes.icon) || (k ? (act ? k[2] : k[3]) : "mdi:checkbox-blank-circle-outline");
            const cls = act ? (g === "motion" ? " mo" : " on") : "";
            return (
              '<button class="r' +
              cls +
              (u ? " un" : "") +
              '" data-a="more" data-v="' +
              esc(e.entity) +
              '">' +
              '<span class="ri"><ha-icon icon="' +
              esc(ic) +
              '"></ha-icon></span><span class="rn">' +
              esc(e.name || fname(h, e.entity)) +
              "</span>" +
              '<span class="rs">' +
              txt +
              '</span><span class="rt">' +
              (s ? ago(s.last_changed) : "") +
              "</span></button>"
            );
          })
          .join("");
        const parts = [];
        if (alarm) parts.push(alarm + " alarm");
        if (open) parts.push(open + " open");
        if (mot) parts.push(mot + " motion");
        const bad = alarm + open > 0;
        const pill = list.length
          ? '<span class="pill ' +
            (bad ? "al" : "ok") +
            '">' +
            (parts.length ? parts.join(" \u00b7 ") : "All secure") +
            "</span>"
          : "";
        const sub = list.length ? list.length + " sensors" : "";
        const head =
          '<div class="hd"><button class="hi ' +
          (bad ? "on" : "ok") +
          '" data-a="none"><ha-icon icon="' +
          esc(bad ? "mdi:shield-alert-outline" : c.icon) +
          '"></ha-icon></button>' +
          '<div class="ti"><div class="nm">' +
          esc(c.title) +
          '</div><div class="sb">' +
          sub +
          "</div></div>" +
          pill +
          "</div>";
        const body = list.length
          ? '<div class="list">' + rows + "</div>"
          : '<div class="empty">Open the card settings and pick door, window and motion sensors.</div>';
        return this._wrap(head + body);
      }
      _act(a, v) {
        if (a === "more") this._more(v);
      }
      static getConfigElement() {
        return mkEditor("security");
      }
      static getStubConfig(h) {
        return {
          title: "Security",
          entities: pick(
            h,
            (id, s) => dom(id) === "binary_sensor" && ["door", "window", "motion", "opening"].includes(dc(s)),
            4,
          ),
        };
      }
    }

    // Energy card
    class EIEnergyCard extends EIBase {
      static get defaults() {
        return { name: "Energy", icon: "mdi:lightning-bolt", max_power: 5000 };
      }
      getCardSize() {
        return 4;
      }
      _ids() {
        const c = this._cfg;
        return [c.power, c.voltage, c.current, c.energy].filter(Boolean);
      }
      _html() {
        const c = this._cfg,
          h = this._hass;
        const w = c.power ? watts(st(h, c.power)) : null;
        const max = +c.max_power || 5000;
        const rows = [
          ["Voltage", c.voltage, 1, "V"],
          ["Current", c.current, 2, "A"],
          ["Energy", c.energy, 2, "kWh"],
        ]
          .filter((t) => t[1])
          .map((t) => {
            const s = st(h, t[1]);
            return (
              '<button class="row" data-a="more" data-v="' +
              esc(t[1]) +
              '"><span>' +
              t[0] +
              "</span><b>" +
              fix(num(s), t[2]) +
              " " +
              esc(unit(s) || t[3]) +
              "</b></button>"
            );
          });
        if (!c.power && !rows.length)
          return this._wrap(
            this._head(c.icon, c.name, "Not set up", "", false) +
              '<div class="empty">Open the card settings and pick a power sensor.</div>',
          );
        const live = w != null && w > 0;
        const big =
          w == null
            ? "--<small>W</small>"
            : w >= 1000
              ? (w / 1000).toFixed(2) + "<small>kW</small>"
              : Math.round(w) + "<small>W</small>";
        const pct = w == null ? 0 : w / max;
        const badge =
          '<span class="badge' +
          (live ? " on" : "") +
          '">' +
          (w == null ? "No data" : Math.round(pct * 100) + "% load") +
          "</span>";
        const dial = c.power
          ? '<button data-a="more" data-v="' +
            esc(c.power) +
            '" style="border-radius:50%">' +
            this._dial(
              pct,
              live,
              '<div class="v' +
                (w != null && w >= 1000 ? " sm" : "") +
                '">' +
                big +
                '</div><div class="lb">Live power</div>',
            ) +
            "</button>"
          : "";
        return this._wrap(
          this._head(c.icon, c.name, live ? "Using power now" : "Standby", badge, live, ' data-a="none"') +
            '<div class="dx">' +
            dial +
            (rows.length ? '<div class="side" style="--rc:' + rows.length + '">' + rows.join("") + "</div>" : "") +
            "</div>",
        );
      }
      _act(a, v) {
        if (a === "more") this._more(v);
      }
      static getConfigElement() {
        return mkEditor("energy");
      }
      static getStubConfig(h) {
        const f = (d) => pick(h, (id, s) => dom(id) === "sensor" && dc(s) === d, 1)[0];
        const o = { name: "Energy", icon: "mdi:lightning-bolt" };
        [
          ["power", "power"],
          ["voltage", "voltage"],
          ["current", "current"],
          ["energy", "energy"],
        ].forEach((p) => {
          const e = f(p[1]);
          if (e) o[p[0]] = e;
        });
        return o;
      }
    }

    // Page looks: background, top bar, sidebar, titles and dialogs
    const PAGE_THEMES = {
      midnight: {
        "primary-background-color": "#0a0f1d",
        "secondary-background-color": "#121a2e",
        "lovelace-background": "radial-gradient(120% 70% at 0% 0%, #18233f 0%, #0a0f1d 60%, #070a14 100%)",
        "primary-text-color": "#ffffff",
        "secondary-text-color": "#93a0bd",
        "disabled-text-color": "#5d6884",
        "primary-color": "#38bdf8",
        "accent-color": "#ffb347",
        "app-header-background-color": "#0b1222",
        "app-header-text-color": "#e6ecfa",
        "app-header-border-bottom": "1px solid rgba(255,255,255,0.06)",
        "card-background-color": "#111a31",
        "ha-card-background": "#111a31",
        "ha-card-border-color": "rgba(255,255,255,0.08)",
        "divider-color": "rgba(255,255,255,0.08)",
        "sidebar-background-color": "#0b1222",
        "sidebar-text-color": "#c9d3ea",
        "sidebar-icon-color": "#8592b0",
        "sidebar-selected-text-color": "#ffd27a",
        "sidebar-selected-icon-color": "#ffd27a",
        "state-icon-color": "#8592b0",
        "mdc-theme-surface": "#111a31",
        "ha-dialog-surface-background": "#111a31",
        "code-editor-background-color": "#0e162b",
        "rgb-primary-text-color": "255, 255, 255",
        "rgb-primary-color": "56, 189, 248",
      },
      gold: {
        "primary-background-color": "#0d0c0b",
        "secondary-background-color": "#171513",
        "lovelace-background": "linear-gradient(180deg, #141210 0%, #0a0908 100%)",
        "primary-text-color": "#f5eee4",
        "secondary-text-color": "#9b9081",
        "disabled-text-color": "#5f574e",
        "primary-color": "#d4b27a",
        "accent-color": "#f0d29a",
        "app-header-background-color": "#0f0d0c",
        "app-header-text-color": "#e2c48d",
        "app-header-border-bottom": "1px solid #2a2520",
        "card-background-color": "#191614",
        "ha-card-background": "#191614",
        "ha-card-border-color": "#2f2a25",
        "divider-color": "#2f2a25",
        "sidebar-background-color": "#0f0d0c",
        "sidebar-text-color": "#cbb894",
        "sidebar-icon-color": "#776d61",
        "sidebar-selected-text-color": "#f0d29a",
        "sidebar-selected-icon-color": "#f0d29a",
        "state-icon-color": "#776d61",
        "mdc-theme-surface": "#191614",
        "ha-dialog-surface-background": "#191614",
        "code-editor-background-color": "#141210",
        "rgb-primary-text-color": "245, 238, 228",
        "rgb-primary-color": "212, 178, 122",
      },
      amber: {
        "primary-background-color": "#f1eee8",
        "secondary-background-color": "#e9e5dd",
        "lovelace-background": "linear-gradient(180deg, #f6f3ee 0%, #ece8e0 100%)",
        "primary-text-color": "#1c1917",
        "secondary-text-color": "#78716c",
        "disabled-text-color": "#b5aea6",
        "primary-color": "#f59e0b",
        "accent-color": "#f59e0b",
        "app-header-background-color": "#ffffff",
        "app-header-text-color": "#1c1917",
        "app-header-border-bottom": "1px solid rgba(28,25,23,0.06)",
        "card-background-color": "#ffffff",
        "ha-card-background": "#ffffff",
        "ha-card-border-color": "rgba(28,25,23,0.06)",
        "divider-color": "rgba(28,25,23,0.08)",
        "sidebar-background-color": "#ffffff",
        "sidebar-text-color": "#44403c",
        "sidebar-icon-color": "#8a827a",
        "sidebar-selected-text-color": "#d97706",
        "sidebar-selected-icon-color": "#d97706",
        "state-icon-color": "#8a827a",
        "mdc-theme-surface": "#ffffff",
        "ha-dialog-surface-background": "#ffffff",
        "code-editor-background-color": "#f6f3ee",
        "rgb-primary-text-color": "28, 25, 23",
        "rgb-primary-color": "245, 158, 11",
      },
      mix: {
        "primary-background-color": "#e6e8ec",
        "secondary-background-color": "#d9dce2",
        "lovelace-background": "linear-gradient(180deg, #eceef1 0%, #dfe2e7 100%)",
        "primary-text-color": "#1f2328",
        "secondary-text-color": "#6b7280",
        "disabled-text-color": "#a9aeb6",
        "primary-color": "#3b82f6",
        "accent-color": "#f59e0b",
        "app-header-background-color": "#eceef1",
        "app-header-text-color": "#1f2328",
        "app-header-border-bottom": "1px solid rgba(31,35,40,0.06)",
        "card-background-color": "#ffffff",
        "ha-card-background": "#ffffff",
        "ha-card-border-color": "rgba(31,35,40,0.06)",
        "divider-color": "rgba(31,35,40,0.08)",
        "sidebar-background-color": "#eceef1",
        "sidebar-text-color": "#374151",
        "sidebar-icon-color": "#6b7280",
        "sidebar-selected-text-color": "#1f2328",
        "sidebar-selected-icon-color": "#1f2328",
        "state-icon-color": "#6b7280",
        "mdc-theme-surface": "#ffffff",
        "ha-dialog-surface-background": "#ffffff",
        "code-editor-background-color": "#f3f4f6",
        "rgb-primary-text-color": "31, 35, 40",
        "rgb-primary-color": "59, 130, 246",
      },
      mix_dark: {
        "primary-background-color": "#17181b",
        "secondary-background-color": "#222429",
        "lovelace-background": "linear-gradient(180deg, #1c1d21 0%, #121316 100%)",
        "primary-text-color": "#f3f4f6",
        "secondary-text-color": "#9ca3af",
        "disabled-text-color": "#5b6069",
        "primary-color": "#60a5fa",
        "accent-color": "#fbbf24",
        "app-header-background-color": "#17181b",
        "app-header-text-color": "#f3f4f6",
        "app-header-border-bottom": "1px solid rgba(255,255,255,0.06)",
        "card-background-color": "#202226",
        "ha-card-background": "#202226",
        "ha-card-border-color": "rgba(255,255,255,0.07)",
        "divider-color": "rgba(255,255,255,0.08)",
        "sidebar-background-color": "#141518",
        "sidebar-text-color": "#d1d5db",
        "sidebar-icon-color": "#8b9099",
        "sidebar-selected-text-color": "#ffffff",
        "sidebar-selected-icon-color": "#ffffff",
        "state-icon-color": "#8b9099",
        "mdc-theme-surface": "#202226",
        "ha-dialog-surface-background": "#202226",
        "code-editor-background-color": "#1c1d21",
        "rgb-primary-text-color": "243, 244, 246",
        "rgb-primary-color": "96, 165, 250",
      },
    };
    const PAGE_OPTS = [
      { value: "midnight", label: "Midnight Glow (dark blue)" },
      { value: "gold", label: "Luxe Gold (black and gold)" },
      { value: "amber", label: "Amber Light (white and amber)" },
      { value: "mix", label: "Mix - light grey (cards keep their own look)" },
      { value: "mix_dark", label: "Mix - dark grey (cards keep their own look)" },
    ];
    const WEATHER_ICON = {
      "clear-night": "mdi:weather-night",
      cloudy: "mdi:weather-cloudy",
      fog: "mdi:weather-fog",
      hail: "mdi:weather-hail",
      lightning: "mdi:weather-lightning",
      "lightning-rainy": "mdi:weather-lightning-rainy",
      partlycloudy: "mdi:weather-partly-cloudy",
      pouring: "mdi:weather-pouring",
      rainy: "mdi:weather-rainy",
      snowy: "mdi:weather-snowy",
      sunny: "mdi:weather-sunny",
      windy: "mdi:weather-windy",
      exceptional: "mdi:alert-circle-outline",
    };

    // Page Style card
    class EIPageCard extends EIBase {
      static get defaults() {
        return { style: "midnight", banner: true, cards_follow: true };
      }
      static get tick() {
        return true;
      }
      static get css() {
        return `
.card.hero{padding:22px 22px 20px}
.card.bare{background:transparent;border-color:transparent;box-shadow:none;padding:6px 4px 4px}
.top{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}
.gr{font-size:30px;font-weight:var(--fw);letter-spacing:-.02em;line-height:1.1}
.dt{font-size:13.5px;color:var(--mut);margin-top:6px}
.caps .dt{text-transform:uppercase;letter-spacing:.14em;font-size:11px}
.chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;margin-top:18px}
.chip{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:16px;background:var(--tile);border:1px solid var(--tileb);min-width:0}
.chip .ci{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--tx) 6%,transparent);color:var(--icon)}
.chip.on .ci{background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);box-shadow:0 0 18px -4px var(--a2)}
.ol .chip.on .ci{background:color-mix(in srgb,var(--a2) 18%,transparent);color:var(--a1);border:1px solid var(--a2)}
.chip .cv{font-size:16px;font-weight:700;line-height:1.1;white-space:nowrap}
.chip .cl{font-size:11.5px;color:var(--mut);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.caps .chip .cl{text-transform:uppercase;letter-spacing:.1em;font-size:9.5px}
.mini{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:1px dashed var(--tileb);color:var(--mut);font-size:13px}
@container (max-width:360px){.gr{font-size:25px}.chips{grid-template-columns:1fr 1fr;gap:8px}.chip{padding:9px 10px}.chip .ci{width:34px;height:34px}}
@container (min-width:700px){.gr{font-size:36px}.chips{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
      }
      getCardSize() {
        return this._cfg && this._cfg.banner === false ? 1 : 3;
      }
      _pageKey() {
        const k = ALIAS[this._cfg.style] || this._cfg.style;
        return PAGE_THEMES[k] ? k : "midnight";
      }
      _ids() {
        const c = this._cfg;
        return [c.weather, c.power].filter(Boolean);
      }
      _extra() {
        const h = this._hass;
        if (!h) return "";
        let s = "";
        for (const id in h.states) {
          const d = dom(id);
          if (d === "light" || d === "climate" || d === "person") s += h.states[id].state[0];
        }
        return s + "|" + new Date().getMinutes() + "|" + this._isEditing();
      }
      _isEditing() {
        return !!this.preview || /[?&]edit=1/.test(location.search);
      }
      connectedCallback() {
        super.connectedCallback();
        PAGE.cards.add(this);
        this._apply();
        if (!this._onLoc) this._onLoc = () => this._redraw();
        window.addEventListener("location-changed", this._onLoc);
      }
      disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("location-changed", this._onLoc);
        PAGE.cards.delete(this);
        this._restore();
        const other = Array.from(PAGE.cards).pop();
        if (other) other._apply();
      }
      setConfig(c) {
        super.setConfig(c);
        if (this.isConnected) this._apply();
      }
      _apply() {
        if (!this._cfg) return;
        const k = this._pageKey(),
          t = PAGE_THEMES[k],
          root = document.documentElement;
        if (!this._saved) this._saved = {};
        Object.keys(t).forEach((n) => {
          const v = "--" + n;
          if (!(v in this._saved)) this._saved[v] = root.style.getPropertyValue(v);
          root.style.setProperty(v, t[n]);
        });
        PAGE.style = STYLES[k] ? k : null;
        PAGE.follow = !!STYLES[k] && this._cfg.cards_follow !== false;
        PAGE.owner = this;
        window.dispatchEvent(new Event("ei-page-change"));
      }
      _restore() {
        if (!this._saved) return;
        const root = document.documentElement;
        Object.keys(this._saved).forEach((v) => {
          if (this._saved[v]) root.style.setProperty(v, this._saved[v]);
          else root.style.removeProperty(v);
        });
        this._saved = null;
        if (PAGE.owner === this) {
          PAGE.style = null;
          PAGE.follow = false;
          PAGE.owner = null;
        }
        window.dispatchEvent(new Event("ei-page-change"));
      }
      _greeting() {
        const hr = new Date().getHours();
        return hr < 5 ? "Good night" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
      }
      _html() {
        const c = this._cfg,
          h = this._hass,
          k = this._pageKey();
        const label = (PAGE_OPTS.find((o) => o.value === k) || PAGE_OPTS[0]).label;
        const hidden = c.banner === false;
        const show = !hidden || this._isEditing();
        if (this.hidden !== !show) {
          this.hidden = !show;
          this.dispatchEvent(new Event("card-visibility-changed", { bubbles: true, composed: true }));
        }
        if (hidden)
          return this._wrap(
            '<div class="mini"><ha-icon icon="mdi:palette-swatch-outline"></ha-icon><span>Page style: ' +
              esc(label) +
              " (hidden when not editing)</span></div>",
            "bare",
          );
        const now = new Date();
        const date = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
        const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const chips = [];
        if (h) {
          const ids = Object.keys(h.states);
          const lights = ids.filter((id) => dom(id) === "light");
          const lon = lights.filter((id) => h.states[id].state === "on").length;
          if (lights.length) chips.push(["mdi:lightbulb-group", lon ? lon + " on" : "All off", "Lights", lon > 0]);
          const acs = ids.filter((id) => dom(id) === "climate" && !unav(h.states[id]));
          const aon = acs.filter((id) => h.states[id].state !== "off").length;
          if (acs.length) chips.push(["mdi:air-conditioner", aon ? aon + " running" : "All off", "AC", aon > 0]);
          const ppl = ids.filter((id) => dom(id) === "person");
          const home = ppl.filter((id) => h.states[id].state === "home").length;
          if (ppl.length) chips.push(["mdi:home-account", home + " of " + ppl.length, "At home", home > 0]);
          const wid = c.weather || ids.find((id) => dom(id) === "weather");
          const w = st(h, wid);
          if (w && !unav(w)) {
            const tp = w.attributes.temperature;
            chips.push([
              WEATHER_ICON[w.state] || "mdi:weather-partly-cloudy",
              tp != null ? Math.round(tp) + DEG : short(w.state),
              short(String(w.state).replace(/-/g, " ").replace("partlycloudy", "partly cloudy")),
              false,
            ]);
          }
          const pw = c.power ? watts(st(h, c.power)) : null;
          if (pw != null)
            chips.push([
              "mdi:lightning-bolt",
              pw >= 1000 ? (pw / 1000).toFixed(2) + " kW" : Math.round(pw) + " W",
              "Power now",
              pw > 0,
            ]);
        }
        const chipHtml = chips.length
          ? '<div class="chips">' +
            chips
              .slice(0, 4)
              .map(
                (x) =>
                  '<div class="chip' +
                  (x[3] ? " on" : "") +
                  '"><span class="ci"><ha-icon icon="' +
                  x[0] +
                  '"></ha-icon></span><span style="min-width:0"><div class="cv">' +
                  esc(x[1]) +
                  '</div><div class="cl">' +
                  esc(x[2]) +
                  "</div></span></div>",
              )
              .join("") +
            "</div>"
          : "";
        const mix = !STYLES[k];
        const inner =
          '<div class="top"><div><div class="gr">' +
          esc(c.title || this._greeting()) +
          '</div><div class="dt">' +
          esc(date + " \u00b7 " + time) +
          "</div></div></div>" +
          chipHtml;
        if (mix) {
          const saved = this._cfg;
          this._cfg = Object.assign({}, saved, { style: "theme" });
          const out = this._wrap(inner, "hero bare");
          this._cfg = saved;
          return out;
        }
        const saved = this._cfg;
        this._cfg = Object.assign({}, saved, { style: k });
        const out = this._wrap(inner, "hero");
        this._cfg = saved;
        return out;
      }
      static getConfigElement() {
        return mkEditor("page");
      }
      static getStubConfig() {
        return { style: "midnight", banner: true };
      }
    }

    // TV remote card
    const buzz = () => {
      try {
        if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive))
          navigator.vibrate(8);
      } catch (e) {}
    };
    const RC_KEYS = {
      android_tv: {
        up: "DPAD_UP",
        down: "DPAD_DOWN",
        left: "DPAD_LEFT",
        right: "DPAD_RIGHT",
        ok: "DPAD_CENTER",
        back: "BACK",
        home: "HOME",
        menu: "MENU",
        ch_up: "CHANNEL_UP",
        ch_down: "CHANNEL_DOWN",
      },
      apple_tv: {
        up: "up",
        down: "down",
        left: "left",
        right: "right",
        ok: "select",
        back: "menu",
        home: "home",
        menu: "top_menu",
      },
      roku: {
        up: "up",
        down: "down",
        left: "left",
        right: "right",
        ok: "select",
        back: "back",
        home: "home",
        menu: "info",
        ch_up: "channel_up",
        ch_down: "channel_down",
      },
      samsung: {
        up: "KEY_UP",
        down: "KEY_DOWN",
        left: "KEY_LEFT",
        right: "KEY_RIGHT",
        ok: "KEY_ENTER",
        back: "KEY_RETURN",
        home: "KEY_HOME",
        menu: "KEY_MENU",
        ch_up: "KEY_CHUP",
        ch_down: "KEY_CHDOWN",
      },
      lg: {
        up: "UP",
        down: "DOWN",
        left: "LEFT",
        right: "RIGHT",
        ok: "ENTER",
        back: "BACK",
        home: "HOME",
        menu: "MENU",
        ch_up: "CHANNELUP",
        ch_down: "CHANNELDOWN",
      },
      fire_tv: {
        up: "UP",
        down: "DOWN",
        left: "LEFT",
        right: "RIGHT",
        ok: "CENTER",
        back: "BACK",
        home: "HOME",
        menu: "MENU",
      },
    };
    const RC_PLATFORM = {
      androidtv_remote: "android_tv",
      apple_tv: "apple_tv",
      roku: "roku",
      samsungtv: "samsung",
      webostv: "lg",
      androidtv: "fire_tv",
    };
    const RC_OPTS = [
      { value: "auto", label: "Auto detect" },
      { value: "android_tv", label: "Android TV / Google TV" },
      { value: "apple_tv", label: "Apple TV" },
      { value: "lg", label: "LG webOS" },
      { value: "samsung", label: "Samsung" },
      { value: "roku", label: "Roku" },
      { value: "fire_tv", label: "Fire TV / Android (ADB)" },
      { value: "ir", label: "IR blaster (Broadlink and others)" },
    ];
    class EIRemoteCard extends EIBase {
      static get defaults() {
        return { name: "Living Room TV", icon: "mdi:television", platform: "auto", show_apps: true };
      }
      static get accent() {
        return "cool";
      }
      static get css() {
        return `
.np{display:flex;align-items:center;gap:12px;margin-top:14px;padding:10px;border-radius:16px;background:var(--tile);border:1px solid var(--tileb);min-width:0}
.np .art{width:46px;height:46px;border-radius:12px;flex:none;background:var(--track) center/cover no-repeat;display:grid;place-items:center;color:var(--mut)}
.np .nt{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.np .na{font-size:12px;color:var(--mut);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pwr{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--tile);border:1px solid var(--tileb);color:var(--mut);transition:.3s}
.pwr.on{background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);border-color:transparent;box-shadow:0 8px 20px -10px var(--a2)}
.ol .pwr.on{background:color-mix(in srgb,var(--a2) 16%,transparent);color:var(--a1);border-color:var(--a2)}
.rm{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px}
.pad{--ps:196px;width:var(--ps);height:var(--ps);border-radius:50%;position:relative;flex:none;background:var(--tile);border:1px solid var(--tileb);
  box-shadow:inset 0 2px 10px rgba(0,0,0,.12)}
.pad .k{position:absolute;width:56px;height:56px;display:grid;place-items:center;border-radius:50%;color:var(--tx);transition:background .15s,transform .1s}
.pad .k:active{background:color-mix(in srgb,var(--a1) 22%,transparent);transform:scale(.92)}
.pad .k ha-icon{--mdc-icon-size:28px}
.k.u{top:4px;left:calc(50% - 28px)}.k.d{bottom:4px;left:calc(50% - 28px)}.k.l{left:4px;top:calc(50% - 28px)}.k.r{right:4px;top:calc(50% - 28px)}
.ok{position:absolute;inset:calc(50% - 38px);width:76px;height:76px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:15px;letter-spacing:.06em;
  background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);box-shadow:0 10px 24px -10px var(--a2);transition:transform .1s}
.ol .ok{background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--a2) 30%,var(--solid)),var(--solid));color:var(--a1);border:1px solid var(--a2)}
.ok:active{transform:scale(.93)}
.rk{display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:58px;height:170px;border-radius:29px;flex:none;
  background:var(--tile);border:1px solid var(--tileb);padding:6px 0}
.rk button{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:var(--tx);transition:background .15s,transform .1s}
.rk button:active{background:color-mix(in srgb,var(--a1) 22%,transparent);transform:scale(.9)}
.rk .rl{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--mut)}
.rk .rl.on{color:var(--a1)}
.nav{display:flex;justify-content:center;gap:12px;margin-top:16px}
.nav button,.med button{height:46px;min-width:46px;padding:0 16px;border-radius:23px;display:flex;align-items:center;justify-content:center;gap:7px;
  background:var(--tile);border:1px solid var(--tileb);color:var(--tx);font-size:12.5px;font-weight:600;transition:background .15s,transform .1s}
.nav button:active,.med button:active{transform:scale(.94);background:color-mix(in srgb,var(--a1) 18%,var(--tile))}
.med{display:flex;justify-content:center;gap:10px;margin-top:10px}
.med .pp{background:linear-gradient(135deg,var(--a1),var(--a2));color:var(--atx);border-color:transparent;width:64px}
.ol .med .pp{background:color-mix(in srgb,var(--a2) 16%,transparent);color:var(--a1);border-color:var(--a2)}
.apps{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.app{padding:9px 14px;border-radius:13px;background:var(--tile);border:1px solid var(--tileb);font-size:12.5px;font-weight:600;color:var(--tx);transition:.2s}
.app.on{background:color-mix(in srgb,var(--a1) 22%,transparent);border-color:color-mix(in srgb,var(--a1) 45%,transparent);color:var(--a1)}
.solid .app.on{color:var(--a2)}
.off{opacity:.55}
@container (max-width:360px){.pad{--ps:168px}.pad .k{width:48px;height:48px}.k.u,.k.d{left:calc(50% - 24px)}.k.l,.k.r{top:calc(50% - 24px)}
  .ok{width:64px;height:64px;inset:calc(50% - 32px)}.rk{width:50px;height:150px}.rk button{width:40px;height:40px}.rm{gap:10px}
  .nav button span{display:none}.nav button{padding:0 14px}}
@container (min-width:600px){.pad{--ps:220px}.rk{height:190px}.rm{gap:26px}}
`;
      }
      getCardSize() {
        return 8;
      }
      _ids() {
        return [this._cfg.entity, this._cfg.remote].filter(Boolean);
      }
      _platform() {
        const c = this._cfg,
          h = this._hass;
        if (c.platform && c.platform !== "auto") return c.platform;
        const reg = (h && h.entities) || {};
        for (const id of [c.remote, c.entity]) {
          const e = id && reg[id];
          if (e && RC_PLATFORM[e.platform]) return RC_PLATFORM[e.platform];
        }
        return c.remote ? "android_tv" : "fire_tv";
      }
      _send(key) {
        const c = this._cfg,
          pf = this._platform();
        const custom = c.commands && c.commands[key];
        buzz();
        if (custom) {
          if (typeof custom === "object" && custom.service) {
            const p = String(custom.service).split(".");
            return this._call(p[0], p[1], custom.data || {});
          }
          return this._call(
            "remote",
            "send_command",
            Object.assign({ entity_id: c.remote, command: String(custom) }, c.device ? { device: c.device } : {}),
          );
        }
        const code = (RC_KEYS[pf] || {})[key];
        if (pf === "lg" && code && c.entity)
          return this._call("webostv", "button", { entity_id: c.entity, button: code });
        if (pf === "fire_tv" && code && c.entity)
          return this._call("androidtv", "adb_command", { entity_id: c.entity, command: code });
        if (c.remote)
          return this._call(
            "remote",
            "send_command",
            Object.assign({ entity_id: c.remote, command: code || key }, c.device ? { device: c.device } : {}),
          );
      }
      _media(key) {
        const c = this._cfg,
          s = st(this._hass, c.entity);
        const custom = c.commands && c.commands[key];
        if (custom || !c.entity || !s) return this._send(key);
        buzz();
        const map = {
          vol_up: "volume_up",
          vol_down: "volume_down",
          play_pause: "media_play_pause",
          next: "media_next_track",
          prev: "media_previous_track",
        };
        if (key === "mute")
          return this._call("media_player", "volume_mute", {
            entity_id: c.entity,
            is_volume_muted: !s.attributes.is_volume_muted,
          });
        if (key === "power")
          return this._call(
            "media_player",
            isOn(s) || s.state === "idle" || s.state === "paused" ? "turn_off" : "turn_on",
            { entity_id: c.entity },
          );
        if (map[key]) return this._call("media_player", map[key], { entity_id: c.entity });
      }
      _html() {
        const c = this._cfg,
          h = this._hass;
        if (!c.entity && !c.remote)
          return this._wrap(
            this._head(c.icon, c.name, "Not set up", "", false) +
              '<div class="empty">Open the card settings and pick your TV.</div>',
          );
        const s = st(h, c.entity) || st(h, c.remote);
        const a = (s && s.attributes) || {};
        const on = !!s && !unav(s) && s.state !== "off" && s.state !== "standby";
        const stateTxt = unav(s)
          ? "Offline"
          : !on
            ? "Off"
            : a.source
              ? short(s.state) + " \u00b7 " + a.source
              : short(s.state);
        const pwr =
          '<button class="pwr' +
          (on ? " on" : "") +
          '" data-a="power" aria-label="Power"><ha-icon icon="mdi:power"></ha-icon></button>';
        let np = "";
        if (on && (a.media_title || a.app_name)) {
          const pic = a.entity_picture
            ? "background-image:url('" + clean(a.entity_picture).replace(/'/g, "") + "')"
            : "";
          np =
            '<div class="np"><span class="art" style="' +
            pic +
            '">' +
            (pic ? "" : '<ha-icon icon="mdi:play-circle-outline"></ha-icon>') +
            '</span><span style="min-width:0"><div class="nt">' +
            esc(a.media_title || a.app_name) +
            '</div><div class="na">' +
            esc(a.media_artist || a.media_series_title || a.app_name || "") +
            "</div></span></div>";
        }
        const muted = !!a.is_volume_muted;
        const hasCh = !!(RC_KEYS[this._platform()] || {}).ch_up || (c.commands && c.commands.ch_up);
        const rocker = (upK, downK, label, lon, upI, downI) =>
          '<div class="rk"><button data-a="' +
          upK +
          '" aria-label="' +
          upK +
          '"><ha-icon icon="' +
          upI +
          '"></ha-icon></button>' +
          '<span class="rl' +
          (lon ? " on" : "") +
          '">' +
          label +
          '</span><button data-a="' +
          downK +
          '" aria-label="' +
          downK +
          '"><ha-icon icon="' +
          downI +
          '"></ha-icon></button></div>';
        const pad =
          '<div class="pad">' +
          '<button class="k u" data-a="up" aria-label="Up"><ha-icon icon="mdi:chevron-up"></ha-icon></button>' +
          '<button class="k l" data-a="left" aria-label="Left"><ha-icon icon="mdi:chevron-left"></ha-icon></button>' +
          '<button class="k r" data-a="right" aria-label="Right"><ha-icon icon="mdi:chevron-right"></ha-icon></button>' +
          '<button class="k d" data-a="down" aria-label="Down"><ha-icon icon="mdi:chevron-down"></ha-icon></button>' +
          '<button class="ok" data-a="ok">OK</button></div>';
        const rm =
          '<div class="rm">' +
          rocker("vol_up", "vol_down", muted ? "MUTE" : "VOL", muted, "mdi:plus", "mdi:minus") +
          pad +
          (hasCh
            ? rocker("ch_up", "ch_down", "CH", false, "mdi:chevron-up", "mdi:chevron-down")
            : rocker("next", "prev", "SKIP", false, "mdi:skip-next", "mdi:skip-previous")) +
          "</div>";
        const nav =
          '<div class="nav"><button data-a="back"><ha-icon icon="mdi:arrow-u-left-top"></ha-icon><span>Back</span></button>' +
          '<button data-a="home"><ha-icon icon="mdi:home-outline"></ha-icon><span>Home</span></button>' +
          '<button data-a="menu"><ha-icon icon="mdi:menu"></ha-icon><span>Menu</span></button></div>';
        const med =
          '<div class="med"><button data-a="prev" aria-label="Previous"><ha-icon icon="mdi:skip-previous"></ha-icon></button>' +
          '<button class="pp" data-a="play_pause" aria-label="Play or pause"><ha-icon icon="' +
          (s && s.state === "playing" ? "mdi:pause" : "mdi:play") +
          '"></ha-icon></button>' +
          '<button data-a="next" aria-label="Next"><ha-icon icon="mdi:skip-next"></ha-icon></button>' +
          '<button data-a="mute" aria-label="Mute"><ha-icon icon="' +
          (muted ? "mdi:volume-off" : "mdi:volume-high") +
          '"></ha-icon></button></div>';
        let apps = "";
        const list = (c.sources && c.sources.length ? c.sources : a.source_list || []).slice(0, 8);
        if (c.show_apps !== false && list.length && c.entity)
          apps =
            '<div class="apps">' +
            list
              .map(
                (x) =>
                  '<button class="app' +
                  (a.source === x ? " on" : "") +
                  '" data-a="src" data-v="' +
                  esc(x) +
                  '">' +
                  esc(x) +
                  "</button>",
              )
              .join("") +
            "</div>";
        return this._wrap(
          this._head(c.icon, c.name, stateTxt, pwr, on, ' data-a="more"') +
            np +
            '<div class="' +
            (on ? "" : "off") +
            '">' +
            rm +
            nav +
            med +
            apps +
            "</div>",
        );
      }
      _act(a, v) {
        const c = this._cfg;
        if (a === "more") return this._more(c.entity || c.remote);
        if (a === "power") {
          if (c.commands && c.commands.power) return this._send("power");
          if (c.entity) return this._media("power");
          return this._call("remote", "toggle", { entity_id: c.remote });
        }
        if (["vol_up", "vol_down", "mute", "play_pause", "next", "prev"].includes(a)) return this._media(a);
        if (a === "src") {
          buzz();
          return this._call("media_player", "select_source", { entity_id: c.entity, source: v });
        }
        if (["up", "down", "left", "right", "ok", "back", "home", "menu", "ch_up", "ch_down"].includes(a))
          this._send(a);
      }
      static getConfigElement() {
        return mkEditor("remote");
      }
      static getStubConfig(h) {
        const tv =
          pick(h, (id) => dom(id) === "media_player" && /tv|television/i.test(id), 1)[0] ||
          pick(h, (id) => dom(id) === "media_player", 1)[0];
        const rc = pick(h, (id) => dom(id) === "remote", 1)[0];
        const o = { name: "Living Room TV", icon: "mdi:television" };
        if (tv) o.entity = tv;
        if (rc) o.remote = rc;
        return o;
      }
    }

    // Visual editor
    const LOOK_OPTS = [
      { value: "midnight", label: "Midnight Glow (dark blue)" },
      { value: "gold", label: "Luxe Gold (black and gold)" },
      { value: "amber", label: "Amber Light (white and amber)" },
      { value: "theme", label: "Follow my HA theme" },
    ];
    const look = (extra) => ({
      name: "look",
      type: "expandable",
      flatten: true,
      title: "Look and colours",
      icon: "mdi:palette",
      schema: [
        { name: "style", selector: { select: { mode: "dropdown", options: LOOK_OPTS } } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "background", selector: { color_rgb: {} } },
            { name: "text_color", selector: { color_rgb: {} } },
            { name: "icon_color", selector: { color_rgb: {} } },
            { name: "on_color", selector: { color_rgb: {} } },
          ].concat(extra || []),
        },
      ],
    });
    const TOGGLES = ["light", "switch", "fan", "input_boolean", "cover", "media_player"];
    const SCENES = ["scene", "script", "button", "input_button", "automation"];
    const ent = (name, filter, multiple) => ({
      name,
      selector: { entity: Object.assign({ filter }, multiple ? { multiple: true } : {}) },
    });
    const nameIcon = (key) => ({
      type: "grid",
      name: "",
      schema: [
        { name: key, selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
      ],
    });
    const SCHEMAS = {
      room: {
        lists: ["entities"],
        on: "Light on colour",
        schema: [
          nameIcon("name"),
          ent("entities", { domain: TOGGLES }, true),
          {
            type: "grid",
            name: "",
            schema: [
              ent("temperature", [{ domain: "sensor", device_class: "temperature" }, { domain: "climate" }]),
              ent("humidity", { domain: "sensor", device_class: "humidity" }),
            ],
          },
        ],
      },
      ac: {
        lists: [],
        on: "Running colour",
        schema: [
          nameIcon("name"),
          ent("entity", { domain: ["climate", "switch", "fan", "input_boolean"] }),
          {
            type: "grid",
            name: "",
            schema: [
              ent("power", { domain: "sensor", device_class: "power" }),
              {
                name: "power_threshold",
                selector: { number: { min: 0, max: 1000, step: 1, mode: "box", unit_of_measurement: "W" } },
              },
            ],
          },
          {
            name: "more",
            type: "expandable",
            flatten: true,
            title: "More (optional)",
            icon: "mdi:tune",
            schema: [
              {
                type: "grid",
                name: "",
                schema: [
                  ent("energy", { domain: "sensor", device_class: "energy" }),
                  ent("humidity", { domain: "sensor", device_class: "humidity" }),
                ],
              },
              {
                name: "max_power",
                selector: { number: { min: 100, max: 20000, step: 100, mode: "box", unit_of_measurement: "W" } },
              },
            ],
          },
        ],
      },
      scenes: {
        lists: ["scenes", "off_scenes", "turn_off"],
        on: "Tap colour",
        schema: [
          nameIcon("title"),
          ent("scenes", { domain: SCENES }, true),
          {
            name: "off",
            type: "expandable",
            flatten: true,
            title: "All-off scenes (optional)",
            icon: "mdi:power",
            schema: [
              ent("off_scenes", { domain: SCENES }, true),
              ent("turn_off", { domain: TOGGLES.concat(["climate"]) }, true),
            ],
          },
        ],
      },
      security: {
        lists: ["entities"],
        on: "Alert colour",
        extra: [{ name: "ok_color", selector: { color_rgb: {} } }],
        schema: [
          nameIcon("title"),
          ent("entities", [{ domain: "binary_sensor" }, { domain: "lock" }, { domain: "cover" }], true),
        ],
      },
      energy: {
        lists: [],
        on: "Dial colour",
        schema: [
          nameIcon("name"),
          ent("power", { domain: "sensor", device_class: "power" }),
          {
            type: "grid",
            name: "",
            schema: [
              ent("voltage", { domain: "sensor", device_class: "voltage" }),
              ent("current", { domain: "sensor", device_class: "current" }),
            ],
          },
          {
            type: "grid",
            name: "",
            schema: [
              ent("energy", { domain: "sensor", device_class: "energy" }),
              {
                name: "max_power",
                selector: { number: { min: 100, max: 50000, step: 100, mode: "box", unit_of_measurement: "W" } },
              },
            ],
          },
        ],
      },
      page: {
        lists: [],
        noLook: true,
        schema: [
          { name: "style", selector: { select: { mode: "dropdown", options: PAGE_OPTS } } },
          {
            type: "grid",
            name: "",
            schema: [
              { name: "banner", selector: { boolean: {} } },
              { name: "cards_follow", selector: { boolean: {} } },
            ],
          },
          { name: "title", selector: { text: {} } },
          {
            type: "grid",
            name: "",
            schema: [ent("weather", { domain: "weather" }), ent("power", { domain: "sensor", device_class: "power" })],
          },
        ],
      },
      remote: {
        lists: [],
        on: "Button colour",
        schema: [
          nameIcon("name"),
          ent("entity", { domain: "media_player" }),
          ent("remote", { domain: "remote" }),
          {
            type: "grid",
            name: "",
            schema: [
              { name: "platform", selector: { select: { mode: "dropdown", options: RC_OPTS } } },
              { name: "show_apps", selector: { boolean: {} } },
            ],
          },
          { name: "device", selector: { text: {} } },
        ],
      },
    };
    const KIND_LABELS = {
      page: {
        style: "Page look",
        title: "Banner title (empty = Good morning / evening)",
        power: "Power sensor (optional)",
      },
      remote: { entity: "TV (media player)" },
    };
    const LABELS = {
      banner: "Show welcome banner",
      cards_follow: "All EI cards use this look",
      weather: "Weather (optional)",
      remote: "Remote entity (for arrows and OK)",
      platform: "TV type",
      show_apps: "Show app buttons",
      device: "IR device name (IR blasters only)",
      name: "Name",
      title: "Title",
      icon: "Icon",
      entity: "AC (climate or switch)",
      power: "Power sensor (optional)",
      power_threshold: "Counts as running above",
      temperature: "Temperature (optional)",
      humidity: "Humidity (optional)",
      scenes: "Scenes, scripts or buttons",
      off_scenes: "These scenes also turn off...",
      turn_off: "...these devices",
      voltage: "Voltage sensor",
      current: "Current sensor",
      energy: "Energy sensor (kWh)",
      max_power: "Dial full at",
      style: "Look",
      background: "Background",
      text_color: "Text colour",
      icon_color: "Icon colour",
      ok_color: "All-secure colour",
    };
    const ENT_LABEL = { room: "Lights and switches", security: "Doors, windows, motion, locks" };

    async function ensureForm() {
      if (customElements.get("ha-form")) return;
      try {
        const helpers = await window.loadCardHelpers();
        const c = await helpers.createCardElement({ type: "entities", entities: [] });
        if (c && c.constructor.getConfigElement) await c.constructor.getConfigElement();
      } catch (e) {}
      await Promise.race([customElements.whenDefined("ha-form"), new Promise((r) => setTimeout(r, 4000))]);
    }
    function mkEditor(kind) {
      const e = document.createElement("ei-cards-editor");
      e.kind = kind;
      return e;
    }

    class EICardsEditor extends HTMLElement {
      setConfig(c) {
        this._cfg = Object.assign({}, c);
        this._render();
      }
      set hass(h) {
        this._hass = h;
        if (this._form) this._form.hass = h;
        else this._render();
      }
      connectedCallback() {
        ensureForm().then(() => this._render());
      }
      _spec() {
        return SCHEMAS[this.kind] || SCHEMAS.room;
      }
      _render() {
        if (!this._hass || !this._cfg || !customElements.get("ha-form")) return;
        const sp = this._spec();
        if (!this._form) {
          this._form = document.createElement("ha-form");
          this._form.computeLabel = (s) =>
            (KIND_LABELS[this.kind] || {})[s.name] ||
            (s.name === "on_color"
              ? sp.on
              : s.name === "entities"
                ? ENT_LABEL[this.kind] || "Entities"
                : LABELS[s.name] || s.name);
          this._form.addEventListener("value-changed", (ev) => this._changed(ev.detail.value));
          this.appendChild(this._form);
        }
        const defaults = this.kind === "page" ? { style: "midnight", banner: true, cards_follow: true } : {};
        if (this.kind === "remote") Object.assign(defaults, { platform: "auto", show_apps: true });
        const data = Object.assign(defaults, this._cfg);
        if (ALIAS[data.style]) data.style = ALIAS[data.style];
        sp.lists.forEach((k) => {
          if (data[k] != null) data[k] = asList(data[k]).map((e) => e.entity);
        });
        this._form.hass = this._hass;
        this._form.schema = sp.noLook ? sp.schema : sp.schema.concat([look(sp.extra)]);
        this._form.data = data;
      }
      _changed(v) {
        const sp = this._spec(),
          old = this._cfg || {},
          cfg = Object.assign({}, v);
        sp.lists.forEach((k) => {
          if (!Array.isArray(cfg[k])) return;
          const prev = asList(old[k]);
          cfg[k] = cfg[k].map((id) => {
            const o = prev.find((p) => p.entity === id);
            return o && Object.keys(o).length > 1 ? o : id;
          });
        });
        Object.keys(cfg).forEach((k) => {
          if (k !== "type" && (cfg[k] === "" || cfg[k] == null || (Array.isArray(cfg[k]) && !cfg[k].length)))
            delete cfg[k];
        });
        cfg.type = old.type || cfg.type;
        this._cfg = cfg;
        this.dispatchEvent(
          new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }),
        );
      }
    }

    // Register
    customElements.define("ei-room-card", EIRoomCard);
    customElements.define("ei-ac-card", EIACCard);
    customElements.define("ei-scenes-card", EIScenesCard);
    customElements.define("ei-security-card", EISecurityCard);
    customElements.define("ei-energy-card", EIEnergyCard);
    customElements.define("ei-page-card", EIPageCard);
    customElements.define("ei-remote-card", EIRemoteCard);
    customElements.define("ei-cards-editor", EICardsEditor);

    window.customCards = window.customCards || [];
    [
      [
        "ei-page-card",
        "EI Page Style",
        "One click page look: background, top bar, titles and all EI cards. Optional welcome banner.",
      ],
      ["ei-remote-card", "EI TV Remote", "TV remote with arrows, OK, volume, channels, media keys and apps."],
      [
        "ei-room-card",
        "EI Room Card",
        "A room with its lights and switches. Tap to toggle, hold for details, one tap for all off.",
      ],
      [
        "ei-ac-card",
        "EI AC Card",
        "AC with a round dial, modes and fan. Works with climate, or a switch plus power sensor.",
      ],
      ["ei-scenes-card", "EI Scenes Card", "Scene buttons. An all-off scene can also switch off a list of devices."],
      ["ei-security-card", "EI Security Card", "Doors, windows, motion and locks with status and time."],
      ["ei-energy-card", "EI Energy Card", "Live power dial with voltage, current and kWh."],
    ].forEach((c) => window.customCards.push({ type: c[0], name: c[1], description: c[2], preview: true }));

    window.EI_CARDS = { version: EI_VERSION, styles: Object.keys(STYLES) };
    console.info(
      "%c ENGINEER ISMAIL CARDS %c v" + EI_VERSION + " ",
      "background:#0e162b;color:#ffd27a;font-weight:700;padding:2px 4px;border-radius:3px 0 0 3px",
      "background:#b8925a;color:#fff;padding:2px 4px;border-radius:0 3px 3px 0",
    );
  })();
}
