
-- 1) reviews: hide email from public/authenticated readers via column-level privileges
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, name, city, rating, text, status, created_at, updated_at) ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- 2) course_tracking: constrain actor to a controlled set so client can't forge other values
ALTER TABLE public.course_tracking
  DROP CONSTRAINT IF EXISTS course_tracking_actor_check;
ALTER TABLE public.course_tracking
  ADD CONSTRAINT course_tracking_actor_check CHECK (actor IN ('driver','system'));
ALTER TABLE public.course_tracking ALTER COLUMN actor SET DEFAULT 'driver';

-- 3) drivers: prevent self-escalation of status (and other privileged fields) via column-scoped WITH CHECK
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;

CREATE POLICY "Drivers can update own profile"
ON public.drivers
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    auth.uid() = user_id
    AND status = (SELECT d.status FROM public.drivers d WHERE d.id = drivers.id)
  )
);
