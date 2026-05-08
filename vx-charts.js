/* ================================================================
   V.E.R.T.E.X. — pure-SVG interactive chart engine
   No external library. Reads data-* attributes off <figure data-vx-chart="...">

   Supported types:
     radar    – 5(or N)-axis pentagon with tab-switchable series
     bar      – vertical/horizontal bars with optional baseline
     donut    – donut/pie with segments + labels
     ladder   – stepped ascending/descending levels (Boulding-style)
     diverge  – two-sided bar comparison (left/right)
     dual     – dual-line comparison (two series, one X axis)
   ================================================================ */
(function () {
  const GOLD = "#c9a961";
  const GOLD_SOFT = "#d9bf7c";
  const FG = "#ebe6d9";
  const FG_SOFT = "#a8a293";
  const FG_MUTE = "#6b665a";
  const HAIR = "rgba(235,230,217,0.12)";
  const HAIR_STRONG = "rgba(235,230,217,0.22)";

  function attr(el, name, fallback) {
    const v = el.getAttribute(name);
    if (v == null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  }

  /* Run cb once when target scrolls into view (or immediately if no IO support) */
  function onceInView(target, cb, threshold = 0.18) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold });
    io.observe(target);
  }

  function el(tag, props, children) {
    const ns = "http://www.w3.org/2000/svg";
    const isSvg = ["svg","g","circle","line","path","polygon","polyline","rect","text","defs","linearGradient","stop","radialGradient"].includes(tag);
    const node = isSvg ? document.createElementNS(ns, tag) : document.createElement(tag);
    if (props) for (const k in props) {
      if (k === "class") node.setAttribute("class", props[k]);
      else if (k === "text") node.textContent = props[k];
      else if (k === "html") node.innerHTML = props[k];
      else node.setAttribute(k, props[k]);
    }
    if (children) children.forEach(c => c && node.appendChild(c));
    return node;
  }

  /* ---------------- RADAR ---------------- */
  function renderRadar(fig) {
    const axes = attr(fig, "data-axes", []);
    const series = attr(fig, "data-series", []);
    const max = +attr(fig, "data-max", 100);

    if (!axes.length || !series.length) return;

    const wrap = el("div", { class: "vx-radar-wrap" });
    const tabs = el("div", { class: "vx-radar-tabs" });
    const stage = el("div", { class: "vx-radar-stage" });
    const detailWrap = el("div", { class: "vx-radar-detail" });

    /* SVG */
    const size = 360, cx = size / 2, cy = size / 2, r = 130;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, class: "vx-radar-svg" });
    const N = axes.length;
    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

    /* Concentric guide rings (4 rings) */
    for (let k = 1; k <= 4; k++) {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = angle(i);
        const rr = (r * k) / 4;
        pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
      }
      svg.appendChild(el("polygon", {
        points: pts.join(" "),
        fill: "none",
        stroke: k === 4 ? HAIR_STRONG : HAIR,
        "stroke-width": "0.6",
      }));
    }

    /* Spokes + axis labels */
    for (let i = 0; i < N; i++) {
      const a = angle(i);
      svg.appendChild(el("line", {
        x1: cx, y1: cy,
        x2: cx + r * Math.cos(a),
        y2: cy + r * Math.sin(a),
        stroke: HAIR, "stroke-width": "0.5",
      }));
      const lr = r + 22;
      const lx = cx + lr * Math.cos(a);
      const ly = cy + lr * Math.sin(a);
      const t = el("text", {
        x: lx, y: ly,
        "text-anchor": Math.abs(Math.cos(a)) < 0.2 ? "middle" : (Math.cos(a) > 0 ? "start" : "end"),
        "dominant-baseline": "middle",
        "font-family": "Noto Sans TC, sans-serif",
        "font-size": "10.5",
        "letter-spacing": "0.12em",
        fill: FG_SOFT,
        text: axes[i],
      });
      svg.appendChild(t);
    }

    /* Active polygon (animated) */
    const polyShadow = el("polygon", {
      fill: "rgba(201,169,97,0.10)",
      stroke: "rgba(201,169,97,0.4)",
      "stroke-width": "0.5",
    });
    const poly = el("polygon", {
      fill: "rgba(201,169,97,0.18)",
      stroke: GOLD,
      "stroke-width": "1.2",
      class: "vx-radar-poly",
    });
    svg.appendChild(polyShadow);
    svg.appendChild(poly);

    /* Vertex dots */
    const dots = [];
    for (let i = 0; i < N; i++) {
      const c = el("circle", { r: 2.6, fill: GOLD });
      svg.appendChild(c);
      dots.push(c);
    }

    /* Center mark */
    svg.appendChild(el("circle", { cx, cy, r: 1.4, fill: GOLD }));

    stage.appendChild(svg);

    /* Detail blocks */
    series.forEach((s, idx) => {
      const block = el("div", { class: "vx-radar-block" + (idx === 0 ? " active" : "") });
      block.dataset.idx = idx;
      const h = el("h4", { text: s.name });
      const sub = s.subtitle ? el("div", { class: "vx-radar-sub", text: s.subtitle }) : null;
      const desc = el("p", { text: s.desc || "" });
      const extra = s.note ? el("div", { class: "vx-radar-note", html: s.note }) : null;
      block.appendChild(h);
      if (sub) block.appendChild(sub);
      block.appendChild(desc);
      if (extra) block.appendChild(extra);
      detailWrap.appendChild(block);
    });

    /* Tabs */
    series.forEach((s, idx) => {
      const btn = el("button", { class: "vx-radar-tab" + (idx === 0 ? " active" : ""), type: "button" });
      btn.dataset.idx = idx;
      btn.innerHTML = `
        <span class="num">${toRoman(idx + 1)}</span>
        <span class="zh">${s.name}</span>
        ${s.subtitle ? `<span class="en">${s.subtitle}</span>` : ""}
      `;
      btn.addEventListener("click", () => switchTo(idx));
      tabs.appendChild(btn);
    });

    /* Compute point coords for a given series */
    function computePts(idx) {
      const v = series[idx].values || [];
      const out = [];
      for (let i = 0; i < N; i++) {
        const ratio = Math.max(0, Math.min(1, (v[i] || 0) / max));
        const rr = r * ratio;
        const a = angle(i);
        out.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) });
      }
      return out;
    }

    let currentPts = N > 0
      ? Array.from({ length: N }, (_, i) => ({ x: cx, y: cy }))
      : [];
    let activeIdx = -1;
    let animRaf = null;

    function applyPts(pts) {
      const str = pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
      poly.setAttribute("points", str);
      polyShadow.setAttribute("points", str);
      pts.forEach((p, i) => {
        dots[i].setAttribute("cx", p.x);
        dots[i].setAttribute("cy", p.y);
      });
    }

    /* easeInOutCubic */
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function switchTo(idx, animate = true) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      const fromPts = currentPts.slice();
      const toPts = computePts(idx);

      tabs.querySelectorAll(".vx-radar-tab").forEach(b => b.classList.toggle("active", +b.dataset.idx === idx));
      detailWrap.querySelectorAll(".vx-radar-block").forEach(b => b.classList.toggle("active", +b.dataset.idx === idx));

      if (!animate) {
        currentPts = toPts;
        applyPts(toPts);
        return;
      }
      if (animRaf) cancelAnimationFrame(animRaf);
      const duration = 620;
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = ease(t);
        const interp = fromPts.map((p, i) => ({
          x: p.x + (toPts[i].x - p.x) * e,
          y: p.y + (toPts[i].y - p.y) * e,
        }));
        applyPts(interp);
        if (t < 1) animRaf = requestAnimationFrame(frame);
        else { currentPts = toPts; animRaf = null; }
      }
      animRaf = requestAnimationFrame(frame);
    }

    /* Initial: paint at center, then animate outward when scrolled into view */
    applyPts(currentPts);

    wrap.appendChild(tabs);
    wrap.appendChild(stage);
    wrap.appendChild(detailWrap);
    fig.insertBefore(wrap, fig.firstChild);

    onceInView(fig, () => {
      requestAnimationFrame(() => switchTo(0, true));
    });
  }

  /* ---------------- BAR (horizontal) ---------------- */
  function renderBar(fig) {
    const data = attr(fig, "data-series", []);
    const max = +attr(fig, "data-max", Math.max(...data.map(d => d.value)) * 1.1);
    const unit = fig.getAttribute("data-unit") || "";
    const orient = fig.getAttribute("data-orient") || "horizontal";

    const wrap = el("div", { class: "vx-bar-wrap " + (orient === "vertical" ? "vx-bar-vertical" : "vx-bar-horizontal") });

    const fills = [];
    if (orient === "vertical") {
      const cols = el("div", { class: "vx-bar-cols" });
      data.forEach((d) => {
        const col = el("div", { class: "vx-bar-col" });
        const bar = el("div", { class: "vx-bar-fill" });
        if (d.accent === false) bar.classList.add("muted");
        const val = el("div", { class: "vx-bar-val", text: (d.value > 0 ? "+" : "") + d.value + unit });
        const lbl = el("div", { class: "vx-bar-lbl", text: d.label });
        const inner = el("div", { class: "vx-bar-track" });
        inner.appendChild(bar);
        col.appendChild(val);
        col.appendChild(inner);
        col.appendChild(lbl);
        cols.appendChild(col);
        fills.push({ el: bar, target: (Math.max(0, d.value) / max) * 100, prop: "height" });
      });
      wrap.appendChild(cols);
    } else {
      const rows = el("div", { class: "vx-bar-rows" });
      data.forEach((d) => {
        const row = el("div", { class: "vx-bar-row" });
        const lbl = el("div", { class: "vx-bar-lbl", text: d.label });
        const track = el("div", { class: "vx-bar-track" });
        const fill = el("div", { class: "vx-bar-fill" });
        if (d.accent === false) fill.classList.add("muted");
        const val = el("div", { class: "vx-bar-val", text: d.value + unit });
        track.appendChild(fill);
        row.appendChild(lbl);
        row.appendChild(track);
        row.appendChild(val);
        rows.appendChild(row);
        fills.push({ el: fill, target: (Math.max(0, d.value) / max) * 100, prop: "width" });
      });
      wrap.appendChild(rows);
    }
    fig.insertBefore(wrap, fig.firstChild);

    /* Animate-in when figure scrolls into view */
    fills.forEach(f => f.el.style[f.prop] = "0%");
    onceInView(fig, () => {
      fills.forEach((f, i) => {
        setTimeout(() => { f.el.style[f.prop] = f.target + "%"; }, i * 70);
      });
    });
  }

  /* ---------------- DONUT ---------------- */
  function renderDonut(fig) {
    const segs = attr(fig, "data-segments", []);
    const total = segs.reduce((a, b) => a + b.value, 0);
    const W = 360, H = 280, cx = 130, cy = H / 2, R = 100, r = 64;

    const wrap = el("div", { class: "vx-donut-wrap" });
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "vx-donut-svg" });

    const colorAt = (i, n) => {
      const opacities = [1.0, 0.78, 0.6, 0.42, 0.28, 0.18];
      return `rgba(201,169,97,${opacities[i % opacities.length]})`;
    };
    /* Pre-compute final segment angles */
    const segMeta = [];
    let acc = 0;
    segs.forEach((s) => {
      const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2;
      acc += s.value;
      const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2;
      segMeta.push({ a0, a1 });
    });
    const paths = segMeta.map((m, i) => {
      const p = el("path", { d: "", fill: colorAt(i, segs.length), stroke: "#0a0a0c", "stroke-width": "1.2", opacity: "0" });
      svg.appendChild(p);
      return p;
    });
    function buildArc(a0, a1) {
      if (a1 - a0 < 0.001) return "";
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
      return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`;
    }
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    let raf;
    function animateDonut() {
      const start = performance.now();
      const dur = 900;
      function frame(now) {
        const t = Math.min(1, (now - start) / dur);
        const e = ease(t);
        segMeta.forEach((m, i) => {
          const a1now = m.a0 + (m.a1 - m.a0) * e;
          paths[i].setAttribute("d", buildArc(m.a0, a1now));
          paths[i].setAttribute("opacity", String(Math.min(1, e * 1.4)));
        });
        if (t < 1) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    onceInView(fig, animateDonut, 0.25);
    /* Center text */
    svg.appendChild(el("text", {
      x: cx, y: cy - 6, "text-anchor": "middle",
      "font-family": "Cormorant Garamond, serif", "font-style": "italic",
      "font-size": "14", "letter-spacing": "0.18em", fill: FG_MUTE,
      text: "TOTAL"
    }));
    svg.appendChild(el("text", {
      x: cx, y: cy + 16, "text-anchor": "middle",
      "font-family": "Noto Serif TC, serif", "font-weight": "500",
      "font-size": "22", fill: GOLD, text: total.toFixed(2)
    }));

    /* Legend on right */
    const legend = el("div", { class: "vx-donut-legend" });
    segs.forEach((s, i) => {
      const row = el("div", { class: "vx-donut-row" });
      const dot = el("span", { class: "dot" });
      dot.style.background = colorAt(i, segs.length);
      const lbl = el("div", { class: "lbl" });
      lbl.innerHTML = `<span class="zh">${s.label}</span>${s.note ? `<span class="note">${s.note}</span>` : ""}`;
      const val = el("span", { class: "val", text: s.value.toFixed(2) });
      row.appendChild(dot); row.appendChild(lbl); row.appendChild(val);
      legend.appendChild(row);
    });

    wrap.appendChild(svg);
    wrap.appendChild(legend);
    fig.insertBefore(wrap, fig.firstChild);
  }

  /* ---------------- LADDER (stepped levels) ---------------- */
  /* Visual: level 1 sits at the BOTTOM, level N at the top.
     Animation also starts from the bottom (level 1) and travels up. */
  function renderLadder(fig) {
    const levels = attr(fig, "data-levels", []);
    const wrap = el("div", { class: "vx-ladder-wrap" });
    const N = levels.length;
    const rows = [];
    levels.forEach((l, i) => {
      const row = el("div", { class: "vx-ladder-row vx-anim-row" });
      /* index 0 (level 1) → no indent at bottom; index N-1 (top) → max indent */
      row.style.paddingLeft = `${(i / Math.max(1, N - 1)) * 36}%`;
      const idx = el("span", { class: "vx-ladder-idx", text: String(l.level || i + 1).padStart(2, "0") });
      const card = el("div", { class: "vx-ladder-card" + (l.highlight ? " highlight" : "") });
      const h = el("div", { class: "vx-ladder-name", text: l.name });
      const en = l.en ? el("div", { class: "vx-ladder-en", text: l.en }) : null;
      const desc = l.desc ? el("div", { class: "vx-ladder-desc", text: l.desc }) : null;
      card.appendChild(h);
      if (en) card.appendChild(en);
      if (desc) card.appendChild(desc);
      row.appendChild(idx); row.appendChild(card);
      rows.push(row);
    });
    /* Append in reverse so level 1 (rows[0]) sits at the bottom of the DOM */
    for (let k = rows.length - 1; k >= 0; k--) wrap.appendChild(rows[k]);
    fig.insertBefore(wrap, fig.firstChild);
    onceInView(fig, () => {
      /* Animate level 1 first, then level 2, ... → reveal travels upward */
      rows.forEach((r, i) => setTimeout(() => r.classList.add("vx-in"), i * 130));
    });
  }

  /* ---------------- DIVERGE (two-sided bar) ---------------- */
  function renderDiverge(fig) {
    const rows = attr(fig, "data-rows", []);
    const left = fig.getAttribute("data-left") || "Left";
    const right = fig.getAttribute("data-right") || "Right";
    const wrap = el("div", { class: "vx-diverge-wrap" });
    const head = el("div", { class: "vx-diverge-head" });
    head.innerHTML = `<span class="left">${left}</span><span class="axis">vs.</span><span class="right">${right}</span>`;
    wrap.appendChild(head);
    const rowEls = [];
    rows.forEach(r => {
      const row = el("div", { class: "vx-diverge-row vx-anim-diverge" });
      row.innerHTML = `
        <div class="lt">${r.left || ""}</div>
        <div class="dim">${r.dim || ""}</div>
        <div class="rt">${r.right || ""}</div>
      `;
      wrap.appendChild(row);
      rowEls.push(row);
    });
    fig.insertBefore(wrap, fig.firstChild);
    onceInView(fig, () => {
      rowEls.forEach((r, i) => setTimeout(() => r.classList.add("vx-in"), i * 80));
    });
  }

  /* ---------------- DUAL LINE ---------------- */
  function renderDual(fig) {
    const labels = attr(fig, "data-labels", []);
    const series = attr(fig, "data-series", []);
    const W = 600, H = 280, P = 48;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "vx-dual-svg" });

    const xMax = labels.length - 1;
    const xS = (i) => P + (i / xMax) * (W - 2 * P);
    const lines = [];
    const dots = [];
    /* Compute global y normalization per-series */
    series.forEach((s, sIdx) => {
      const max = Math.max(...s.values);
      const min = Math.min(...s.values, 0);
      const yS = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
      const pts = s.values.map((v, i) => `${xS(i)},${yS(v)}`).join(" ");
      const stroke = sIdx === 0 ? GOLD : "rgba(235,230,217,0.55)";
      const line = el("polyline", { points: pts, fill: "none", stroke, "stroke-width": "1.6" });
      svg.appendChild(line);
      lines.push(line);
      s.values.forEach((v, i) => {
        const c = el("circle", { cx: xS(i), cy: yS(v), r: 2.4, fill: stroke, opacity: "0" });
        svg.appendChild(c);
        dots.push(c);
      });
    });
    /* X labels */
    labels.forEach((l, i) => {
      svg.appendChild(el("text", {
        x: xS(i), y: H - 16, "text-anchor": "middle",
        "font-family": "Noto Sans TC, sans-serif", "font-size": "10",
        "letter-spacing": "0.08em", fill: FG_MUTE, text: l
      }));
    });
    /* Legend */
    const lg = el("div", { class: "vx-dual-legend" });
    series.forEach((s, i) => {
      const row = el("div", { class: "row" });
      const swatch = el("span", { class: "sw" });
      swatch.style.background = i === 0 ? GOLD : "rgba(235,230,217,0.55)";
      row.appendChild(swatch);
      row.appendChild(el("span", { class: "lbl", text: s.name }));
      lg.appendChild(row);
    });
    const wrap = el("div", { class: "vx-dual-wrap" });
    wrap.appendChild(svg);
    wrap.appendChild(lg);
    fig.insertBefore(wrap, fig.firstChild);

    /* Animate-in: draw lines + fade dots — must run AFTER svg is in DOM
       so getTotalLength returns a non-zero value. If length is 0 for any
       reason, leave the line solid/visible rather than hiding it. */
    requestAnimationFrame(() => {
      const prepared = lines.map(line => {
        const len = (line.getTotalLength && line.getTotalLength()) || 0;
        if (len > 0) {
          line.style.strokeDasharray = len;
          line.style.strokeDashoffset = len;
          line.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.4,.7,.3,1)";
        }
        return { line, len };
      });
      onceInView(fig, () => {
        prepared.forEach(({ line, len }) => {
          if (len > 0) line.style.strokeDashoffset = "0";
        });
        dots.forEach((c, i) => {
          setTimeout(() => {
            c.style.transition = "opacity 0.35s ease";
            c.setAttribute("opacity", "1");
          }, 600 + i * 30);
        });
      });
    });
  }

  function toRoman(n) {
    const map = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
    return map[n - 1] || String(n);
  }

  function init() {
    document.querySelectorAll("[data-vx-chart]").forEach(fig => {
      if (fig.dataset.vxRendered) return;
      fig.dataset.vxRendered = "1";
      const t = fig.getAttribute("data-vx-chart");
      try {
        if (t === "radar") renderRadar(fig);
        else if (t === "bar") renderBar(fig);
        else if (t === "donut") renderDonut(fig);
        else if (t === "ladder") renderLadder(fig);
        else if (t === "diverge") renderDiverge(fig);
        else if (t === "dual") renderDual(fig);
      } catch (err) { console.warn("[vx-chart]", t, err); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
