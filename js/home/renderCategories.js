// /js/home/renderCategories.js

/**
 * Renders chips into #homeCategoryChips
 * Emits onChange(categoryId|null)
 */
export function renderHomeCategories({
  categories = [],
  activeCategoryId = null,
  onChange
}) {
  const mount = document.getElementById("homeCategoryChips");
  if (!mount) return;

  mount.innerHTML = "";

  // All chip
  mount.appendChild(
    makeChip({
      label: "All",
      active: activeCategoryId == null,
      onClick: () => onChange?.(null)
    })
  );

  for (const c of categories) {
    mount.appendChild(
      makeChip({
        label: c.name,
        active: c.id === activeCategoryId,
        onClick: () => onChange?.(c.id)
      })
    );
  }
}

function makeChip({ label, active, onClick }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kk-chip ${active ? "is-active" : ""}`;
  btn.textContent = label;

  btn.addEventListener("click", () => onClick?.());
  return btn;
}
