
ALTER TABLE public.driver_availabilities
  DROP CONSTRAINT IF EXISTS driver_availabilities_valid_range;
ALTER TABLE public.driver_availabilities
  ADD CONSTRAINT driver_availabilities_valid_range CHECK (end_at > start_at);

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.driver_availabilities
  DROP CONSTRAINT IF EXISTS driver_availabilities_no_overlap;
ALTER TABLE public.driver_availabilities
  ADD CONSTRAINT driver_availabilities_no_overlap
  EXCLUDE USING gist (
    driver_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  );
