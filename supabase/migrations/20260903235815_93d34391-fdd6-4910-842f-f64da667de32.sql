ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS vendor_crm_enabled boolean NOT NULL DEFAULT true;