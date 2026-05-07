/* ================================================================
   V.E.R.T.E.X. — UX feature suite
   Loaded automatically by menu.js on every page.

   Features:
     1.  Top reading progress bar
     2.  Citation hover preview
     3.  Right-side section indicator (sticky dots)
     4.  Prev / Next article navigation
     5.  (handled by tags.html — see also feature 8 helper)
     6.  Search content preview (extends menu.js search)
     7.  Chart click-to-zoom (lightbox)
     8.  Font size toggle (S / M / L)
     9.  Highlight & bookmark via selection
    10.  KaTeX math rendering (lazy-loaded)
    11.  TTS reading (browser SpeechSynthesis)
   ================================================================ */
(function () {
  /* prefix passed via menu.js's window.VX_PREFIX or fallback to "." */
  const PREFIX = window.VX_PREFIX || ".";
  const isArticle = !!document.querySelector(".vx-article");
  const articleEl = document.querySelector(".vx-article");

  /* ---------- 1. PROGRESS BAR ---------- */
  function initProgress() {
    const bar = document.createElement("div");
    bar.className = "vx-progress";
    document.body.appendChild(bar);
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + "%";
    };
    document.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 2. CITATION HOVER PREVIEW (clickable) ---------- */
  function initCitationPreview() {
    if (!isArticle) return;
    const tip = document.createElement("a");
    tip.className = "vx-cite-tip";
    tip.target = "_blank";
    tip.rel = "noopener";
    document.body.appendChild(tip);
    let hideTimer;
    const hide = () => { tip.classList.remove("active"); };
    const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 160); };
    const cancelHide = () => clearTimeout(hideTimer);
    tip.addEventListener("mouseenter", cancelHide);
    tip.addEventListener("mouseleave", scheduleHide);

    document.querySelectorAll("sup.cite a, .vx-article a[href^='#ref-']").forEach(a => {
      a.addEventListener("mouseenter", () => {
        const id = a.getAttribute("href").slice(1);
        /* Force-render <details> so #ref-X is in DOM */
        const sources = document.querySelector(".vx-sources");
        if (sources && !sources.open) sources.open = true;
        const ref = document.getElementById(id);
        if (!ref) return;
        /* Extract URL from the reference's <a> child if any */
        const refLink = ref.querySelector("a[href^='http']");
        const url = refLink ? refLink.getAttribute("href") : "";
        /* Build clean tip body (text + URL footer) */
        const body = ref.cloneNode(true);
        body.querySelectorAll("a").forEach(x => x.remove());
        const text = body.textContent.trim().replace(/\s+/g, " ");
        tip.innerHTML = `
          <span class="vx-cite-tip-body">${text}</span>
          ${url ? `<span class="vx-cite-tip-url">${url.replace(/^https?:\/\//, "").slice(0, 64)} ↗</span>` : ""}
        `;
        if (url) {
          tip.setAttribute("href", url);
          tip.classList.add("clickable");
        } else {
          tip.removeAttribute("href");
          tip.classList.remove("clickable");
        }
        const r = a.getBoundingClientRect();
        tip.style.left = Math.min(window.innerWidth - 380, Math.max(12, r.left + r.width / 2 - 180)) + "px";
        tip.style.top = (window.scrollY + r.top - 12) + "px";
        cancelHide();
        tip.classList.add("active");
      });
      a.addEventListener("mouseleave", scheduleHide);
    });
  }

  /* ---------- 3. SECTION INDICATOR (right-side dots) ---------- */
  function initSectionDots() {
    if (!isArticle) return;
    const heads = Array.from(articleEl.querySelectorAll("h2[id]"));
    if (heads.length < 2) return;
    const nav = document.createElement("nav");
    nav.className = "vx-section-dots";
    nav.innerHTML = heads.map(h => `
      <a href="#${h.id}" data-target="${h.id}">
        <span class="dot"></span>
        <span class="lbl">${(h.textContent || "").replace(/^[IVX]+[.\s]*/, "").trim()}</span>
      </a>
    `).join("");
    document.body.appendChild(nav);
    const links = Array.from(nav.querySelectorAll("a"));
    const setActive = (id) => {
      links.forEach(l => l.classList.toggle("active", l.dataset.target === id));
    };
    /* Click → smooth scroll + immediate active state, suppress observer briefly */
    let suppressUntil = 0;
    links.forEach(l => {
      l.addEventListener("click", (e) => {
        e.preventDefault();
        const id = l.dataset.target;
        const target = document.getElementById(id);
        if (!target) return;
        suppressUntil = performance.now() + 900;
        setActive(id);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + id);
      });
    });
    /* Also wire TOC links (.vx-toc) so clicking TOC entries activates the dot */
    document.querySelectorAll(".vx-toc a[href^='#']").forEach(a => {
      a.addEventListener("click", () => {
        const id = a.getAttribute("href").slice(1);
        if (heads.some(h => h.id === id)) {
          suppressUntil = performance.now() + 900;
          setActive(id);
        }
      });
    });
    const io = new IntersectionObserver(entries => {
      if (performance.now() < suppressUntil) return;
      /* Pick the head closest to top of viewport that's intersecting */
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) {
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActive(visible[0].target.id);
      }
    }, { rootMargin: "-25% 0px -60% 0px", threshold: 0 });
    heads.forEach(h => io.observe(h));
    /* Initial: set active to first head whose top is above viewport center */
    const initActive = () => {
      const mid = window.innerHeight * 0.4;
      let bestId = heads[0].id;
      heads.forEach(h => {
        if (h.getBoundingClientRect().top < mid) bestId = h.id;
      });
      setActive(bestId);
    };
    initActive();
  }

  /* ---------- ARTICLE REGISTRY (used by prev/next + search + tags) ---------- */
  const REGISTRY_KEY = "vx-registry-v2";
  async function waitForCategories(timeout = 3000) {
    const start = performance.now();
    while (!window.VX_CATEGORIES) {
      if (performance.now() - start > timeout) return [];
      await new Promise(r => setTimeout(r, 50));
    }
    return window.VX_CATEGORIES;
  }
  async function getRegistry() {
    try {
      const cached = sessionStorage.getItem(REGISTRY_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length) return parsed;
      }
    } catch {}
    const cats = await waitForCategories();
    const out = [];
    await Promise.all(cats.map(async (c) => {
      try {
        const url = `${PREFIX}/${encodeURIComponent(c.zh)}/index.html`;
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) return;
        const t = await r.text();
        const doc = new DOMParser().parseFromString(t, "text/html");
        const items = Array.from(doc.querySelectorAll(".vx-list ul li a"));
        items.forEach((a, i) => {
          const ttl = a.querySelector(".ttl")?.textContent?.trim() || a.textContent.trim();
          const meta = a.querySelector(".meta")?.textContent?.trim() || "";
          const rawHref = a.getAttribute("href") || "";
          out.push({
            cat: c.zh, catEn: c.en,
            title: ttl, meta,
            href: rawHref,
            hrefDecoded: decodeURIComponent(rawHref),
            order: i,
          });
        });
      } catch (e) {
        /* Common when running from file:// — fetch is blocked */
        console.warn("[vx-features] registry fetch failed for", c.zh, e.message);
      }
    }));
    try { sessionStorage.setItem(REGISTRY_KEY, JSON.stringify(out)); } catch {}
    return out;
  }
  async function getArticleBody(cat, href) {
    /* Used by content search */
    const key = "vx-body-" + cat + "-" + href;
    try { const c = sessionStorage.getItem(key); if (c) return c; } catch {}
    try {
      const url = `${PREFIX}/${encodeURIComponent(cat)}/${href}`;
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) return "";
      const t = await r.text();
      const doc = new DOMParser().parseFromString(t, "text/html");
      const art = doc.querySelector(".vx-article");
      if (!art) return "";
      art.querySelectorAll(".vx-toc, .vx-summary, .vx-sources, .vx-prevnext, .vx-back, .vx-back-top, figure, .meta, .crumb").forEach(el => el.remove());
      const text = art.textContent.replace(/\s+/g, " ").trim().slice(0, 6000);
      try { sessionStorage.setItem(key, text); } catch {}
      return text;
    } catch { return ""; }
  }

  /* ---------- 4. PREV / NEXT NAV ---------- */
  async function initPrevNext() {
    if (!isArticle) return;
    const path = decodeURIComponent(window.location.pathname);
    const parts = path.split("/").filter(Boolean);
    const here = parts[parts.length - 1] || "";
    const cat = parts[parts.length - 2] || "";
    const reg = await getRegistry();
    const inCat = reg.filter(a => a.cat === cat).sort((a, b) => a.order - b.order);
    if (!inCat.length) {
      console.info("[vx-features] no articles in category for prev/next:", cat, "(registry size:", reg.length, ")");
      return;
    }
    const idx = inCat.findIndex(a =>
      a.hrefDecoded === here || a.href === here ||
      a.href === decodeURIComponent(here) || decodeURIComponent(a.href) === decodeURIComponent(here)
    );
    if (idx < 0) {
      console.info("[vx-features] current article not found in registry:", here, inCat.map(x => x.hrefDecoded));
      return;
    }
    const prev = inCat[idx - 1];
    const next = inCat[idx + 1];
    if (!prev && !next) return;

    const wrap = document.createElement("nav");
    wrap.className = "vx-prevnext";
    wrap.innerHTML = `
      ${prev ? `<a class="prev" href="${prev.href}">
        <span class="dir">← Previous</span>
        <span class="ttl">${prev.title}</span>
      </a>` : `<span class="empty"></span>`}
      ${next ? `<a class="next" href="${next.href}">
        <span class="dir">Next →</span>
        <span class="ttl">${next.title}</span>
      </a>` : `<span class="empty"></span>`}
    `;
    const back = articleEl.querySelector(".vx-back");
    if (back) back.parentNode.insertBefore(wrap, back);
    else articleEl.appendChild(wrap);
  }

  /* ---------- 6. SEARCH ENHANCEMENT (titles + content snippets) ---------- */
  async function initEnhancedSearch() {
    /* Wait for menu drawer to exist */
    let tries = 0;
    while (!document.querySelector("#vx-search-input") && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    const input = document.getElementById("vx-search-input");
    const list = document.querySelector(".vx-cat-list");
    if (!input || !list) return;

    const results = document.createElement("ul");
    results.className = "vx-search-results";
    list.parentNode.insertBefore(results, list.nextSibling);

    const status = document.createElement("div");
    status.className = "vx-search-status";
    status.style.display = "none";
    list.parentNode.insertBefore(status, results);

    const reg = await getRegistry();

    /* Highlight matched query in a snippet */
    const escHTML = (s) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const highlight = (text, q) => {
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return escHTML(text);
      return escHTML(text.slice(0, i)) +
        '<mark>' + escHTML(text.slice(i, i + q.length)) + '</mark>' +
        escHTML(text.slice(i + q.length));
    };
    const snippet = (body, q, ctx = 36) => {
      const i = body.toLowerCase().indexOf(q);
      if (i < 0) return "";
      const start = Math.max(0, i - ctx);
      const end = Math.min(body.length, i + q.length + ctx);
      return (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
    };

    let runId = 0;
    let debounceTimer;
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 180);
    });

    async function doSearch() {
      const q = input.value.trim().toLowerCase();
      const myRun = ++runId;
      results.innerHTML = "";
      if (!q || q.length < 1) {
        results.style.display = "none";
        status.style.display = "none";
        return;
      }
      /* Pass 1: instant title matches */
      const titleMatches = reg.filter(a =>
        a.title.toLowerCase().includes(q) || (a.cat || "").toLowerCase().includes(q)
      );
      const renderResults = (matches, isLoading) => {
        if (myRun !== runId) return;
        if (!matches.length && !isLoading) {
          results.style.display = "none";
          status.style.display = "block";
          status.textContent = "— 無匹配結果 —";
          return;
        }
        status.style.display = isLoading ? "block" : "none";
        if (isLoading) status.textContent = "正在搜尋內文…";
        results.style.display = matches.length ? "block" : "none";
        results.innerHTML = matches.slice(0, 10).map(m => {
          const href = `${PREFIX}/${encodeURIComponent(m.cat)}/${m.href}`;
          const inTitle = m.title.toLowerCase().includes(q);
          const snip = m.snippet || "";
          return `
            <li>
              <a href="${href}">
                <span class="cat">${m.cat}</span>
                <span class="ttl">${inTitle ? highlight(m.title, q) : escHTML(m.title)}</span>
                ${snip ? `<span class="snip">${highlight(snip, q)}</span>` : ""}
              </a>
            </li>
          `;
        }).join("");
      };
      renderResults(titleMatches, true);

      /* Pass 2: parallel fetch article bodies, find content matches */
      const seen = new Set(titleMatches.map(m => m.cat + "|" + m.href));
      const bodyMatches = [];
      await Promise.all(reg.map(async (a) => {
        if (myRun !== runId) return;
        const body = await getArticleBody(a.cat, a.href);
        if (myRun !== runId) return;
        if (!body) return;
        if (body.toLowerCase().includes(q)) {
          const key = a.cat + "|" + a.href;
          const snip = snippet(body, q);
          if (seen.has(key)) {
            const m = titleMatches.find(x => x.cat === a.cat && x.href === a.href);
            if (m) m.snippet = snip;
          } else {
            bodyMatches.push({ ...a, snippet: snip });
          }
        }
      }));
      if (myRun !== runId) return;
      const all = [...titleMatches, ...bodyMatches];
      renderResults(all, false);
    }
  }

  /* ---------- 7. CHART LIGHTBOX ---------- */
  function initChartLightbox() {
    document.querySelectorAll("figure[data-vx-chart]").forEach(fig => {
      fig.addEventListener("click", (e) => {
        if (e.target.closest("button, a")) return; /* don't trigger when clicking a tab */
        if (fig.classList.contains("vx-fig-zoom")) return;
        openLightbox(fig);
      });
      fig.style.cursor = "zoom-in";
    });
  }
  function openLightbox(fig) {
    const overlay = document.createElement("div");
    overlay.className = "vx-lightbox";
    const inner = document.createElement("div");
    inner.className = "vx-lightbox-inner";
    const closeBtn = document.createElement("button");
    closeBtn.className = "vx-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "×";
    inner.appendChild(closeBtn);
    /* Move (not clone) to preserve event listeners on radar tabs */
    const placeholder = document.createComment("vx-lightbox-placeholder");
    fig.parentNode.insertBefore(placeholder, fig);
    inner.appendChild(fig);
    fig.classList.add("vx-fig-zoom");
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("active"));
    const close = () => {
      overlay.classList.remove("active");
      setTimeout(() => {
        placeholder.parentNode.insertBefore(fig, placeholder);
        fig.classList.remove("vx-fig-zoom");
        placeholder.remove();
        overlay.remove();
      }, 300);
    };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
  }

  /* ---------- 8. FONT SIZE TOGGLE ---------- */
  function initFontToggle() {
    if (!isArticle) return;
    const saved = localStorage.getItem("vx-fontsize") || "m";
    document.documentElement.dataset.vxFont = saved;

    const tools = ensureToolbar();
    const grp = document.createElement("div");
    grp.className = "vx-tool-group vx-font-grp";
    grp.innerHTML = `
      <button data-size="s" title="Small">A−</button>
      <button data-size="m" title="Medium">A</button>
      <button data-size="l" title="Large">A+</button>
    `;
    tools.appendChild(grp);
    const setActive = () => grp.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.size === document.documentElement.dataset.vxFont)
    );
    grp.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      document.documentElement.dataset.vxFont = b.dataset.size;
      localStorage.setItem("vx-fontsize", b.dataset.size);
      setActive();
    }));
    setActive();
  }

  /* ---------- 9. HIGHLIGHT / BOOKMARK ---------- */
  function initHighlights() {
    if (!isArticle) return;
    const KEY = "vx-marks-" + window.location.pathname;
    const getSaved = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
    const setSaved = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
    const restore = () => getSaved().forEach(text => highlightText(articleEl, text));
    restore();

    const popup = document.createElement("div");
    popup.className = "vx-mark-popup";
    popup.innerHTML = `<button class="hl" type="button">★ 標記</button><button class="cp" type="button">⧉ 複製</button>`;
    document.body.appendChild(popup);

    document.addEventListener("mouseup", (e) => {
      /* Don't react to clicks inside the popup itself */
      if (e.target.closest(".vx-mark-popup, .vx-marks-panel, .vx-toolbar")) return;
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || text.length < 2 || text.length > 200) {
        popup.classList.remove("active");
        return;
      }
      const range = sel.getRangeAt(0);
      if (!articleEl.contains(range.commonAncestorContainer)) {
        popup.classList.remove("active"); return;
      }
      const r = range.getBoundingClientRect();
      popup.style.left = (window.scrollX + r.left + r.width / 2 - 70) + "px";
      popup.style.top = (window.scrollY + r.top - 44) + "px";
      popup.classList.add("active");
      popup.dataset.text = text;
    });
    document.addEventListener("mousedown", (e) => {
      if (!popup.contains(e.target)) popup.classList.remove("active");
    });
    popup.querySelector(".hl").addEventListener("click", () => {
      const text = popup.dataset.text;
      const saved = getSaved();
      if (!saved.includes(text)) saved.push(text);
      setSaved(saved);
      highlightText(articleEl, text);
      popup.classList.remove("active");
      window.getSelection().removeAllRanges();
      refreshPanel();
    });
    popup.querySelector(".cp").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(popup.dataset.text); } catch {}
      popup.classList.remove("active");
    });

    /* ---- Bookmark panel button on toolbar ---- */
    const tools = ensureToolbar();
    const btn = document.createElement("button");
    btn.className = "vx-tool-btn vx-marks-btn";
    btn.title = "我的標記 / Bookmarks";
    btn.innerHTML = "★";
    tools.appendChild(btn);
    const updateBadge = () => {
      const n = getSaved().length;
      btn.dataset.count = n > 0 ? String(n) : "";
      btn.classList.toggle("has-marks", n > 0);
    };
    updateBadge();

    const panel = document.createElement("aside");
    panel.className = "vx-marks-panel";
    panel.innerHTML = `
      <div class="vx-marks-head">
        <span class="zh">我的標記</span>
        <span class="en">BOOKMARKS</span>
        <button class="vx-marks-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="vx-marks-body"></div>
      <div class="vx-marks-tip">
        <span>選取文章中的任意文字 → 點擊「★ 標記」即可儲存。</span>
      </div>
    `;
    document.body.appendChild(panel);
    const body = panel.querySelector(".vx-marks-body");
    panel.querySelector(".vx-marks-close").addEventListener("click", () => panel.classList.remove("active"));

    function refreshPanel() {
      const saved = getSaved();
      updateBadge();
      if (!saved.length) {
        body.innerHTML = `<div class="vx-marks-empty">— 尚無標記 —</div>`;
        return;
      }
      body.innerHTML = saved.map((text, i) => `
        <div class="vx-marks-item" data-idx="${i}">
          <p class="vx-marks-text">${(text || "").replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"})[c])}</p>
          <div class="vx-marks-actions">
            <button class="vx-marks-jump" type="button">↗ 跳轉</button>
            <button class="vx-marks-del" type="button">✕ 刪除</button>
          </div>
        </div>
      `).join("");
      body.querySelectorAll(".vx-marks-jump").forEach((b, i) => b.addEventListener("click", () => {
        const text = saved[+b.closest(".vx-marks-item").dataset.idx];
        const m = articleEl.querySelector(".vx-mark");
        const allMarks = articleEl.querySelectorAll(".vx-mark");
        const target = Array.from(allMarks).find(el => el.textContent === text);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.style.transition = "background 0.4s";
          target.style.background = "rgba(201,169,97,0.6)";
          setTimeout(() => target.style.background = "", 1400);
        }
        panel.classList.remove("active");
      }));
      body.querySelectorAll(".vx-marks-del").forEach((b) => b.addEventListener("click", () => {
        const idx = +b.closest(".vx-marks-item").dataset.idx;
        const cur = getSaved();
        const removed = cur.splice(idx, 1)[0];
        setSaved(cur);
        /* Unwrap matching <mark>s */
        articleEl.querySelectorAll(".vx-mark").forEach(m => {
          if (m.textContent === removed) {
            const t = document.createTextNode(m.textContent);
            m.parentNode.replaceChild(t, m);
          }
        });
        refreshPanel();
      }));
    }

    btn.addEventListener("click", () => {
      panel.classList.toggle("active");
      if (panel.classList.contains("active")) refreshPanel();
    });
  }
  function highlightText(root, text) {
    if (!text) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (n.parentElement?.closest("a, mark, .vx-toc, .vx-summary, .vx-sources, figure, .vx-prevnext"))
          return NodeFilter.FILTER_REJECT;
        return n.nodeValue.includes(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const idx = node.nodeValue.indexOf(text);
      if (idx < 0) return;
      const before = node.nodeValue.slice(0, idx);
      const after = node.nodeValue.slice(idx + text.length);
      const mark = document.createElement("mark");
      mark.className = "vx-mark";
      mark.textContent = text;
      const parent = node.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(mark, node);
      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
    });
  }

  /* ---------- 10. KATEX (lazy) ---------- */
  function initKatex() {
    if (!isArticle) return;
    const text = articleEl.textContent || "";
    const hasInline = /\$[^\$\n]+\$/.test(text);
    const hasBlock = /\$\$[\s\S]+?\$\$/.test(text);
    if (!hasInline && !hasBlock) return;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(css);
    const s1 = document.createElement("script");
    s1.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
      s2.onload = () => {
        window.renderMathInElement(articleEl, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
        });
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }

  /* ---------- 11. TTS ---------- */
  function initTTS() {
    if (!isArticle || !("speechSynthesis" in window)) return;
    const tools = ensureToolbar();
    const btn = document.createElement("button");
    btn.className = "vx-tool-btn vx-tts-btn";
    btn.title = "朗讀本文 / Read aloud";
    btn.innerHTML = "🔊";
    tools.appendChild(btn);
    let speaking = false;
    let utter = null;
    btn.addEventListener("click", () => {
      if (speaking) {
        speechSynthesis.cancel();
        speaking = false;
        btn.classList.remove("active");
        return;
      }
      const text = collectArticleText();
      utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-TW";
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.onend = () => { speaking = false; btn.classList.remove("active"); };
      utter.onerror = () => { speaking = false; btn.classList.remove("active"); };
      speechSynthesis.speak(utter);
      speaking = true;
      btn.classList.add("active");
    });
  }
  function collectArticleText() {
    const clone = articleEl.cloneNode(true);
    clone.querySelectorAll(".vx-toc, .vx-summary, .vx-sources, figure, .vx-prevnext, .vx-back, .vx-back-top, .vx-related, .vx-article-tags, .crumb, .meta").forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, " ").trim().slice(0, 8000);
  }

  /* ---------- TOOLBAR ---------- */
  function ensureToolbar() {
    let t = document.querySelector(".vx-toolbar");
    if (t) return t;
    t = document.createElement("div");
    t.className = "vx-toolbar";
    document.body.appendChild(t);
    return t;
  }

  /* ---------- INIT ---------- */
  function init() {
    initProgress();
    initCitationPreview();
    initSectionDots();
    initPrevNext();
    initEnhancedSearch();
    initChartLightbox();
    initFontToggle();
    initHighlights();
    initKatex();
    initTTS();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
