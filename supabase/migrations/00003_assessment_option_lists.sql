-- Editable option lists for assessment questions (E6, CN.1, etc.)
-- Allows users to customize the default options for select/multi_select questions.

CREATE TABLE public.assessment_option_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, label)
);

ALTER TABLE public.assessment_option_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_access" ON public.assessment_option_lists FOR ALL USING (auth.uid() IS NOT NULL);

-- Seed E6 default options (business functions)
INSERT INTO public.assessment_option_lists (question_id, label, display_order, is_default) VALUES
  ('E6', 'HR', 1, true),
  ('E6', 'Sales', 2, true),
  ('E6', 'Marketing', 3, true),
  ('E6', 'Service', 4, true),
  ('E6', 'Finance', 5, true),
  ('E6', 'Ops', 6, true),
  ('E6', 'IT', 7, true),
  ('E6', 'Legal', 8, true),
  ('E6', 'Product', 9, true);

-- Seed CN.1 default options (affected persons)
INSERT INTO public.assessment_option_lists (question_id, label, display_order, is_default) VALUES
  ('CN.1', 'Applicants', 1, true),
  ('CN.1', 'Employees', 2, true),
  ('CN.1', 'Contractors', 3, true),
  ('CN.1', 'Customers', 4, true),
  ('CN.1', 'Students', 5, true),
  ('CN.1', 'Patients', 6, true),
  ('CN.1', 'Public', 7, true),
  ('CN.1', 'Minors', 8, true);
