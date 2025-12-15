import { getSupabaseClient } from "../../shared/supabaseClient.js";

const sb = () => getSupabaseClient();

export async function signIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await sb().auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await sb().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function fetchCategories() {
  const { data, error } = await sb().from("categories").select("id,name").order("name");
  if (error) throw error;
  return data || [];
}

export async function fetchProducts() {
  const { data, error } = await sb()
    .from("products")
    .select("id, code, slug, name, category_id, price, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchProductFull(productId) {
  const { data: product, error: pErr } = await sb()
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (pErr) throw pErr;

  const { data: variants, error: vErr } = await sb()
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("option_value", { ascending: true });
  if (vErr) throw vErr;

  const { data: gallery, error: gErr } = await sb()
    .from("product_gallery_images")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (gErr) throw gErr;

  const { data: pt, error: ptErr } = await sb()
    .from("product_tags")
    .select("tag_id")
    .eq("product_id", productId);
  if (ptErr) throw ptErr;

  const tagIds = (pt || []).map(x => x.tag_id);
  let tags = [];
  if (tagIds.length) {
    const { data: t, error: tErr } = await sb().from("tags").select("id,name").in("id", tagIds);
    if (tErr) throw tErr;
    tags = t || [];
  }

  return { product, variants: variants || [], gallery: gallery || [], tags };
}

export async function upsertProduct(payload) {
  const { data, error } = await sb()
    .from("products")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setProductActive(productId, isActive) {
  const { error } = await sb()
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);
  if (error) throw error;
}

export async function replaceVariants(productId, variants) {
  await sb().from("product_variants").delete().eq("product_id", productId);

  if (!variants.length) return;

  const rows = variants.map((v, idx) => ({
    product_id: productId,
    option_name: "Color",
    option_value: v.option_value,
    stock: Number(v.stock || 0),
    preview_image_url: v.preview_image_url || null,
    sort_order: Number(v.sort_order ?? idx),
    is_active: true
  }));

  const { error } = await sb().from("product_variants").insert(rows);
  if (error) throw error;
}

export async function replaceGallery(productId, gallery) {
  await sb().from("product_gallery_images").delete().eq("product_id", productId);

  if (!gallery.length) return;

  const rows = gallery.map((g, idx) => ({
    product_id: productId,
    url: g.url,
    position: Number(g.position ?? (idx + 1)),
    is_active: true
  }));

  const { error } = await sb().from("product_gallery_images").insert(rows);
  if (error) throw error;
}

export async function ensureTags(tagNames) {
  const names = (tagNames || [])
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (!names.length) return [];

  // Upsert tags one by one (simpler + reliable)
  const out = [];
  for (const name of names) {
    const { data, error } = await sb()
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select("id,name")
      .single();
    if (error) throw error;
    out.push(data);
  }
  return out;
}

export async function replaceProductTags(productId, tagNames) {
  // clear links
  await sb().from("product_tags").delete().eq("product_id", productId);

  const tags = await ensureTags(tagNames);
  if (!tags.length) return;

  const rows = tags.map(t => ({ product_id: productId, tag_id: t.id }));
  const { error } = await sb().from("product_tags").insert(rows);
  if (error) throw error;
}
