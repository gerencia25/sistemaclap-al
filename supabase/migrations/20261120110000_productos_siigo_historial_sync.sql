-- CLAP: trazabilidad de sincronización de productos con SIIGO

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS siigo_sync_error TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS siigo_last_sync_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.product_siigo_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL
    REFERENCES public.products(id),

  attempted_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  operation TEXT NOT NULL,
  result TEXT NOT NULL,

  siigo_product_id TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS
  idx_product_siigo_sync_logs_product_date
ON public.product_siigo_sync_logs (
  product_id,
  attempted_at DESC
);

ALTER TABLE public.product_siigo_sync_logs
  ENABLE ROW LEVEL SECURITY;

COMMIT;
