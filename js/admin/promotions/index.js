import { initNavbar } from "../../shared/navbar.js";

import {
  signIn,
  signOut,
  getSession,
  fetchPromotions,
} from "./api.js";

import { $, show, setMsg } from "./dom.js";
import { state } from "./state.js";
import { renderTable } from "./renderTable.js";
import { bindModal } from "./modalEditor.js";

/* --------------------------
   Helpers
-------------------------- */
function requireEls(map, keys) {
  const missing = keys.filter((k) => !map[k]);
  if (missing.length) {
    console.error(
      "[Admin Promotions] Missing required elements. You are likely on the wrong HTML file or an ID changed:",
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
  try {
    await initNavbar();
  } catch (e) {
    console.error("[Admin Promotions] initNavbar failed:", e);
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
    promotionRows: $("promotionRows"),

    modal: $("modal"),
    modalTitle: $("modalTitle"),
    btnClose: $("btnClose"),
    btnSave: $("btnSave"),
    btnDelete: $("btnDelete"),
    modalMsg: $("modalMsg"),

    fName: $("fName"),
    fCode: $("fCode"),
    fType: $("fType"),
    fValue: $("fValue"),
    fMinOrder: $("fMinOrder"),
    fUsageLimit: $("fUsageLimit"),
    fStartDate: $("fStartDate"),
    fEndDate: $("fEndDate"),
    fActive: $("fActive"),
    fPublic: $("fPublic"),
    fDescription: $("fDescription"),

    // ✅ NEW (Homepage Banner Image Path)
    fBannerImage: $("fBannerImage"),
  };

  // Declare refreshTable as a variable first so modal can reference it
  let refreshTable;

  const modal = bindModal(
    els,
    () => refreshTable(), // Pass a wrapper function that calls refreshTable
  );

  // Now define refreshTable with access to modal
  refreshTable = function() {
    console.log("[Admin Promotions] refreshTable called");
    renderTable({
      promotionRowsEl: els.promotionRows,
      countLabelEl: els.countLabel,
      searchValue: els.searchInput?.value || "",
      onEdit: (promotionId) => {
        console.log("[Admin Promotions] Edit button clicked for:", promotionId);
        return modal.openEdit(promotionId);
      },
      onEditError: (err) => console.warn("[Admin Promotions] Edit failed:", err),
    });
  };

  async function loadData() {
    state.promotions = await fetchPromotions();
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
        "promotionRows",
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
        "[Admin Promotions] btnLogout not found. Make sure page_inserts/navbar.html includes <button id='btnLogout'>."
      );
    }

    els.searchInput.addEventListener("input", refreshTable);
    els.btnNew.addEventListener("click", modal.openNew);
  }

  wire();
  initAuth();
}
