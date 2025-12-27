// /js/home/renderGrid.js

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

const PRODUCT_PAGE = "/pages/product.html";

// preference order for swatches (you can expand this list)
const COLOR_KEYS = new Set(["color", "colour", "clr", "shade", "style"]);

function looksLikeHex(s) {
  const v = String(s || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

function normalizeKey(s) {
  return String(s || "").trim().toLowerCase();
}

/**
 * Choose which variants to show as dots:
 * - Prefer option_name that looks like "color"
 * - Else fallback to the first option_name group
 */
function pickVariantsForDots(allVariants = []) {
  if (!allVariants.length) return [];

  // Group by option_name_key
  const groups = new Map();
  for (const v of allVariants) {
    const k = normalizeKey(v.option_name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  }

  // find a "color" group first
  for (const [k, arr] of groups.entries()) {
    if (COLOR_KEYS.has(k)) return arr;
  }

  // else pick the largest group (often color anyway), fallback to first
  let best = null;
  for (const arr of groups.values()) {
    if (!best || arr.length > best.length) best = arr;
  }
  return best || allVariants;
}

export function renderHomeGrid(products = [], variantMap = new Map()) {
  const grid = document.getElementById("homeProductGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = products.slice(0, 10);

  for (const p of list) {
    const variants = variantMap.get(p.id) || [];
    grid.appendChild(makeCard(p, variants));
  }

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "kk-sub";
    empty.style.padding = "10px 2px";
    empty.textContent = "No items found in this category right now.";
    grid.appendChild(empty);
  }
}

function makeCard(p, variantsAll) {
  const a = document.createElement("a");
  a.className = "kk-home-card";
  a.href = `${PRODUCT_PAGE}?slug=${encodeURIComponent(p.slug)}`;
  a.setAttribute("aria-label", p.name || "View product");

  // ---------- Image ----------
  const thumb = document.createElement("div");
  thumb.className = "kk-home-thumb";

  const imgUrl =
    p.catalog_image_url ||
    p.primary_image_url ||
    "";

  let imgEl = null;

  if (imgUrl) {
    imgEl = document.createElement("img");
    imgEl.src = imgUrl;
    imgEl.alt = p.name || "Product image";
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.style.width = "100%";
    imgEl.style.height = "100%";
    imgEl.style.objectFit = "cover";
    imgEl.style.display = "block";

    thumb.innerHTML = "";
    thumb.appendChild(imgEl);

    // Hover swap if provided (desktop)
    if (p.catalog_hover_url) {
      a.addEventListener("mouseenter", () => { imgEl.src = p.catalog_hover_url; });
      a.addEventListener("mouseleave", () => { imgEl.src = imgUrl; });
    }
  }

  // ---------- Body ----------
  const body = document.createElement("div");
  body.className = "kk-home-card-body";

  const title = document.createElement("div");
  title.className = "kk-home-card-title";
  title.innerHTML = esc(p.name || "Product");

  const price = document.createElement("div");
  price.className = "kk-home-price kk-home-price--center";
  price.textContent = money(p.price);

  // ---------- Variants row ----------
  const variantRow = document.createElement("div");
  variantRow.className = "kk-home-variants";

  // Pick which option_name to show as dots
  const dotVariants = pickVariantsForDots((variantsAll || []).filter(v => v?.is_active));

  if (dotVariants.length) {
    const shown = dotVariants.slice(0, 6);

    for (const v of shown) {
      const dot = makeVariantDot(v);

      // Optional: preview image on hover (desktop only)
      // If variant has preview_image_url, swap image while hovering over the dot.
      if (imgEl && v.preview_image_url) {
        dot.addEventListener("mouseenter", () => { imgEl.src = v.preview_image_url; });
        dot.addEventListener("mouseleave", () => { imgEl.src = imgUrl || imgEl.src; });
      }

      variantRow.appendChild(dot);
    }

    const remaining = dotVariants.length - shown.length;
    if (remaining > 0) {
      const more = document.createElement("span");
      more.className = "kk-home-variant-more";
      more.textContent = `+${remaining}`;
      variantRow.appendChild(more);
    }
  } else {
    variantRow.style.display = "none";
  }

  body.appendChild(title);
  body.appendChild(price);
  body.appendChild(variantRow);

  a.appendChild(thumb);
  a.appendChild(body);

  return a;
}

function makeVariantDot(variant) {
  const dot = document.createElement("span");
  dot.className = "kk-home-variant-dot";

  const value = String(variant.option_value || "").trim().toLowerCase();
  dot.title = variant.option_value || "";

  // 1️⃣ Hex color support (best case)
  if (looksLikeHex(value)) {
    dot.style.background = value;
  }

  // 2️⃣ Named color fallback (most common)
  else {
    const COLOR_MAP = {
      black: "#000000",
      white: "#ffffff",
      cream: "#f6f1e8",
      ivory: "#f7f3eb",
      beige: "#e7d8c9",
      tan: "#d2b48c",
      brown: "#7a4a2e",
      pink: "#f58f86",
      red: "#c0392b",
      burgundy: "#800020",
      maroon: "#800000",
      purple: "#7e57c2",
      lavender: "#c1b3e0",
      blue: "#2f5bea",
      navy: "#1f2a44",
      green: "#2e7d32",
      olive: "#6b8e23",
      yellow: "#f4d03f",
      gold: "#d4af37",
      orange: "#f39c12",
      gray: "#9e9e9e",
      grey: "#9e9e9e",
      silver: "#cfd8dc",
    };

    if (COLOR_MAP[value]) {
      dot.style.background = COLOR_MAP[value];
    } else {
      // fallback: neutral
      dot.style.background = "#ffffff";
    }
  }

  // 3️⃣ Out of stock
  if (Number(variant.stock) <= 0) {
    dot.classList.add("is-oos");
  }

  return dot;
}

