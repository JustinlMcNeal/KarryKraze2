// /js/home/renderBanner.js

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * promo object fields used:
 * - banner_title
 * - banner_subtitle
 * - banner_image_path
 * - name / description (fallbacks)
 */
export function renderHomeBanner(promo) {
  const titleEl = document.getElementById("promoTitle");
  const subEl = document.getElementById("promoSubtitle");
  const kickerEl = document.getElementById("promoKicker");
  const badgesEl = document.getElementById("promoBadges");
  const imgEl = document.getElementById("promoBannerImg");

  if (!titleEl || !subEl || !kickerEl) return;

  // Always clear + hide badge container
  if (badgesEl) badgesEl.innerHTML = "";

  // -----------------------------
  // NO PROMO (fallback state)
  // -----------------------------
  if (!promo) {
    kickerEl.textContent = "Welcome";
    titleEl.innerHTML = "Featured Drop";
    subEl.textContent =
      "New deals rotate based on what’s live — check back for fresh promos.";

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
