// fetchProducts.js
function getSupabase() {
  if (!window.supabase) return null;
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;

  // Create once and reuse
  if (!window.__kk_supabase_client) {
    window.__kk_supabase_client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
  return window.__kk_supabase_client;
}

export async function fetchCatalogProducts() {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase client not initialized. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in catalog.html, and the supabase-js script is loaded."
    );
  }

  // 1) Products
  const { data: products, error: pErr } = await client
    .from("products")
    .select(
      "id, slug, name, category_id, price, weight_oz, shipping_status, catalog_image_url, catalog_hover_url, primary_image_url, is_active, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (pErr) throw pErr;

  const productIds = (products || []).map((p) => p.id);
  const categoryIds = [...new Set((products || []).map((p) => p.category_id).filter(Boolean))];

  // 2) Categories map
  let categoriesMap = new Map();
  if (categoryIds.length) {
    const { data: categories, error: cErr } = await client
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);

    if (cErr) throw cErr;
    (categories || []).forEach((c) => categoriesMap.set(c.id, c.name));
  }

  // 3) Tags map: product_id -> [tagName...]
  let tagsMap = new Map();
  if (productIds.length) {
    const { data: pt, error: ptErr } = await client
      .from("product_tags")
      .select("product_id, tags(name)")
      .in("product_id", productIds);

    // NOTE: this relies on product_tags.tag_id -> tags.id (you DO have that FK)
    // If Supabase complains, we can switch to 2 queries instead.
    if (ptErr) {
      // fallback: try 2-query approach
      const { data: productTags, error: ptErr2 } = await client
        .from("product_tags")
        .select("product_id, tag_id")
        .in("product_id", productIds);

      if (ptErr2) throw ptErr2;

      const tagIds = [...new Set((productTags || []).map((x) => x.tag_id).filter(Boolean))];
      const { data: tags, error: tErr } = await client.from("tags").select("id, name").in("id", tagIds);
      if (tErr) throw tErr;

      const tagMapById = new Map((tags || []).map((t) => [t.id, t.name]));
      (productTags || []).forEach((row) => {
        const name = tagMapById.get(row.tag_id);
        if (!name) return;
        const cur = tagsMap.get(row.product_id) || [];
        cur.push(name);
        tagsMap.set(row.product_id, cur);
      });
    } else {
      (pt || []).forEach((row) => {
        const name = row?.tags?.name;
        if (!name) return;
        const cur = tagsMap.get(row.product_id) || [];
        cur.push(name);
        tagsMap.set(row.product_id, cur);
      });
    }
  }

  // 4) Variants map: product_id -> [{option_name, option_value, stock, preview_image_url}]
  let variantsMap = new Map();
  if (productIds.length) {
    const { data: variants, error: vErr } = await client
      .from("product_variants")
      .select("product_id, option_name, option_value, stock, preview_image_url")
      .in("product_id", productIds);

    if (vErr) throw vErr;

    (variants || []).forEach((v) => {
      const cur = variantsMap.get(v.product_id) || [];
      cur.push(v);
      variantsMap.set(v.product_id, cur);
    });
  }

  // Normalize final product objects for UI
  const normalized = (products || []).map((p) => {
    const categoryName = p.category_id ? categoriesMap.get(p.category_id) || "" : "";
    const tags = tagsMap.get(p.id) || [];
    const variants = variantsMap.get(p.id) || [];

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.category_id,
      category: (categoryName || "").toLowerCase(), // keep it consistent
      price: Number(p.price),
      weightOz: p.weight_oz != null ? Number(p.weight_oz) : null,
      shippingStatus: p.shipping_status || null,

      images: {
        catalog: p.catalog_image_url || p.primary_image_url || "",
        hover: p.catalog_hover_url || p.primary_image_url || "",
        primary: p.primary_image_url || p.catalog_image_url || "",
      },

      tags,
      variants,
    };
  });

  return normalized;
}
