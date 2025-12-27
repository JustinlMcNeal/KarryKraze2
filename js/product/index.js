// js/product/index.js
import { initNavbar } from "../shared/navbar.js";

import {
  fetchProductBySlug,
  fetchCategoryName,
  fetchVariants,
  fetchGallery,
  fetchTags,
  fetchSectionItems,
} from "./api.js";

import {
  money,
  shippingText,
  pickMainImage,
  renderThumbs,
  renderTags,
  renderVariantSwatches,
  renderDetailsSections,
  renderMainCarousel,
} from "./render.js";

import { getProductPromotions, getBestProductDiscount } from "/js/shared/promotionLoader.js";
import { getPromoPill } from "/js/shared/promotionDisplay.js";


let selectedVariant = null;

function show(el, yes) {
  if (!el) return;
  el.classList.toggle("hidden", !yes);
}

function setActionMsg(els, msg, isError = false) {
  if (!els.actionMsg) return;
  els.actionMsg.textContent = msg || "";
  els.actionMsg.style.color = isError ? "#b91c1c" : "#111";
  show(els.actionMsg, !!msg);
}

function getSlugFromUrl() {
  const u = new URL(location.href);
  return (u.searchParams.get("sku") || u.searchParams.get("slug") || "")
    .trim()
    .toLowerCase();
}

function buildCartPayload(els, product, tags = []) {
  const qty = Math.max(1, Number(els.qty?.value || 1));

  // normalize tags into plain strings (your fetchTags() returns names)
  const tagNames = (tags || []).filter(Boolean).map((t) => String(t));

  return {
    source: "product-page",

    // identifiers
    id: product.id,                 // ✅ keep UUID as internal cart id
    product_id: product.code,       // ✅ THIS becomes "KK-1001"
    product_uuid: product.id,       // ✅ optional, but super useful later
    slug: product.slug,


    // display
    name: product.name,
    price: Number(product.price || 0),
    image: product.primary_image_url || product.catalog_image_url || null,
    variant: selectedVariant?.option_value || "",

    // qty
    qty,

    // ✅ PROMO / BOGO REQUIRED FIELDS
    category_id: product.category_id || null,
    category_ids: product.category_id ? [product.category_id] : [],

    // ✅ if you ever run tag-based promos:
    tags: tagNames,
    tag_ids: [], // keep empty unless you store tag UUIDs (you currently store tag names)
  };
}


function emitAddToCart(payload) {
  window.dispatchEvent(new CustomEvent("kk:addToCart", { detail: payload }));
}

function killJump(e) {
  e.preventDefault();
  e.stopPropagation();
}

