
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS tracking_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.course_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  actor text NOT NULL CHECK (actor IN ('driver','client')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_tracking_reservation_recorded_idx
  ON public.course_tracking (reservation_id, recorded_at DESC);

GRANT SELECT, INSERT, DELETE ON public.course_tracking TO authenticated;
GRANT ALL ON public.course_tracking TO service_role;

ALTER TABLE public.course_tracking ENABLE ROW LEVEL SECURITY;

-- Driver assigned to the reservation can insert his own positions
CREATE POLICY "Driver inserts own course position"
  ON public.course_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    actor = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.driver_availabilities da
      JOIN public.drivers d ON d.id = da.driver_id
      WHERE da.reservation_id = course_tracking.reservation_id
        AND d.user_id = auth.uid()
    )
  );

-- Driver can read positions of his own course
CREATE POLICY "Driver reads own course positions"
  ON public.course_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_availabilities da
      JOIN public.drivers d ON d.id = da.driver_id
      WHERE da.reservation_id = course_tracking.reservation_id
        AND d.user_id = auth.uid()
    )
  );

-- Admins full read
CREATE POLICY "Admins read all tracking"
  ON public.course_tracking
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins delete
CREATE POLICY "Admins delete tracking"
  ON public.course_tracking
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
