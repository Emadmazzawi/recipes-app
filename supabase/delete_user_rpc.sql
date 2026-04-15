-- SQL script to create a secure account deletion function in Supabase.
-- Run this in the SQL Editor of your Supabase Dashboard.

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permission of the creator (bypass RLS for auth.users)
SET search_path = public
AS $$
BEGIN
  -- 1. Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Delete user's personal data explicitly (to ensure thorough cleanup)
  -- This assumes your tables use user_id to identify the owner.
  DELETE FROM public.recipes WHERE user_id = auth.uid();
  DELETE FROM public.favorites WHERE user_id = auth.uid();
  
  -- 3. Delete the user from Supabase Auth (auth.users)
  -- SECURITY DEFINER allows the function to delete from the protected auth schema.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- IMPORTANT: Ensure you have granted permission for the anon/authenticated role to execute this
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