async function initProductPage() {
  // Grab elements AFTER DOM is ready
  const els = {
    details: document.getElementById("productSections"),
    loading: document.getElementById("productLoading"),
    error: document.getElementById("productError"),
    errorMsg: document.getElementById("errorMsg"),
    wrap: document.getElementById("productWrap"),

    crumbName: document.getElementById("crumbName"),
    category: document.getElementById("productCategory"),
    name: document.getElementById("productName"),
    code: document.getElementById("productCode"),
    price: document.getElementById("productPrice"),
    shipping: document.getElementById("shippingLine"),

    carousel: document.getElementById("mainCarousel"),
    prev: document.getElementById("imgPrev"),
    next: document.getElementById("imgNext"),

    thumbRow: document.getElementById("thumbRow"),
    tagRow: document.getElementById("tagRow"),
    variantSwatches: document.getElementById("variantSwatches"),

    qty: document.getElementById("qty"),
    addBtn: document.getElementById("btnAddToCart"),
    buyBtn: document.getElementById("btnBuyNow"),
    actionMsg: document.getElementById("actionMsg"),
  };

  const slug = getSlugFromUrl();

  if (!slug) {
    show(els.loading, false);
    show(els.error, true);
    if (els.errorMsg) {
      els.errorMsg.textContent =
        "Missing product slug. Go back to the catalog and select an item.";
    }
    return;
  }

  try {
    show(els.loading, true);
    show(els.error, false);
    show(els.wrap, false);
    setActionMsg(els, "");

    const product = await fetchProductBySlug(slug);

    const [categoryName, variants, gallery, tags, sectionItems] =
      await Promise.all([
        fetchCategoryName(product.category_id),
        fetchVariants(product.id),
        fetchGallery(product.id),
        fetchTags(product.id),
        fetchSectionItems(product.id),
      ]);

    // Load applicable promotions
    const categoryIds = product.category_id ? [product.category_id] : [];
    const tagIds = tags ? tags.map((t) => (typeof t === "string" ? t : t.id)) : [];
    const applicablePromos = await getProductPromotions(product.id, categoryIds, tagIds);
    console.log(`[Product] Applicable promos for ${product.name}:`, applicablePromos);
    console.log(`[Product] categoryIds:`, categoryIds, `tagIds:`, tagIds);

    document.title = `KARRY KRAZE — ${product.name}`;
    if (els.crumbName) els.crumbName.textContent = product.name;
    if (els.category) els.category.textContent = categoryName || "Karry Kraze";
    if (els.name) els.name.textContent = product.name;
    if (els.code)
      els.code.textContent = product.code ? `Code: ${product.code}` : "";
    if (els.price) {
      const { amount: priceDiscount } = getBestProductDiscount(applicablePromos, Number(product.price || 0));
      if (priceDiscount > 0) {
        const discounted = Math.max(0, Number(product.price || 0) - priceDiscount);
        els.price.innerHTML = `
          <span class="kk-price kk-price--old" style="text-decoration:line-through; opacity:.6;">${money(product.price)}</span>
          <span class="kk-price kk-price--new" style="color:#16a34a; margin-left:8px;">${money(discounted)}</span>
        `;
      } else {
        els.price.textContent = money(product.price);
      }
    }
    if (els.shipping)
      els.shipping.textContent = shippingText(product.shipping_status);

    // Show promotions if applicable
    const promoEl = document.getElementById("productPromos");
    if (promoEl && applicablePromos.length > 0) {
      promoEl.innerHTML = applicablePromos
        .map((p) => getPromoPill(p))
        .join("");
      show(promoEl, true);
    } else if (promoEl) {
      show(promoEl, false);
    }

    // Build image list (dedup)
    const imgUrls = [
      product.catalog_image_url,
      product.primary_image_url,
      ...(gallery || []).map((g) => g.url),
      ...(variants || []).map((v) => v.preview_image_url).filter(Boolean),
    ].filter(Boolean);

    const uniqueImgs = Array.from(new Set(imgUrls));
    if (!uniqueImgs.length) {
      uniqueImgs.push(pickMainImage(product, gallery, variants));
    }

    // MAIN carousel
    let thumbsCtl = null;
    const carousel = renderMainCarousel(els.carousel, uniqueImgs, (idx) => {
      thumbsCtl?.setActive(idx);
    });

    // Desktop only thumbs
    if (window.matchMedia("(min-width: 900px)").matches) {
      thumbsCtl = renderThumbs(els.thumbRow, uniqueImgs, (_url, idx) => {
        carousel?.setIndex(idx);
      });
    }

    // Arrows
    if (els.prev) {
      els.prev.addEventListener("pointerdown", killJump, { passive: false });
      els.prev.addEventListener(
        "click",
        (e) => {
          killJump(e);
          carousel?.prev();
        },
        { passive: false }
      );
    }

    if (els.next) {
      els.next.addEventListener("pointerdown", killJump, { passive: false });
      els.next.addEventListener(
        "click",
        (e) => {
          killJump(e);
          carousel?.next();
        },
        { passive: false }
      );
    }

    // Tags
    renderTags(els.tagRow, tags);

    // Variants
    if (els.variantSwatches) {
      renderVariantSwatches(els.variantSwatches, variants, (v) => {
        selectedVariant = v || null;

        if (v?.preview_image_url) {
          const matchIdx = uniqueImgs.indexOf(v.preview_image_url);
          if (matchIdx >= 0) carousel?.setIndex(matchIdx);
        }
      });
    }

    // Details sections
    renderDetailsSections(els.details, sectionItems);

    // Cart actions
    if (els.addBtn) {
      els.addBtn.onclick = () => {
        const payload = buildCartPayload(els, product, tags);

        emitAddToCart(payload);
        setActionMsg(els, "Added to cart.");
      };
    }

    if (els.buyBtn) {
      els.buyBtn.onclick = () => {
        const payload = buildCartPayload(els, product, tags);

        emitAddToCart(payload);
        setActionMsg(els, "Added to cart. Open your cart to checkout.");
      };
    }

    show(els.loading, false);
    show(els.wrap, true);
  } catch (err) {
    console.error(err);
    show(els.loading, false);
    show(els.error, true);
    if (els.errorMsg) els.errorMsg.textContent = err?.message || String(err);
  }
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initProductPage();
});
