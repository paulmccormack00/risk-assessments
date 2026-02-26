-- Risk Assessments - Initial Schema (Single Tenant)
-- No organisation_id — single tenant application

-- ─── Custom Types ────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Entities ────────────────────────────────────────────────
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  company_reg_no TEXT,
  jurisdiction TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  employees INTEGER NOT NULL DEFAULT 0,
  dpo_requirement TEXT NOT NULL DEFAULT 'Not Assessed',
  dpo_appointed BOOLEAN NOT NULL DEFAULT FALSE,
  dpo_name TEXT,
  dpo_email TEXT,
  controller_registration_status TEXT,
  controller_registration_ref TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  tier INTEGER NOT NULL DEFAULT 3,
  division TEXT,
  parent_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  ultimate_parent_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Systems ─────────────────────────────────────────────────
CREATE TABLE public.systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  owner TEXT,
  tier INTEGER NOT NULL DEFAULT 3,
  operational_tier INTEGER,
  data_sensitivity_tier INTEGER,
  sensitivity TEXT,
  personal_data BOOLEAN NOT NULL DEFAULT FALSE,
  data_subjects TEXT,
  data_types TEXT,
  special_categories TEXT,
  storage_location TEXT,
  dpa_status TEXT NOT NULL DEFAULT 'Not Assessed',
  vendor TEXT,
  is_third_party BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Core Activities ─────────────────────────────────────────
CREATE TABLE public.core_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  function TEXT NOT NULL DEFAULT 'Unassigned',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Processing Activities ───────────────────────────────────
CREATE TABLE public.processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  core_activity_id UUID REFERENCES public.core_activities(id) ON DELETE SET NULL,
  ref_id TEXT,
  function TEXT NOT NULL DEFAULT 'Unassigned',
  activity TEXT NOT NULL,
  description TEXT,
  purpose TEXT,
  data_subjects TEXT[],
  data_types TEXT,
  special_categories TEXT[],
  legal_basis TEXT[],
  legitimate_interest_detail TEXT,
  retention_period TEXT,
  recipients TEXT,
  transfer BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_countries TEXT[],
  transfer_mechanism TEXT,
  source_of_data TEXT,
  controller_or_processor TEXT NOT NULL DEFAULT 'Controller',
  automated_decision_making BOOLEAN NOT NULL DEFAULT FALSE,
  dpia_status TEXT DEFAULT 'not_started',
  tia_status TEXT DEFAULT 'not_started',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Processing Activity ↔ Systems Junction ──────────────────
CREATE TABLE public.processing_activity_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_activity_id UUID NOT NULL REFERENCES public.processing_activities(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(processing_activity_id, system_id)
);

-- ─── Processing Activity ↔ Entities Junction ─────────────────
CREATE TABLE public.processing_activity_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_activity_id UUID NOT NULL REFERENCES public.processing_activities(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(processing_activity_id, entity_id)
);

-- ─── Custom Functions ────────────────────────────────────────
CREATE TABLE public.custom_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- ─── Assessment Frameworks ───────────────────────────────────
CREATE TABLE public.assessment_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  sections JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Assessment Instances ────────────────────────────────────
CREATE TABLE public.assessment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.assessment_frameworks(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  responses JSONB DEFAULT '{}'::JSONB,
  activated_modules TEXT[] DEFAULT ARRAY['entry', 'common_nucleus'],
  risk_score NUMERIC,
  risk_classification TEXT,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  linked_system_id UUID REFERENCES public.systems(id) ON DELETE SET NULL,
  linked_pa_id UUID REFERENCES public.processing_activities(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  sort_order INTEGER,
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Action Items ────────────────────────────────────────────
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessment_instances(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Audit Logs ──────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS Policies (simple: any authenticated user) ───────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_activity_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_activity_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user full access
CREATE POLICY "authenticated_access" ON public.profiles FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.entities FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.systems FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.core_activities FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.processing_activities FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.processing_activity_systems FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.processing_activity_entities FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.custom_functions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.assessment_frameworks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.assessment_instances FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.action_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.audit_logs FOR ALL USING (auth.uid() IS NOT NULL);
