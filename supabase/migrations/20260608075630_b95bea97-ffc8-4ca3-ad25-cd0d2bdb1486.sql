
CREATE OR REPLACE FUNCTION public.prevent_driver_document_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.verified IS DISTINCT FROM OLD.verified)
     OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at)
     OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only administrators can change document verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_document_self_verify ON public.driver_documents;
CREATE TRIGGER trg_prevent_driver_document_self_verify
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_document_self_verify();

-- Re-affirm the drivers status guard trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_prevent_driver_status_self_update ON public.drivers;
CREATE TRIGGER trg_prevent_driver_status_self_update
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_status_self_update();
