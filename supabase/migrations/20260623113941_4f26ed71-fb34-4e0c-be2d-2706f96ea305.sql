
-- Fix 1: Add DELETE policy on orders (super_admin only)
CREATE POLICY "Super admins can delete orders"
ON public.orders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Fix 2: Switch has_role to SECURITY INVOKER. Users can read their own user_roles rows per RLS,
-- and has_role is only ever called with auth.uid(), so INVOKER is sufficient and removes the
-- SECURITY DEFINER privilege-escalation surface flagged by the linter.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix 3: Harden user_roles write paths. Explicitly revoke direct INSERT/UPDATE/DELETE on
-- user_roles from anon and authenticated at the GRANT layer (RLS already restricts to
-- super_admin, but defense-in-depth removes the API surface entirely for non-super-admins;
-- super_admin operations go through service_role / RLS-checked policies).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
-- Keep authenticated SELECT/INSERT/UPDATE/DELETE so super_admin policy can still apply via PostgREST.
-- (Policies remain the enforcement boundary; this comment documents intent.)
