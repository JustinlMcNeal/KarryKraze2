import {
  signIn,
  signOut,
  getSession,
  fetchCategories,
  fetchProducts,
  fetchProductFull,
  upsertProduct,
  setProductActive,
  replaceVariants,
  replaceGallery,
  replaceProductTags,
} from "./api.js";

const els = {
  loginPanel: document.getElementById("loginPanel"),
  appPanel: document.getElementById("appPanel"),
  btnLogin: document.getElementById("btnLogin"),
  btnLogout: document.getElementById("btnLogout"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMsg: document.getElementById("loginMsg"),

  searchInput: document.getElementById("searchInput"),
  countLabel: document.getElementById("countLabel"),
  btnNew: document.getElementById("btnNew"),
  productRows: document.getElementById("productRows"),

  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  btnClose: document.getElementById("btnClose"),
  btnSave: document.getElementById("btnSave"),
  btnDelete: document.getElementById("btnDelete"),
  modalMsg: document.getElementById("modalMsg"),

  fName: document.getElementById("fName"),
  fSlug: document.getElementById("fSlug"),
  fCode: document.getElementById("fCode"),
  fPrice: document.getElementById("fPrice"),
  fWeight: document.getElementById("fWeight"),
  fShipping: document.getElementById("fShipping"),
  fCategory: document.getElementById("fCategory"),
  fActive: document.getElementById("fActive"),
  fCatalogImg: document.getElementById("fCatalogImg"),
  fHoverImg: document.getElementById("fHoverImg"),
  fPrimaryImg: document.getElementById("fPrimaryImg"),
  fTags: document.getElementById("fTags"),

  btnAddVariant: document.getElementById("btnAddVariant"),
  variantList: document.getElementById("variantList"),

  btnAddGallery: document.getElementById("btnAddGallery"),
  galleryList: document.getElementById("galleryList"),
};

let categories = [];
let products = [];
let editing = null; // { product, variants, gallery, tags }

function show(el, yes) {
  el.classList.toggle("hidden", !yes);
}

function setMsg(el, msg, showIt = true) {
  el.textContent = msg || "";
  el.classList.toggle("hidden", !showIt || !msg);
}

function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function normalizeSlug(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function initAuth() {
  const session = await getSession();
  if (session) {
    show(els.loginPanel, false);
    show(els.appPanel, true);
    show(els.btnLogout, true);
    await loadData();
  } else {
    show(els.loginPanel, true);
    show(els.appPanel, false);
    show(els.btnLogout, false);
  }
}

async function loadData() {
  categories = await fetchCategories();
  products = await fetchProducts();
  renderTable();
}

function renderTable() {
  const q = (els.searchInput.value || "").trim().toLowerCase();

  const filtered = products.filter((p) => {
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q)
    );
  });

  els.countLabel.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  els.productRows.innerHTML = filtered
    .map((p) => {
      const cat = catMap.get(p.category_id) || "";
      return `
        <tr>
          <td class="p-3 font-semibold">${p.name || ""}</td>
          <td class="p-3 text-black/70">${p.slug || ""}</td>
          <td class="p-3 text-black/70">${p.code || ""}</td>
          <td class="p-3">${cat}</td>
          <td class="p-3">${money(p.price)}</td>
          <td class="p-3">${p.is_active ? "✅" : "—"}</td>
          <td class="p-3 text-right">
            <button data-edit="${p.id}" class="px-3 py-2 rounded-lg border border-black/15 text-sm font-semibold">
              Edit
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  els.productRows.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });
}

function fillCategorySelect(selectedId) {
  els.fCategory.innerHTML = categories
    .map((c) => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${c.name}</option>`)
    .join("");
}

function clearModalLists() {
  els.variantList.innerHTML = "";
  els.galleryList.innerHTML = "";
}

function addVariantRow(v = { option_value: "", stock: 0, preview_image_url: "", sort_order: 0 }) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-1 md:grid-cols-12 gap-2 border border-black/10 rounded-xl p-3";

  row.innerHTML = `
    <input class="md:col-span-4 border border-black/15 rounded-xl px-3 py-2" placeholder="Color (Black)"
      value="${v.option_value || ""}" data-v="value" />
    <input class="md:col-span-2 border border-black/15 rounded-xl px-3 py-2" type="number" min="0" placeholder="Stock"
      value="${Number(v.stock || 0)}" data-v="stock" />
    <input class="md:col-span-5 border border-black/15 rounded-xl px-3 py-2" placeholder="Preview image URL"
      value="${v.preview_image_url || ""}" data-v="img" />
    <button class="md:col-span-1 px-3 py-2 rounded-xl border border-red-600 text-red-600 font-semibold" data-v="del">X</button>
  `;

  row.querySelector('[data-v="del"]').addEventListener("click", () => row.remove());

  els.variantList.appendChild(row);
}

function addGalleryRow(g = { url: "", position: 1 }) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-1 md:grid-cols-12 gap-2 border border-black/10 rounded-xl p-3";

  row.innerHTML = `
    <input class="md:col-span-10 border border-black/15 rounded-xl px-3 py-2" placeholder="Image URL"
      value="${g.url || ""}" data-g="url" />
    <input class="md:col-span-1 border border-black/15 rounded-xl px-3 py-2" type="number" min="0" placeholder="#"
      value="${Number(g.position || 1)}" data-g="pos" />
    <button class="md:col-span-1 px-3 py-2 rounded-xl border border-red-600 text-red-600 font-semibold" data-g="del">X</button>
  `;

  row.querySelector('[data-g="del"]').addEventListener("click", () => row.remove());
  els.galleryList.appendChild(row);
}

function openModal() {
  setMsg(els.modalMsg, "", false);
  show(els.modal, true);
}

function closeModal() {
  show(els.modal, false);
  editing = null;
}

