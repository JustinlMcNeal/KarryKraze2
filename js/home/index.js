// /js/home/index.js
import { fetchHomePromo, fetchCategories, fetchHomeProducts, fetchVariantsForProducts } from "./api.js";
import { renderHomeBanner } from "./renderBanner.js";
import { renderHomeCategories } from "./renderCategories.js";
import { renderHomeGrid } from "./renderGrid.js";



const state = {
  activeCategoryId: null,
  categories: [],
  loading: false
};

function setLoading(isLoading) {
  state.loading = isLoading;

  const grid = document.getElementById("homeProductGrid");
  if (grid) {
    grid.style.opacity = isLoading ? "0.65" : "1";
    grid.style.pointerEvents = isLoading ? "none" : "auto";
  }
}

async function initNavbar() {
  try {
    await import("/js/shared/navbar.js");
  } catch (e) {
    console.warn("[home] navbar failed to load:", e);
  }
}


async function loadBanner() {
  const promo = await fetchHomePromo();
  renderHomeBanner(promo);
}

function renderCategoriesUI() {
  renderHomeCategories({
    categories: state.categories,
    activeCategoryId: state.activeCategoryId,
    onChange: handleCategoryChange
  });
}

async function handleCategoryChange(categoryId) {
  // ignore redundant clicks
  if (state.activeCategoryId === categoryId) return;

  state.activeCategoryId = categoryId;
  renderCategoriesUI();
  await loadGrid();
}

async function loadCategories() {
  const categories = await fetchCategories();
  state.categories = categories || [];
  renderCategoriesUI();
}

async function loadGrid() {
  try {
    setLoading(true);

    const products = await fetchHomeProducts({
      categoryId: state.activeCategoryId,
      limit: 10
    });

    const ids = products.map(p => p.id).filter(Boolean);
    const variantMap = await fetchVariantsForProducts(ids);

    renderHomeGrid(products, variantMap);
  } catch (err) {
    console.error("[home] grid load error:", err);
    renderHomeGrid([], new Map());
  } finally {
    setLoading(false);
  }
}

async function boot() {
  await initNavbar();

  // Load promo + categories in parallel
  await Promise.allSettled([loadBanner(), loadCategories()]);

  // Then initial grid
  await loadGrid();
}

boot().catch((err) => {
  console.error("[home] fatal init error:", err);
});
