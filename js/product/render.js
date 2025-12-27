function esc(str) {
  return String(str).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}

export function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function shippingText(shipping_status) {
  if (shipping_status === "mto") return "Made to order · ships in 3–5 weeks";
  return "Ready to ship · ships in 1–3 business days";
}

export function pickMainImage(product, gallery = [], variants = []) {
  return (
    product?.primary_image_url ||
    product?.catalog_image_url ||
    gallery?.[0]?.url ||
    variants?.[0]?.preview_image_url ||
    "/imgs/brand/placeholder.png"
  );
}

/**
 * MAIN CAROUSEL
 * - Builds slides (scroll-snap)
 * - Supports setIndex/next/prev
 * - Calls onIndexChange(index, url)
 */
export function renderMainCarousel(trackEl, images = [], onIndexChange) {
  if (!trackEl) return null;

  trackEl.innerHTML = "";
  const list = (images || []).filter(Boolean);
  if (!list.length) return null;

  list.forEach((url, idx) => {
    const slide = document.createElement("div");
    slide.className = "kk-carousel-slide";
    slide.dataset.idx = String(idx);
    slide.innerHTML = `<img src="${esc(url)}" alt="Image ${idx + 1}" loading="${idx === 0 ? "eager" : "lazy"}">`;
    trackEl.appendChild(slide);
  });

  let activeIndex = 0;

  function scrollToIndex(i, behavior = "smooth") {
    const clamped = Math.max(0, Math.min(list.length - 1, i));
    activeIndex = clamped;

    const w = trackEl.clientWidth || 1;
    trackEl.scrollTo({ left: clamped * w, behavior });

    onIndexChange?.l?.(activeIndex, list[activeIndex]);
    onIndexChange?.(activeIndex, list[activeIndex]);
  }

  // Update active index on swipe/scroll
  let raf = null;
  trackEl.addEventListener("scroll", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = trackEl.clientWidth || 1;
      const i = Math.round(trackEl.scrollLeft / w);
      const clamped = Math.max(0, Math.min(list.length - 1, i));
      if (clamped !== activeIndex) {
        activeIndex = clamped;
        onIndexChange?.(activeIndex, list[activeIndex]);
      }
    });
  });

  // On resize, keep the same index aligned
  window.addEventListener("resize", () => {
    scrollToIndex(activeIndex, "auto");
  });

  return {
    count: list.length,
    getIndex: () => activeIndex,
    setIndex: (i, behavior) => scrollToIndex(i, behavior),
    next: () => scrollToIndex(activeIndex + 1),
    prev: () => scrollToIndex(activeIndex - 1),
    getUrl: (i) => list[i],
  };
}

/**
 * THUMBNAILS
 * - returns controller with setActive(index)
 */
export function renderThumbs(thumbRowEl, images = [], onPick) {
  if (!thumbRowEl) return null;
  thumbRowEl.innerHTML = "";

  const list = (images || []).filter(Boolean);

  if (!list.length) {
    thumbRowEl.innerHTML = `<div class="kk-sub" style="opacity:.7;">No extra images</div>`;
    return null;
  }

  const btns = [];

  list.forEach((url, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `kk-thumb${idx === 0 ? " is-active" : ""}`;
    btn.dataset.idx = String(idx);
    btn.innerHTML = `<img src="${esc(url)}" alt="thumb ${idx + 1}">`;

    btn.addEventListener("click", () => onPick?.(url, idx));
    thumbRowEl.appendChild(btn);
    btns.push(btn);
  });

  function setActive(i) {
    btns.forEach((b) => b.classList.remove("is-active"));
    const btn = btns[i];
    if (btn) btn.classList.add("is-active");
  }

  return { setActive, count: list.length };
}

export function renderTags(tagRowEl, tags = []) {
  if (!tagRowEl) return;
  tagRowEl.innerHTML = "";

  const safe = (tags || []).filter(Boolean).slice(0, 10);
  if (!safe.length) return;

  safe.forEach((t) => {
    const pill = document.createElement("span");
    pill.textContent = t;

    pill.style.border = "4px solid #000";
    pill.style.padding = "8px 10px";
    pill.style.fontWeight = "1000";
    pill.style.letterSpacing = ".12em";
    pill.style.textTransform = "uppercase";
    pill.style.fontSize = "11px";
    pill.style.background = "#fff";
    pill.style.color = "#000";

    tagRowEl.appendChild(pill);
  });
}

/* ---------------- Swatches (Variants) ---------------- */

const COLOR_MAP = {
  black: "#000000",
  white: "#ffffff",
  pink: "#ff6ea8",
  hotpink: "#ff3d9a",
  rose: "#ff6ea8",
  red: "#e11d48",
  blue: "#2563eb",
  green: "#16a34a",
  beige: "#d6c6b2",
  tan: "#d6c6b2",
  brown: "#7c3f2a",
  gray: "#6b7280",
  grey: "#6b7280",
  purple: "#7c3aed",
  orange: "#f97316",
  yellow: "#f59e0b",
};

function guessColor(optionValue) {
  const raw = String(optionValue || "").trim().toLowerCase();
  if (COLOR_MAP[raw]) return COLOR_MAP[raw];
  for (const key of Object.keys(COLOR_MAP)) {
    if (raw.includes(key)) return COLOR_MAP[key];
  }
  return "#ffffff";
}

export function renderVariantSwatches(containerEl, variants = [], onPick) {
  if (!containerEl) return { active: null };

  containerEl.innerHTML = "";

  if (!variants.length) {
    containerEl.innerHTML = `<div class="kk-sub" style="opacity:.7;">Default</div>`;
    onPick?.(null);
    return { active: null };
  }

  let activeId = variants[0]?.id || null;

  variants.forEach((v, idx) => {
    const label = v.option_value || `Option ${idx + 1}`;
    const color = guessColor(label);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kk-swatch" + (idx === 0 ? " is-active" : "");
    btn.dataset.id = v.id;

    btn.innerHTML = `
      <span class="kk-swatch-dot" style="background:${esc(color)};"></span>
      <span class="kk-swatch-label">${esc(label)}</span>
    `;

    btn.addEventListener("click", () => {
      activeId = v.id;
      containerEl.querySelectorAll(".kk-swatch").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      onPick?.(v);
    });

    containerEl.appendChild(btn);
  });

  onPick?.(variants[0]);
  return { active: activeId };
}

export function renderDetailsSections(containerEl, items = []) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  if (!items.length) {
    containerEl.innerHTML = `<div class="kk-sub" style="opacity:.7;">No details yet.</div>`;
    return;
  }

  const order = ["description", "sizing", "care"];
  const grouped = {};
  order.forEach((k) => (grouped[k] = []));
  items.forEach((it) => {
    if (!grouped[it.section]) grouped[it.section] = [];
    grouped[it.section].push(it);
  });

  order.forEach((k) => grouped[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));

  containerEl.innerHTML = order
    .filter((k) => grouped[k]?.length)
    .map(
      (k) => `
        <div style="margin-top:18px; border-top:2px solid rgba(0,0,0,.15); padding-top:16px;">
          <div class="kk-kicker">${esc(k)}</div>
          <ul class="kk-sub" style="margin-top:10px; padding-left:18px; opacity:.85; line-height:1.6;">
            ${grouped[k].map((row) => `<li>${esc(row.content)}</li>`).join("")}
          </ul>
        </div>
      `
    )
    .join("");
}
