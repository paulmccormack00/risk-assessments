-- Risk scoring configuration - stores editable risk factor weights and thresholds

CREATE TABLE public.risk_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_id TEXT NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  condition TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store classification thresholds as a single-row config
CREATE TABLE public.risk_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  high_threshold INTEGER NOT NULL DEFAULT 60,
  medium_threshold INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_access" ON public.risk_scoring_config FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_access" ON public.risk_thresholds FOR ALL USING (auth.uid() IS NOT NULL);

-- Seed default risk factors
INSERT INTO public.risk_scoring_config (factor_id, label, points, severity, condition, reason, display_order) VALUES
  ('E2', 'Personal data processing', 20, 'medium', 'equals:Yes', 'Processing personal data triggers GDPR obligations.', 1),
  ('E4', 'AI/ML system involvement', 25, 'high', 'equals:Yes', 'AI/ML involvement triggers EU AI Act obligations and GDPR Art.22 safeguards.', 2),
  ('E8', 'Sensitive or critical infrastructure data', 15, 'medium', 'equals:Yes', 'Sensitive data categories (Art.9) or critical infrastructure require enhanced safeguards.', 3),
  ('E3', 'Cross-border data transfers', 15, 'medium', 'includes:To other countries', 'International transfers require valid mechanisms under Art.44-49.', 4),
  ('DP.2', 'Special category data processed', 20, 'high', 'not_equals:No', 'Special category data is prohibited under Art.9 unless an explicit exception applies.', 5),
  ('DP.9', 'Solely automated decision-making', 15, 'high', 'equals:Yes', 'Automated decisions with legal or significant effects trigger GDPR Art.22 rights.', 6),
  ('VR.3', 'No DPA in place', 15, 'high', 'equals:No', 'Vendor processing personal data without a Data Processing Agreement violates Art.28.', 7),
  ('TIA.4', 'Government access risk', 20, 'high', 'equals:High', 'High government surveillance risk in recipient country undermines transfer safeguards.', 8),
  ('DP.10', 'Residual risk self-assessment', 0, 'medium', 'variable', 'Self-assessed residual risk level.', 9);

-- Seed default thresholds
INSERT INTO public.risk_thresholds (high_threshold, medium_threshold) VALUES (60, 30);
