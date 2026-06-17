-- DRIVERS
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  vehicle_model text,
  vehicle_plate text,
  license_number text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | suspended
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own profile"
  ON public.drivers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their driver profile"
  ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile"
  ON public.drivers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete drivers"
  ON public.drivers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AVAILABILITIES
CREATE TABLE public.driver_availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX idx_driver_availabilities_driver ON public.driver_availabilities(driver_id);
CREATE INDEX idx_driver_availabilities_range ON public.driver_availabilities(start_at, end_at);

ALTER TABLE public.driver_availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver can view own availabilities"
  ON public.driver_availabilities FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Driver can insert own availabilities"
  ON public.driver_availabilities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid() AND d.status = 'approved')
  );

CREATE POLICY "Driver can delete own availabilities"
  ON public.driver_availabilities FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND (d.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );
