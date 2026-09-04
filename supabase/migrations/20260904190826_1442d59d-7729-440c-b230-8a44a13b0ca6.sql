ALTER TABLE public.site_branding
  ADD COLUMN hero_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN hero_accent_color text NOT NULL DEFAULT '#7ecf1c',
  ADD COLUMN hero_supporting_color text NOT NULL DEFAULT '#d7e3df',
  ADD COLUMN hero_primary_button_color text NOT NULL DEFAULT '#7ecf1c',
  ADD COLUMN hero_secondary_button_color text NOT NULL DEFAULT '#ffffff';

ALTER TABLE public.site_branding
  ADD CONSTRAINT site_branding_hero_text_color_hex CHECK (hero_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT site_branding_hero_accent_color_hex CHECK (hero_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT site_branding_hero_supporting_color_hex CHECK (hero_supporting_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT site_branding_hero_primary_button_color_hex CHECK (hero_primary_button_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT site_branding_hero_secondary_button_color_hex CHECK (hero_secondary_button_color ~ '^#[0-9A-Fa-f]{6}$');