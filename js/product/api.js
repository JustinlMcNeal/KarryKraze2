import { getSupabaseClient } from "../shared/supabaseClient.js";
import { PRODUCT_SELECT } from "../shared/productContract.js";

export async function fetchProductBySlug(slug) {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchCategoryName(categoryId) {
  if (!categoryId) return "";
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .single();

  if (error) return ""; // don't hard-fail if category missing
  return data?.name || "";
}

export async function fetchVariants(productId) {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from("product_variants")
    .select("id, product_id, option_value, stock, preview_image_url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) return []; // non-fatal
  return data || [];
}

export async function fetchGallery(productId) {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from("product_gallery_images")
    .select("id, product_id, url, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function fetchTags(productId) {
  const sb = getSupabaseClient();

  // adjust if your tags table differs
  const { data, error } = await sb
    .from("product_tags")
    .select("name")
    .eq("product_id", productId);

  if (error) return [];
  return (data || []).map((t) => t.name).filter(Boolean);
}
export async function fetchSectionItems(productId) {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from("product_section_items")
    .select("section, content, position")
    .eq("product_id", productId)
    .order("section", { ascending: true })
    .order("position", { ascending: true });

  if (error) return []; // non-fatal
  return data || [];
}
