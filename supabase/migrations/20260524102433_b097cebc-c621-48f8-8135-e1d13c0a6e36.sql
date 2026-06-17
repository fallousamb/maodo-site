
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  pickup_datetime TIMESTAMPTZ NOT NULL,
  distance_km NUMERIC(10,2),
  duration_min NUMERIC(10,2),
  estimated_price NUMERIC(10,2),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can create a reservation through the public booking form
CREATE POLICY "Anyone can create a reservation"
ON public.reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users (the driver/admin) can read reservations
CREATE POLICY "Authenticated users can read reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (true);
