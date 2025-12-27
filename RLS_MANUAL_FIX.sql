-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR
-- Go to: supabase.com → Your Project → SQL Editor → New Query

-- Drop ALL existing policies
DROP POLICY IF EXISTS "public_can_read_active_promotions" ON public.promotions;
DROP POLICY IF EXISTS "admin_can_manage_promotions" ON public.promotions;
DROP POLICY IF EXISTS "public_read_active_promotions" ON public.promotions;
DROP POLICY IF EXISTS "service_role_manage_promotions" ON public.promotions;
DROP POLICY IF EXISTS "authenticated_manage_own_promotions" ON public.promotions;
DROP POLICY IF EXISTS "authenticated_manage_promotions" ON public.promotions;

-- Disable RLS temporarily to clear policies
ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create new, permissive policies
-- Policy 1: Authenticated users can read everything they need
CREATE POLICY "allow_read"
  ON public.promotions
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy 2: Authenticated users can insert/update/delete
CREATE POLICY "allow_insert"
  ON public.promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_update"
  ON public.promotions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_delete"
  ON public.promotions
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
GRANT SELECT ON public.promotions TO anon;
