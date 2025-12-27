// /js/home/renderBanner.js

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * promo object (from view or fallback) fields used:
 * - banner_title
 * - banner_subtitle
 * - banner_badge
 * - banner_image_path
 * - name / description / type (fallbacks)
 */
export function renderHomeBanner(promo) {
  const titleEl = document.getElementById("promoTitle");
  const subEl = document.getElementById("promoSubtitle");
  const kickerEl = document.getElementById("promoKicker");
  const badgesEl = document.getElementById("promoBadges");
  const imgEl = document.getElementById("promoBannerImg");

  if (!titleEl || !subEl || !kickerEl || !badgesEl) return;

  // -----------------------------
  // NO PROMO (fallback state)
  // -----------------------------
  if (!promo) {
    kickerEl.textContent = "Welcome";
    titleEl.innerHTML = "Featured Drop";
    subEl.textContent =
      "New deals rotate based on what’s live — check back for fresh promos.";
    badgesEl.innerHTML = "";

    if (imgEl) {
      imgEl.src = "";
      imgEl.classList.add("is-hidden");
    }

    return;
  }

  // -----------------------------
  // TEXT CONTENT
  // -----------------------------
  kickerEl.textContent = "Promotion";

  titleEl.innerHTML = esc(
    promo.banner_title ||
    promo.name ||
    "Promotion"
  );

  subEl.textContent = String(
    promo.banner_subtitle ||
    promo.description ||
    ""
  );

  // -----------------------------
  // BADGES
  // -----------------------------
  badgesEl.innerHTML = "";

  const badge = String(promo.banner_badge || "").trim();
  if (badge) {
    const span = document.createElement("span");
    span.className = `kk-promo-badge ${badgeClassFromPromo(promo)}`;
    span.textContent = badge;
    badgesEl.appendChild(span);
  }

  // -----------------------------
  // BANNER IMAGE
  // -----------------------------
  if (imgEl) {
    const path = String(promo.banner_image_path || "").trim();

    if (path) {
      imgEl.src = path;
      imgEl.alt = promo.banner_title || promo.name || "Promotion banner";
      imgEl.classList.remove("is-hidden");
    } else {
      imgEl.src = "";
      imgEl.classList.add("is-hidden");
    }
  }
}

function badgeClassFromPromo(promo) {
  const t = String(promo.type || "").toLowerCase();

  if (t === "percentage") return "kk-promo-badge-percentage";
  if (t === "fixed") return "kk-promo-badge-fixed";
  if (t === "bogo") return "kk-promo-badge-bogo";
  if (t === "free-shipping") return "kk-promo-badge-ship";

  return "kk-promo-badge-default";
}
