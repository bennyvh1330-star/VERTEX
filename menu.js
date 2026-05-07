/* ================================================================
   V.E.R.T.E.X. — universal menu + page transition loader
   <script src="menu.js" data-prefix="."></script>           ← root
   <script src="../menu.js" data-prefix=".."></script>       ← inside category folder
   ================================================================ */

(function () {
  const script = document.currentScript;
  const prefix = (script && script.getAttribute("data-prefix")) || ".";
  /* expose for vx-features.js */
  window.VX_PREFIX = prefix;

  const categories = [
    { zh: "產業", en: "Industry" },
    { zh: "經濟", en: "Economy" },
    { zh: "金融", en: "Finance" },
    { zh: "歷史", en: "History" },
    { zh: "定律", en: "Laws" },
    { zh: "法則", en: "Principles" },
    { zh: "哲學", en: "Philosophy" },
    { zh: "科學", en: "Science" },
    { zh: "心理學", en: "Psychology" },
    { zh: "身心健康", en: "Wellbeing" },
    { zh: "人性", en: "Human Nature" },
    { zh: "邏輯", en: "Logic" },
    { zh: "世界", en: "World" },
    { zh: "宇宙推論與猜想", en: "Cosmos · Conjecture" },
    { zh: "悖論", en: "Paradox" },
    { zh: "成功學", en: "Success" },
    { zh: "商業", en: "Business" },
    { zh: "自我認知與成長", en: "Self · Growth" },
  ];
  /* expose for vx-features.js */
  window.VX_CATEGORIES = categories;

  /* SVG icons */
  const ICON_GRAPH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8" cy="3" r="1.6"/><circle cx="3" cy="11" r="1.6"/><circle cx="13" cy="11" r="1.6"/><circle cx="8" cy="13" r="1"/><line x1="8" y1="4.6" x2="3.6" y2="10"/><line x1="8" y1="4.6" x2="12.4" y2="10"/><line x1="4" y1="11.6" x2="7.4" y2="12.7"/><line x1="12" y1="11.6" x2="8.6" y2="12.7"/></svg>`;
  const ICON_HOME = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l6-5 6 5v7H2z"/><path d="M6 14V9h4v5"/></svg>`;
  const ICON_TAGS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5V3a1 1 0 0 1 1-1h5.5L14 7.5L9 12.5z"/><circle cx="5" cy="5" r="0.8" fill="currentColor"/></svg>`;
  const ICON_SEARCH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>`;

  function buildItems() {
    return categories
      .map((c) => `
        <li data-zh="${c.zh}" data-en="${c.en.toLowerCase()}">
          <a href="${prefix}/${encodeURIComponent(c.zh)}/index.html">
            <span class="zh">${c.zh}</span>
            <span class="en">${c.en}</span>
          </a>
        </li>`)
      .join("");
  }

  function buildChrome() {
    return `
      <button class="vx-hamburger" aria-label="Open menu" aria-expanded="false" type="button">
        <span></span><span></span><span></span>
      </button>
      <div class="vx-edge-trigger" aria-hidden="true"></div>
      <div class="vx-scrim" aria-hidden="true"></div>
      <aside class="vx-drawer" aria-hidden="true">
        <div class="vx-drawer-actions">
          <a class="btn" href="${prefix}/graph.html">${ICON_GRAPH}<span>全圖譜</span></a>
          <a class="btn" href="${prefix}/index.html">${ICON_HOME}<span>HOME</span></a>
          <a class="btn" href="${prefix}/tags.html">${ICON_TAGS}<span>標籤</span></a>
        </div>
        <div class="vx-search">
          <div class="vx-search-box">
            <span class="icon">${ICON_SEARCH}</span>
            <input type="text" id="vx-search-input" placeholder="搜尋研究或分類" autocomplete="off" />
          </div>
        </div>
        <ul class="vx-cat-list">${buildItems()}</ul>
        <div class="vx-cat-list-empty" style="display:none">
          <div class="empty-state">— 找不到符合的分類 —</div>
        </div>
      </aside>
    `;
  }

  function buildFooter() {
    return `
      <footer class="vx-footer">
        <div class="word">V·E·R·T·E·X</div>
        <div class="meta">Created by 盧彥辰 © 2026</div>
      </footer>
    `;
  }

  function setOpen(open) {
    document.body.classList.toggle("vx-menu-open", open);
    const btn = document.querySelector(".vx-hamburger");
    if (btn) {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }

  /* Page-level fade-out on internal link clicks */
  function attachPageTransitions() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      // skip external + hash + special
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("#") ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      ) return;
      e.preventDefault();
      /* Modern browsers: use cross-document view transitions if available */
      if (document.startViewTransition) {
        document.body.classList.add("vx-leaving");
        setTimeout(() => { window.location.href = href; }, 240);
        return;
      }
      document.body.classList.add("vx-leaving");
      setTimeout(() => { window.location.href = href; }, 240);
    });
  }

  /* Live filter the category list as user types */
  function attachSearch() {
    const input = document.getElementById("vx-search-input");
    const list = document.querySelector(".vx-cat-list");
    const empty = document.querySelector(".vx-cat-list-empty");
    if (!input || !list || !empty) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      list.querySelectorAll("li").forEach((li) => {
        if (!q) {
          li.style.display = "";
          visible++;
          return;
        }
        const zh = (li.getAttribute("data-zh") || "").toLowerCase();
        const en = (li.getAttribute("data-en") || "");
        const match = zh.includes(q) || en.includes(q);
        li.style.display = match ? "" : "none";
        if (match) visible++;
      });
      empty.style.display = visible === 0 ? "block" : "none";
    });
  }

  function init() {
    if (document.querySelector(".vx-hamburger")) return;
    document.body.insertAdjacentHTML("afterbegin", buildChrome());
    document.body.insertAdjacentHTML("beforeend", buildFooter());

    const btn = document.querySelector(".vx-hamburger");
    const scrim = document.querySelector(".vx-scrim");
    const edge = document.querySelector(".vx-edge-trigger");
    if (!btn || !scrim || !edge) return;

    const drawer = document.querySelector(".vx-drawer");

    btn.addEventListener("click", () =>
      setOpen(!document.body.classList.contains("vx-menu-open"))
    );
    scrim.addEventListener("click", () => setOpen(false));
    edge.addEventListener("mouseenter", () => setOpen(true));

    /* Auto-close when cursor leaves the drawer.  Small grace period so
       brief mouse jitter near the edge doesn't trigger a close. */
    let closeTimer = null;
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), 120);
    };
    const cancelClose = () => clearTimeout(closeTimer);
    if (drawer) {
      drawer.addEventListener("mouseleave", scheduleClose);
      drawer.addEventListener("mouseenter", cancelClose);
    }
    btn.addEventListener("mouseenter", cancelClose);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    attachSearch();
    attachPageTransitions();
    attachSwipeGestures();
    /* Auto-load UX feature suite (vx-features.js) once chrome is in place */
    loadFeatures();
  }

  function loadFeatures() {
    if (document.querySelector("script[data-vx-features]")) return;
    const s = document.createElement("script");
    s.src = prefix + "/vx-features.js";
    s.setAttribute("data-vx-features", "1");
    s.defer = true;
    document.body.appendChild(s);
  }

  /* Touch swipe gestures (mobile/tablet only):
       swipe RIGHT  → open menu drawer
       swipe LEFT   → if drawer is open, close it; else navigate to graph.html
     Heuristics: only triggers on a quick, mostly-horizontal one-finger gesture
     that started near the screen edge or moved a clear horizontal distance,
     so vertical scrolling and pinch-zoom are not affected. */
  function attachSwipeGestures() {
    if (!("ontouchstart" in window)) return;

    let startX = 0, startY = 0, startT = 0, tracking = false;

    document.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      tracking = true;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;

      // Must be quick, mostly horizontal, and a clear distance.
      if (dt > 700) return;
      if (Math.abs(dx) < 70) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.6) return;

      const isOpen = document.body.classList.contains("vx-menu-open");

      if (dx > 0) {
        // Swipe right → open drawer (if not already open)
        if (!isOpen) setOpen(true);
      } else {
        // Swipe left → close drawer if open, else jump to full graph
        if (isOpen) {
          setOpen(false);
        } else {
          // Don't redirect when already on the graph page
          const here = window.location.pathname.split("/").pop() || "";
          if (here.toLowerCase() === "graph.html") return;
          document.body.classList.add("vx-leaving");
          setTimeout(() => {
            window.location.href = prefix + "/graph.html";
          }, 320);
        }
      }
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
