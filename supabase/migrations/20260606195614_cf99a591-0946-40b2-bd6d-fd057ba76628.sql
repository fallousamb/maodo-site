DROP POLICY IF EXISTS "Company settings readable by anyone" ON public.company_settings;
CREATE POLICY "Admins read company settings" ON public.company_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.company_settings FROM anon;