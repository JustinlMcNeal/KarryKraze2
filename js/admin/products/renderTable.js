import { escapeHtml, money } from "./dom.js";
import { state } from "./state.js";

export function renderTable({
  productRowsEl,
  countLabelEl,
  searchValue,
  onEdit,
  onEditError,
}) {
  if (!productRowsEl) return;

  const q = (searchValue || "").trim().toLowerCase();
  const categories = state.categories || [];
  const products = state.products || [];

  const filtered = products.filter((p) => {
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q)
    );
  });

  if (countLabelEl) {
    countLabelEl.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;
  }

  const catMap = new Map(categories.map((c) => [String(c.id), c.name]));

  productRowsEl.innerHTML = filtered
    .map((p) => {
      const cat = catMap.get(String(p.category_id)) || "";
      const active = p.is_active ? "YES" : "NO";

      return `
        <tr>
          <td><strong>${escapeHtml(p.name || "")}</strong></td>
          <td>${escapeHtml(p.slug || "")}</td>
          <td>${escapeHtml(p.code || "")}</td>
          <td>${escapeHtml(cat)}</td>
          <td>${money(p.price)}</td>
          <td>${active}</td>
          <td class="kk-admin-table-actions">
            <div class="kk-admin-row-actions">
              <button type="button" data-edit="${p.id}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  productRowsEl.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      console.log("[Admin Products] Edit button clicked! Product ID:", btn.dataset.edit, "onEdit:", onEdit);
      try {
        await onEdit(btn.dataset.edit);
      } catch (err) {
        console.error("[Admin Products] openEdit failed:", err);
        if (onEditError) onEditError(err);
        else alert(err?.message || String(err));
      }
    });
  });
}
