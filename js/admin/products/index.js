import { initNavbar } from "../../shared/navbar.js";

import {
  signIn,
  signOut,
  getSession,
  fetchCategories,
  fetchProducts,
} from "./api.js";

import { $, show, setMsg } from "./dom.js";
import { state } from "./state.js";
import { renderTable } from "./renderTable.js";
import { bindModal } from "./modalEditor.js";

import {
  fetchSectionItemsForProduct,
  upsertSectionItemsForProduct,
} from "./sectionItems.js";

/* --------------------------
   Helpers
-------------------------- */
function requireEls(map, keys) {
  const missing = keys.filter((k) => !map[k]);
  if (missing.length) {
    console.error(
      "[Admin Products] Missing required elements. You are likely on the wrong HTML file or an ID changed:",
      missing
    );
    console.error(
      "Tip: open Elements tab and search for id=... OR run document.getElementById('btnLogin') in console."
    );
    return false;
  }
  return true;
}

/* --------------------------
   Boot (WAIT FOR NAVBAR)
-------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Important: ensure navbar HTML is injected BEFORE grabbing btnLogout
  try {
    await initNavbar();
  } catch (e) {
    console.error("[Admin Products] initNavbar failed:", e);
  }

  bootAdmin();
});

function bootAdmin() {
  /* --------------------------
     Elements (after navbar exists)
  -------------------------- */
  const els = {
    loginPanel: $("loginPanel"),
    appPanel: $("appPanel"),
    btnLogin: $("btnLogin"),
    btnLogout: $("btnLogout"),
    loginEmail: $("loginEmail"),
    loginPassword: $("loginPassword"),
    loginMsg: $("loginMsg"),

    searchInput: $("searchInput"),
    countLabel: $("countLabel"),
    btnNew: $("btnNew"),
    productRows: $("productRows"),

    modal: $("modal"),
    modalTitle: $("modalTitle"),
    btnClose: $("btnClose"),
    btnSave: $("btnSave"),
    btnDelete: $("btnDelete"),
    btnHardDelete: $("btnHardDelete"),
    modalMsg: $("modalMsg"),

    fName: $("fName"),
    fSlug: $("fSlug"),
    fCode: $("fCode"),
    fPrice: $("fPrice"),
    fWeight: $("fWeight"),
    fShipping: $("fShipping"),
    fCategory: $("fCategory"),
    fActive: $("fActive"),
    fCatalogImg: $("fCatalogImg"),
    fHoverImg: $("fHoverImg"),
    fPrimaryImg: $("fPrimaryImg"),
    fTags: $("fTags"),

    btnAddVariant: $("btnAddVariant"),
    variantList: $("variantList"),

    btnAddGallery: $("btnAddGallery"),
    galleryList: $("galleryList"),
  };

  // Declare refreshTable as a variable first so modal can reference it
  let refreshTable;

  const modal = bindModal(
    els,
    () => refreshTable(), // Pass a wrapper function that calls refreshTable
    {
      fetchSectionItemsForProduct,
      upsertSectionItemsForProduct,
    }
  );

  // Now define refreshTable with access to modal
  refreshTable = function() {
    console.log("[Admin Products] refreshTable called, modal.openEdit:", modal.openEdit);
    renderTable({
      productRowsEl: els.productRows,
      countLabelEl: els.countLabel,
      searchValue: els.searchInput?.value || "",
      onEdit: modal.openEdit,
      onEditError: (err) => console.warn("[Admin Products] Edit failed:", err),
    });
  };

  async function loadData() {
    state.categories = await fetchCategories();
    state.products = await fetchProducts();
    refreshTable();
  }

  async function initAuth() {
    if (!requireEls(els, ["loginPanel", "appPanel"])) return;

    const session = await getSession();

    if (session) {
      show(els.loginPanel, false);
      show(els.appPanel, true);
      if (els.btnLogout) show(els.btnLogout, true);
      await loadData();
    } else {
      show(els.loginPanel, true);
      show(els.appPanel, false);
      if (els.btnLogout) show(els.btnLogout, false);
    }
  }

  function wire() {
    if (
      !requireEls(els, [
        "btnLogin",
        "loginEmail",
        "loginPassword",
        "loginMsg",
        "searchInput",
        "btnNew",
        "productRows",
        "countLabel",
      ])
    ) return;

    els.btnLogin.addEventListener("click", async () => {
      try {
        setMsg(els.loginMsg, "", false);
        await signIn(els.loginEmail.value, els.loginPassword.value);
        await initAuth();
      } catch (err) {
        setMsg(els.loginMsg, String(err?.message || err), true);
      }
    });

    [els.loginEmail, els.loginPassword].forEach((el) => {
      el?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") els.btnLogin.click();
      });
    });

    if (els.btnLogout) {
      els.btnLogout.addEventListener("click", async () => {
        await signOut();
        await initAuth();
      });
    } else {
      console.warn(
        "[Admin Products] btnLogout not found. Make sure page_inserts/navbar.html includes <button id='btnLogout'>."
      );
    }

    els.searchInput.addEventListener("input", refreshTable);
    els.btnNew.addEventListener("click", modal.openNew);
  }

  wire();
  initAuth();
}
