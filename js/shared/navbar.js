// js/shared/navbar.js

import { addToCart, getCart } from "./cartStore.js";
import { initDrawer } from "./drawer.js";
import { renderCartDrawer } from "./cart/cartDrawer.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { initCouponUI } from "./couponUI.js";
import {
  calculateCartTotals,
  buildCheckoutPromoPayload,
} from "./cart/cartTotals.js";

// Path to your navbar insert file
const NAVBAR_URL = "/page_inserts/navbar.html";

// helper: wait for next microtask/frame so injected DOM exists
function nextTick() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function ensureNavbarInjected() {
  // If navbar already exists in DOM (ex: product.html hard-coded), no need to inject
  if (document.querySelector("[data-kk-nav]")) return;

  // Prefer mounting into #kkNavbarMount if present
  const mount = document.getElementById("kkNavbarMount");

  // If mount exists and already has navbar content, no need to fetch again
  if (mount && mount.querySelector("[data-kk-nav]")) return;

  try {
    const res = await fetch(NAVBAR_URL, { cache: "no-store" });
    if (!res.ok)
      throw new Error(`Navbar fetch failed: ${res.status} ${res.statusText}`);

    const html = await res.text();

    if (mount) {
      mount.innerHTML = html;
    } else {
      // Fallback: inject at top of body
      document.body.insertAdjacentHTML("afterbegin", html);
    }

    // Let browser commit DOM before other init code queries it
    await nextTick();
  } catch (err) {
    console.error("Navbar injection error:", err);
  }
}

export async function initNavbar() {
  // 1) Make sure navbar markup exists
  await ensureNavbarInjected();

  // 2) Now drawers/cart can safely initialize
  initDrawer();
  renderCartDrawer();
  initCouponUI();

  // Listen for cart updates and re-render
  window.addEventListener("kk-cart-updated", () => {
    renderCartDrawer();
  });

  // Listen for product page add-to-cart events (only bind once)
  if (!window.__kkAddToCartBound) {
    window.__kkAddToCartBound = true;
    window.addEventListener("kk:addToCart", (e) => addToCart(e.detail));
  }

  // Active nav state
  const path = location.pathname;
  document.querySelectorAll(".kk-drawer-link").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href && path.includes(href)) {
      link.classList.add("is-active");
      link.style.background = "#000";
      link.style.color = "#fff";
    }
  });

  // Stripe checkout (bind once)
  const checkoutBtn = document.querySelector("[data-kk-checkout]");
  if (checkoutBtn && !checkoutBtn.__kkBound) {
    checkoutBtn.__kkBound = true;

    checkoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const cart = getCart();
      if (!cart.length) {
        alert("Your cart is empty.");
        return;
      }

      try {
        const supabase = getSupabaseClient();

        // ✅ Use the SAME totals engine as the cart drawer (includes BOGO + coupons)
        const totals = await calculateCartTotals(cart);

        const subtotal = Number(totals.subtotal || 0);
        const total = Number(totals.total || 0);

        // ✅ Total discount across everything (auto promos + bogo + coupon)
        const totalDiscounts = Math.max(0, subtotal - total);

        // ✅ Build promo metadata for webhook storage
        // - code = manual code only (if any)
        // - savings_cents = auto + code combined (supports double discount)
        // - savings_code_cents / savings_auto_cents included too
        const promo = await buildCheckoutPromoPayload(cart);

        // Distribute total discounts proportionally across items
        const cartSubtotal =
          cart.reduce(
            (sum, item) =>
              sum +
              Number(item.price || 0) * Math.max(1, Number(item.qty || 1)),
            0
          ) || 1;

        const items = cart.map((item) => {
          const qty = Math.max(1, Number(item.qty || 1));
          const unitPrice = Number(item.price || 0);
          const lineSubtotal = unitPrice * qty;

          const weight = lineSubtotal / cartSubtotal;
          const lineDiscount = totalDiscounts * weight;

          const unitDiscount = lineDiscount / qty;
          const discounted_price = Math.max(0, unitPrice - unitDiscount);

          return {
            // ✅ THIS is what we want in line_items_raw.product_id
            product_id: item.product_id || item.id, // should be "KK-1001"
            name: item.name, // base name only
            variant: item.variant || "",
            price: unitPrice,
            discounted_price,
            qty,
            image: item.image || "",
          };
        });

        // keep your localhost normalization
        const origin = location.origin.replace("127.0.0.1", "localhost");

        const res = await supabase.functions.invoke("create-checkout-session", {
          body: {
            items,
            promo, // ✅ NEW: sends promo truth to Stripe session metadata
            success_url: `${origin}/pages/success.html`,
            cancel_url: `${origin}${location.pathname}${location.search}`,
          },
        });

        console.log("checkout invoke result:", res);

        if (res.error) {
          console.error("invoke error:", res.error);

          const resp = res.error?.context?.response;
          if (resp) {
            const text = await resp.text();
            console.error("function response body:", text);

            try {
              const j = JSON.parse(text);
              alert(`Checkout failed: ${j.error || text}`);
            } catch {
              alert(`Checkout failed: ${text}`);
            }
          } else {
            alert(`Checkout failed: ${res.error.message || "Unknown error"}`);
          }
          return;
        }

        if (res.data?.error) {
          console.error("function error:", res.data.error);
          alert(`Checkout failed: ${res.data.error}`);
          return;
        }

        if (!res.data?.url) {
          alert("Checkout failed: No session URL returned");
          return;
        }

        window.location.href = res.data.url;
      } catch (err) {
        console.error(err);
        alert("Checkout failed. Please try again.");
      }
    });
  }
}
