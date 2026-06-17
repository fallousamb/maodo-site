
-- 1) Extension table drivers : champs véhicule détaillés
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year INT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT;

-- 2) Enum des types de documents
DO $$ BEGIN
  CREATE TYPE public.driver_document_type AS ENUM (
    'id_card','passport','driving_license','vtc_card','vehicle_insurance','civil_liability'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Table driver_documents
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type public.driver_document_type NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  rejection_reason TEXT,
  UNIQUE (driver_id, document_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_documents TO authenticated;
GRANT ALL ON public.driver_documents TO service_role;

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- Le chauffeur voit ses propres documents
CREATE POLICY "Driver can view own documents"
  ON public.driver_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid())
  );

-- Le chauffeur insère / met à jour / supprime ses propres documents
CREATE POLICY "Driver can insert own documents"
  ON public.driver_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Driver can update own documents"
  ON public.driver_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Driver can delete own documents"
  ON public.driver_documents FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid())
  );

-- Admin a un accès complet
CREATE POLICY "Admin can view all documents"
  ON public.driver_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all documents"
  ON public.driver_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete all documents"
  ON public.driver_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS driver_documents_driver_idx ON public.driver_documents(driver_id);

-- 4) Storage policies sur bucket driver-documents
-- Convention: fichiers stockés sous "{driver_id}/{document_type}.{ext}"

CREATE POLICY "Driver can read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (storage.foldername(name))[1] = d.id::text
    )
  );

CREATE POLICY "Driver can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (storage.foldername(name))[1] = d.id::text
    )
  );

CREATE POLICY "Driver can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (storage.foldername(name))[1] = d.id::text
    )
  );

CREATE POLICY "Driver can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (storage.foldername(name))[1] = d.id::text
    )
  );

CREATE POLICY "Admin can read all driver files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can delete all driver files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND public.has_role(auth.uid(), 'admin')
  );
