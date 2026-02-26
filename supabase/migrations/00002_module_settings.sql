-- Module Settings – toggleable sidebar modules (single tenant)

CREATE TABLE public.module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL UNIQUE CHECK (module IN (
    'entities', 'systems', 'mapping', 'ropa', 'assessments', 'actions'
  )),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default modules (all enabled)
INSERT INTO public.module_settings (module, is_enabled) VALUES
  ('entities', true),
  ('systems', true),
  ('mapping', true),
  ('ropa', true),
  ('assessments', true),
  ('actions', true);

-- RLS
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read
CREATE POLICY "module_settings_select" ON public.module_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can update
CREATE POLICY "module_settings_update" ON public.module_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
