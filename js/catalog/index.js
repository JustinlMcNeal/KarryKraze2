// index.js
import { createCatalogState } from "./state.js";
import { readUrlState, writeUrlState } from "./urlState.js";
import { fetchCatalogProducts } from "./fetchProducts.js";
import { filterProducts } from "./filters.js";
import { matchesQuery } from "./search.js";
import { sortProducts } from "./sort.js";
import { renderGrid } from "./renderGrid.js";

const store = createCatalogState();

function $(id) {
  return document.getElementById(id);
}

function setCount(el, n) {
  if (!el) return;
  el.textContent = `${n} item${n === 1 ? "" : "s"}`;
}

function render() {
  const s = store.getState();

  const gridEl = $("catalogGrid");
  const countEl = $("catalogCount");

  if (s.error) {
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="p-4 border border-red-200 bg-red-50 text-red-900 rounded-xl">
          <div class="font-semibold">Catalog error</div>
          <div class="text-sm mt-1">${String(s.error.message || s.error)}</div>
        </div>
      `;
    }
    setCount(countEl, 0);
    return;
  }

  if (s.isLoading) {
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="p-4 border border-black/10 bg-white rounded-xl">
          <div class="animate-pulse text-sm text-black/60">Loading products…</div>
        </div>
      `;
    }
    return;
  }

  const filtered = filterProducts(s.products, { category: s.category, query: s.query }, { matchesQuery });
  const sorted = sortProducts(filtered, s.sort);

  renderGrid(gridEl, sorted);
  setCount(countEl, sorted.length);
}

function bindSearch() {
  const input = $("catalogSearch");
  if (!input) return;

  // initialize input value from state
  input.value = store.getState().query || "";

  input.addEventListener("input", (e) => {
    const query = e.target.value || "";
    store.setState({ query });

    // keep URL synced
    const s = store.getState();
    writeUrlState({ category: s.category, query: s.query, sort: s.sort }, { replace: true });

    render();
  });
}

async function init() {
  // Apply URL state first
  const urlState = readUrlState();
  store.setState({
    category: (urlState.category || "").toLowerCase(),
    query: urlState.query || "",
    sort: urlState.sort || "newest",
  });

  // Bind UI
  bindSearch();
  render();

  // Load data
  try {
    store.setState({ isLoading: true, error: null });
    const products = await fetchCatalogProducts();
    store.setState({ products, isLoading: false });
    render();

    // If URL has q, reflect it into input after fetch
    const input = $("catalogSearch");
    if (input) input.value = store.getState().query || "";
  } catch (err) {
    store.setState({ isLoading: false, error: err });
    render();
  }
}

window.addEventListener("popstate", () => {
  // handle back/forward
  const urlState = readUrlState();
  store.setState({
    category: (urlState.category || "").toLowerCase(),
    query: urlState.query || "",
    sort: urlState.sort || "newest",
  });

  const input = $("catalogSearch");
  if (input) input.value = store.getState().query || "";

  render();
});

document.addEventListener("DOMContentLoaded", init);
