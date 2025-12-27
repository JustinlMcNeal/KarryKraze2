# Supabase Promotions Setup Guide

## Step 1: Run the Migration

You have two options:

### Option A: Using Supabase CLI (Recommended)

```powershell
# Navigate to your project directory
cd D:\SMOJO\Online\Buisness\KarryKraze23

# Push the migration to your local Supabase instance
supabase db push

# Or if you want to sync with remote database:
supabase db push --linked
```

### Option B: Manual Setup (Supabase Dashboard)

1. Go to [supabase.com](https://supabase.com)
2. Open your KarryKraze23 project
3. Go to **SQL Editor** (left sidebar)
4. Create a new query
5. Copy the entire content from `supabase/migrations/20251221_create_promotions.sql`
6. Paste it into the SQL editor
7. Click **Run**

---

## Step 2: Verify the Table Was Created

In your Supabase dashboard:

1. Go to **Table Editor** (left sidebar)
2. Look for the `promotions` table
3. Verify these columns exist:
   - `id` (UUID, Primary Key)
   - `name` (Text)
   - `code` (Text, Unique)
   - `type` (Varchar)
   - `value` (Numeric)
   - `scope_type` (Varchar)
   - `scope_data` (UUID Array)
   - `bogo_reward_type` (Varchar)
   - `bogo_reward_id` (UUID)
   - `min_order_amount` (Numeric)
   - `usage_limit` (Integer)
   - `usage_count` (Integer)
   - `start_date` (Timestamp with timezone)
   - `end_date` (Timestamp with timezone)
   - `is_active` (Boolean)
   - `is_public` (Boolean)
   - `created_at` (Timestamp with timezone)
   - `updated_at` (Timestamp with timezone)
   - `created_by` (UUID, FK to auth.users)

---

## Step 3: Enable Row Level Security (RLS)

The migration already includes RLS policies, but verify they're set up:

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. Select the `promotions` table
3. You should see two policies:
   - `public_can_read_active_promotions` - Allows customers to read active promos
   - `admin_can_manage_promotions` - Allows admins to manage promos

If not present, run the RLS section of the migration manually.

---

## Step 4: Set Admin Role (For Admin Access)

The RLS policy checks for `auth.jwt() ->> 'user_role' = 'admin'`. You need to:

### Option A: Using Supabase Auth

1. Go to **Authentication** → **Users**
2. Click on your admin user
3. Go to **User Metadata** (or **Custom Claims** if available)
4. Add this JSON:
```json
{
  "user_role": "admin"
}
```

### Option B: Using a Custom Role (More Secure)

Create a dedicated `admins` table:

```sql
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Then update the RLS policy to check this table instead
CREATE POLICY "admin_can_manage_promotions"
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
```

---

## Step 5: Test the Setup

### Test Reading Promotions (Customer View)

```javascript
import { getSupabaseClient } from "./js/shared/supabaseClient.js";

const supabase = getSupabaseClient();

// This should work for any authenticated user
const { data, error } = await supabase
  .from("promotions")
  .select("*")
  .eq("is_public", true)
  .eq("is_active", true);

console.log(data);
```

### Test Writing Promotions (Admin Only)

```javascript
// This will only work if user has admin role
const { data, error } = await supabase
  .from("promotions")
  .insert([
    {
      name: "Test Promotion",
      code: "TEST123",
      type: "percentage",
      value: 25,
      scope_type: "all",
      is_active: true,
      is_public: true,
    },
  ])
  .select();

if (error) console.error("Insert error:", error);
else console.log("Promotion created:", data);
```

---

## Step 6: Understanding the Schema

### `scope_type` & `scope_data`

These control which products the promotion applies to:

```
scope_type = 'all'
  → Applies to everything (scope_data ignored)

scope_type = 'category'
  → scope_data = ['cat-1', 'cat-2']
  → Applies to products in these categories

scope_type = 'tag'
  → scope_data = ['tag-1', 'tag-2']
  → Applies to products with these tags

scope_type = 'product'
  → scope_data = ['prod-1', 'prod-2']
  → Applies only to these specific products
```

### `type` & `value`

```
type = 'percentage'
  → value = 25
  → Discount 25% off

type = 'fixed'
  → value = 15
  → Discount $15 off

type = 'bogo'
  → value = (unused)
  → bogo_reward_type & bogo_reward_id used instead
  → Customer gets free item from specified category/tag/product

type = 'free-shipping'
  → value = (unused)
  → Free shipping applied
```

### BOGO Fields

For buy-one-get-one promotions:

```
bogo_reward_type = 'product'
  → bogo_reward_id = 'product-uuid'
  → Give this specific product free

bogo_reward_type = 'category'
  → bogo_reward_id = 'category-uuid'
  → Let customer pick any product from this category free

bogo_reward_type = 'tag'
  → bogo_reward_id = 'tag-uuid'
  → Let customer pick any product with this tag free
```

---

## Step 7: Add Sample Data

In Supabase **SQL Editor**:

```sql
-- Insert a sample percentage promotion
INSERT INTO public.promotions (
  name, code, description, type, value, scope_type, 
  is_active, is_public
) VALUES (
  'Summer Sale 25% Off',
  'SUMMER25',
  'Get 25% off all items this summer',
  'percentage',
  25,
  'all',
  true,
  true
);

-- Insert a category-specific promotion
INSERT INTO public.promotions (
  name, code, description, type, value, scope_type, scope_data,
  is_active, is_public
) VALUES (
  'Hats Only - 30% Off',
  'HATS30',
  '30% off all hats this month',
  'percentage',
  30,
  'category',
  ARRAY['YOUR_HATS_CATEGORY_ID']::uuid[],
  true,
  true
);

-- Insert a BOGO promotion
INSERT INTO public.promotions (
  name, code, description, type, scope_type, scope_data,
  bogo_reward_type, bogo_reward_id,
  is_active, is_public
) VALUES (
  'Buy Any Hat Get Free Tee',
  'HATSTEE',
  'Buy any hat and get a free classic tee',
  'bogo',
  'category',
  ARRAY['YOUR_HATS_CATEGORY_ID']::uuid[],
  'product',
  'YOUR_TEE_PRODUCT_ID'::uuid,
  true,
  true
);
```

---

## Step 8: Troubleshooting

### "Permission denied" error when reading promotions

- Check that RLS policy `public_can_read_active_promotions` exists
- Verify `is_public` and `is_active` are both `true`
- Check your Supabase URL and anon key are correct

### Admin can't insert/update promotions

- Verify `created_by` is set to current user's UUID
- Check admin role is set in user metadata
- Ensure RLS policy `admin_can_manage_promotions` exists

### `scope_data` is null even after insert

- Arrays in Supabase need explicit casting: `ARRAY['id1', 'id2']::uuid[]`
- In JavaScript, pass as: `scope_data: ['id1', 'id2']`

### Getting old promotions that should be expired

- Check `end_date` is properly set
- Verify `is_active` is `true`
- Client-side filtering happens in `promotionLoader.js` - check that

---

## Next Steps

1. ✅ Run the migration
2. ✅ Verify the table exists
3. ✅ Set up RLS policies
4. ✅ Configure admin role
5. ✅ Test reading/writing promotions
6. ✅ Add sample data
7. ✅ Start creating promotions in the admin panel!

Your promotion system is now ready to use!
