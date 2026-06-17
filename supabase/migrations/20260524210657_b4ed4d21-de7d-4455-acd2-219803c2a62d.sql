
ALTER TABLE public.driver_availabilities
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS driver_availabilities_reservation_id_key
  ON public.driver_availabilities (reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS driver_availabilities_open_idx
  ON public.driver_availabilities (start_at)
  WHERE reservation_id IS NULL;
