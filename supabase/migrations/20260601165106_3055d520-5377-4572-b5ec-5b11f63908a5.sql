
-- 1) Promo codes table (single-use random codes)
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by_reservation_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) Company settings (single row)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Mon Entreprise',
  legal_form text,
  siret text,
  vat_number text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  phone text,
  email text,
  iban text,
  bic text,
  vat_rate numeric NOT NULL DEFAULT 10,
  vat_applicable boolean NOT NULL DEFAULT true,
  legal_mention text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company settings readable by anyone"
  ON public.company_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update company settings"
  ON public.company_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert company settings"
  ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.company_settings (company_name, vat_rate, vat_applicable)
VALUES ('Mon Entreprise', 10, true);

-- 3) Reservations: add invoice/completion fields
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz;

-- 4) Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;

-- 5) Allow drivers to update reservations assigned to them (status/completed_at/invoice)
CREATE POLICY "Drivers can update assigned reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_availabilities da
      JOIN public.drivers d ON d.id = da.driver_id
      WHERE da.reservation_id = reservations.id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.driver_availabilities da
      JOIN public.drivers d ON d.id = da.driver_id
      WHERE da.reservation_id = reservations.id
        AND d.user_id = auth.uid()
    )
  );

-- 6) Allow drivers to read their assigned reservations
CREATE POLICY "Drivers can read assigned reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_availabilities da
      JOIN public.drivers d ON d.id = da.driver_id
      WHERE da.reservation_id = reservations.id
        AND d.user_id = auth.uid()
    )
  );
