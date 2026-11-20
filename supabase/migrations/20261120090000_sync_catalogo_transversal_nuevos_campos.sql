-- CLAP: sincronización automática de catálogos
-- transversales en campos de plantillas nuevas.

CREATE OR REPLACE FUNCTION
public.trg_sync_catalog_on_template_field()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.option_catalog_id IS NOT NULL THEN
    PERFORM public.sync_shared_option_catalog_to_legacy(
      NEW.option_catalog_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_sync_catalog_on_template_field
ON public.item_classification_template_fields;

CREATE TRIGGER
  trg_sync_catalog_on_template_field
AFTER INSERT OR UPDATE OF
  option_catalog_id,
  field_key,
  template_id
ON public.item_classification_template_fields
FOR EACH ROW
WHEN (NEW.option_catalog_id IS NOT NULL)
EXECUTE FUNCTION
  public.trg_sync_catalog_on_template_field();