async function openEdit(productId) {
  const full = await fetchProductFull(productId);
  editing = full;

  els.modalTitle.textContent = `Edit · ${full.product.name}`;
  fillCategorySelect(full.product.category_id);

  els.fName.value = full.product.name || "";
  els.fSlug.value = full.product.slug || "";
  els.fCode.value = full.product.code || "";
  els.fPrice.value = full.product.price ?? "";
  els.fWeight.value = full.product.weight_oz ?? "";
  els.fShipping.value = full.product.shipping_status || "";
  els.fActive.checked = !!full.product.is_active;

  els.fCatalogImg.value = full.product.catalog_image_url || "";
  els.fHoverImg.value = full.product.catalog_hover_url || "";
  els.fPrimaryImg.value = full.product.primary_image_url || "";

  const tagNames = (full.tags || []).map((t) => t.name).join(", ");
  els.fTags.value = tagNames;

  clearModalLists();

  (full.variants || []).forEach((v) => addVariantRow(v));
  (full.gallery || []).forEach((g) => addGalleryRow(g));

  openModal();
}

function openNew() {
  editing = {
    product: {
      id: null,
      name: "",
      slug: "",
      code: "",
      category_id: categories[0]?.id || null,
      price: 0,
      weight_oz: null,
      shipping_status: "",
      catalog_image_url: "",
      catalog_hover_url: "",
      primary_image_url: "",
      is_active: true,
    },
    variants: [],
    gallery: [],
    tags: [],
  };

  els.modalTitle.textContent = "Add Product";
  fillCategorySelect(editing.product.category_id);

  els.fName.value = "";
  els.fSlug.value = "";
  els.fCode.value = "";
  els.fPrice.value = "";
  els.fWeight.value = "";
  els.fShipping.value = "";
  els.fActive.checked = true;

  els.fCatalogImg.value = "";
  els.fHoverImg.value = "";
  els.fPrimaryImg.value = "";

  els.fTags.value = "";
  clearModalLists();
  openModal();
}

function collectVariants() {
  const rows = Array.from(els.variantList.children);
  return rows
    .map((row, idx) => {
      const option_value = row.querySelector('[data-v="value"]').value.trim();
      const stock = Number(row.querySelector('[data-v="stock"]').value || 0);
      const preview_image_url = row.querySelector('[data-v="img"]').value.trim();
      return {
        option_value,
        stock: Math.max(0, stock),
        preview_image_url: preview_image_url || null,
        sort_order: idx,
      };
    })
    .filter((v) => v.option_value);
}

function collectGallery() {
  const rows = Array.from(els.galleryList.children);
  return rows
    .map((row, idx) => {
      const url = row.querySelector('[data-g="url"]').value.trim();
      const position = Number(row.querySelector('[data-g="pos"]').value || (idx + 1));
      return { url, position: Math.max(0, position) };
    })
    .filter((g) => g.url);
}

async function save() {
  try {
    setMsg(els.modalMsg, "", false);

    const name = els.fName.value.trim();
    if (!name) throw new Error("Name is required");

    let slug = els.fSlug.value.trim();
    if (!slug) slug = normalizeSlug(name);
    slug = normalizeSlug(slug);
    if (!slug) throw new Error("Slug is required");

    const payload = {
      id: editing.product.id || undefined,
      name,
      slug,
      code: (els.fCode.value.trim() || null),
      category_id: els.fCategory.value || null,
      price: Number(els.fPrice.value || 0),
      weight_oz: els.fWeight.value ? Number(els.fWeight.value) : null,
      shipping_status: (els.fShipping.value.trim() || null),
      catalog_image_url: (els.fCatalogImg.value.trim() || null),
      catalog_hover_url: (els.fHoverImg.value.trim() || null),
      primary_image_url: (els.fPrimaryImg.value.trim() || null),
      is_active: !!els.fActive.checked,
    };

    const saved = await upsertProduct(payload);

    // children tables
    const variants = collectVariants();
    const gallery = collectGallery();
    const tags = (els.fTags.value || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    await replaceVariants(saved.id, variants);
    await replaceGallery(saved.id, gallery);
    await replaceProductTags(saved.id, tags);

    // refresh list
    products = await fetchProducts();
    renderTable();
    closeModal();
  } catch (err) {
    console.error(err);
    setMsg(els.modalMsg, String(err.message || err), true);
  }
}

async function disableProduct() {
  if (!editing?.product?.id) return;
  try {
    await setProductActive(editing.product.id, false);
    products = await fetchProducts();
    renderTable();
    closeModal();
  } catch (err) {
    console.error(err);
    setMsg(els.modalMsg, String(err.message || err), true);
  }
}

function wire() {
  els.btnLogin.addEventListener("click", async () => {
    try {
      setMsg(els.loginMsg, "", false);
      await signIn(els.loginEmail.value, els.loginPassword.value);
      await initAuth();
    } catch (err) {
      setMsg(els.loginMsg, String(err.message || err), true);
    }
  });

  els.btnLogout.addEventListener("click", async () => {
    await signOut();
    await initAuth();
  });

  els.searchInput.addEventListener("input", () => renderTable());

  els.btnNew.addEventListener("click", () => openNew());
  els.btnClose.addEventListener("click", () => closeModal());

  els.btnAddVariant.addEventListener("click", () => addVariantRow());
  els.btnAddGallery.addEventListener("click", () => addGalleryRow());

  els.btnSave.addEventListener("click", () => save());
  els.btnDelete.addEventListener("click", () => disableProduct());

  // auto slug as you type name (only when slug is empty)
  els.fName.addEventListener("input", () => {
    if (els.fSlug.value.trim()) return;
    els.fSlug.value = normalizeSlug(els.fName.value);
  });
}

wire();
initAuth();
