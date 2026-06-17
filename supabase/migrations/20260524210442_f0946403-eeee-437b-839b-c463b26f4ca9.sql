
CREATE OR REPLACE FUNCTION public.prevent_driver_status_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only administrators can change driver status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_status_self_update ON public.drivers;
CREATE TRIGGER trg_prevent_driver_status_self_update
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_driver_status_self_update();
