-- Migration script to support Community Feed

-- 1. Add the is_public column to the recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Create a policy to allow anyone (or any authenticated user) to read public recipes
CREATE POLICY "Public recipes are viewable by everyone" 
ON public.recipes 
FOR SELECT 
USING (is_public = true);

-- Note: Make sure your existing UPDATE policy allows users to update their own recipes
-- e.g., CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
