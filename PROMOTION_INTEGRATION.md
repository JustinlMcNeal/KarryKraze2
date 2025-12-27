/**
 * PROMOTION INTEGRATION GUIDE
 * 
 * This file documents how promotions are displayed across your site
 */

/* =====================================================
   INTEGRATION CHECKLIST
===================================================== */

/*
✅ 1. CATALOG PAGE (js/catalog/index.js)
   - Loads promotions for all products
   - Shows promo banner on product cards
   - Displays gradient badge (% OFF, $ OFF, BUY ONE GET ONE, FREE SHIPPING)
   - Re-renders when browsing categories/searching

✅ 2. PRODUCT PAGE (js/product/index.js)
   - Loads promotions for current product
   - Shows promo pills below price
   - Displays up to all applicable promotions with full details
   - Re-loads when variant changes

✅ 3. CART DRAWER (js/shared/cartDrawer.js)
   - Fetches applicable promotions for cart items
   - Shows "ACTIVE PROMOTIONS" section
   - Displays discount breakdown
   - Updates total with applied discounts
   - Requires [data-kk-cart-promos] element in HTML

✅ 4. CSS STYLING (css/theme/base.css)
   - Added .kk-promo-badge (small indicators)
   - Added .kk-product-promo-banner (gradient card on products)
   - Added .kk-promo-pill (inline promotion details)
   - Added .kk-promo-row (checkout line items)
   - Color-coded by type (percentage, fixed, bogo, free-shipping)

✅ 5. SHARED UTILITIES
   - js/shared/promotionLoader.js - Fetches & caches promotions
   - js/shared/promotionDisplay.js - Renders promotion UI elements
   - js/admin/promotions/promotionHelper.js - Core logic
*/

/* =====================================================
   HTML INTEGRATION NEEDED
===================================================== */

/*
UPDATE YOUR NAVBAR / CART DRAWER HTML
=====================================

Add these data attributes to your cart drawer template 
(usually in page_inserts/navbar.html or similar):

BEFORE:
  <div data-kk-cart-items>...</div>
  <div data-kk-cart-subtotal>...</div>

AFTER:
  <div data-kk-cart-items>...</div>
  
  <!-- NEW: Promotions section -->
  <div data-kk-cart-promos></div>
  
  <div data-kk-cart-subtotal>Subtotal: $0.00</div>
  
  <!-- NEW: Total with discount -->
  <div style="font-weight: 700; margin-top: 12px; padding-top: 12px; border-top: 2px solid #ddd;">
    Total: <span data-kk-cart-total>$0.00</span>
  </div>

UPDATE PRODUCT PAGE HTML
==========================

In pages/product.html, add this element in the details section:

BEFORE:
  <h1 id="productName">Product Name</h1>
  <div id="productCode"></div>
  <div id="productPrice">$0.00</div>
  <div id="productShipping">Shipping info</div>

AFTER:
  <h1 id="productName">Product Name</h1>
  <div id="productCode"></div>
  <div id="productPrice">$0.00</div>
  
  <!-- NEW: Promotions -->
  <div id="productPromos" class="hidden" style="margin: 16px 0;"></div>
  
  <div id="productShipping">Shipping info</div>
*/

/* =====================================================
   HOW IT WORKS
===================================================== */

/*
PROMOTION FETCHING
==================
1. promotionLoader.js fetches active promotions from database
2. Cached for 5 minutes to reduce API calls
3. Filtered by date (start_date, end_date)
4. Only public promotions shown to customers

SCOPE MATCHING
==============
For each product/cart, promotions are matched based on:
  - scope_type: "all", "product", "category", "tag"
  - scope_data: Array of IDs to match against

Example:
  Promo 1: scope_type="category", scope_data=["hats"]
    → Applies to all products in "hats" category
  
  Promo 2: scope_type="product", scope_data=["product-123"]
    → Applies only to specific product

BOGO HANDLING
=============
BOGO promotions have special fields:
  - bogo_reward_type: "product", "category", or "tag"
  - bogo_reward_id: ID of the free item/category/tag

In checkout, you'll need to:
1. Check if BOGO qualifies: checkBOGOQualifies(promo, cartItems)
2. Show modal to customer: "Pick a free item from [category]"
3. Add free item at 0 cost

DISCOUNT CALCULATION
====================
- percentage: (subtotal * value) / 100
- fixed: value (flat amount)
- free_shipping: Handled separately in checkout
- bogo: Price of selected free item

Multiple promotions can stack if they're compatible types.
*/

/* =====================================================
   VISUAL EXAMPLES
===================================================== */

/*
CATALOG PAGE BADGE (Product Card):
┌─────────────────────┐
│  Image              │  ┌─ "25% OFF" (green gradient badge)
│                     │  └─ Positioned top-right
├─────────────────────┤
│ Product Name        │
│ $25.00              │
└─────────────────────┘

PRODUCT PAGE PILLS (Below Price):
🎉 25% off
🎉 Buy one get one

CART DRAWER (Checkout):
Item 1  × 2  $50.00
Item 2  × 1  $30.00

━━━━━━━━━━━━━━━━━━━━━
ACTIVE PROMOTIONS
Summer Sale (SUMMER25)  -$12.50
BOGO (BOGO25)           -$25.00

━━━━━━━━━━━━━━━━━━━━━
Subtotal: $80.00
Total:    $42.50
*/

/* =====================================================
   CUSTOMIZATION OPTIONS
===================================================== */

/*
CHANGE PROMO DISPLAY
====================
Edit js/shared/promotionDisplay.js:
- getPromoBadgeHTML() - Change badge HTML/class names
- getPromoCardBanner() - Change banner text/colors
- getPromoCheckoutRow() - Change checkout line format
- getPromoPill() - Change pill emoji/text

CHANGE COLORS
==============
Edit css/theme/base.css:
- .kk-promo-badge-* - Badge colors
- .kk-product-promo-banner-* - Banner gradients
- .kk-promo-pill-* - Pill colors

CHANGE CACHE TIME
=================
Edit js/shared/promotionLoader.js:
const CACHE_TTL = 5 * 60 * 1000; // Change this (milliseconds)

ADD MORE PROMO TYPES
====================
1. Add to type dropdown in admin/products.html
2. Add getPromoTypeLabel() case in promotionDisplay.js
3. Add calculateDiscount() case in promotionHelper.js
4. Add CSS color classes (.kk-promo-badge-{type}, etc.)
*/
