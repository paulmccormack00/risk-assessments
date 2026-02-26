export type AppRole = "admin" | "user";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: string;
  name: string;
  country: string;
  company_reg_no: string | null;
  jurisdiction: string | null;
  status: string;
  employees: number;
  dpo_requirement: string;
  dpo_appointed: boolean;
  dpo_name: string | null;
  dpo_email: string | null;
  controller_registration_status: string | null;
  controller_registration_ref: string | null;
  priority: string;
  tier: number;
  division: string | null;
  parent_entity_id: string | null;
  ultimate_parent_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface System {
  id: string;
  name: string;
  department: string | null;
  owner: string | null;
  tier: number;
  operational_tier: number | null;
  data_sensitivity_tier: number | null;
  sensitivity: string | null;
  personal_data: boolean;
  data_subjects: string | null;
  data_types: string | null;
  special_categories: string | null;
  storage_location: string | null;
  dpa_status: string;
  vendor: string | null;
  is_third_party: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoreActivity {
  id: string;
  name: string;
  function: string;
  description: string | null;
  sort_order: number;
  processing_activities?: ProcessingActivity[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingActivity {
  id: string;
  core_activity_id: string | null;
  ref_id: string | null;
  function: string;
  activity: string;
  description: string | null;
  purpose: string | null;
  data_subjects: string[] | null;
  data_types: string | null;
  special_categories: string[] | null;
  legal_basis: string[] | null;
  legitimate_interest_detail: string | null;
  retention_period: string | null;
  recipients: string | null;
  transfer: boolean;
  transfer_countries: string[] | null;
  transfer_mechanism: string | null;
  source_of_data: string | null;
  controller_or_processor: string;
  automated_decision_making: boolean;
  dpia_status: string | null;
  tia_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentFramework {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  is_system: boolean;
  sections: unknown;
  created_at: string;
}

export interface AssessmentInstance {
  id: string;
  framework_id: string;
  title: string;
  status: string;
  responses: Record<string, unknown> | null;
  activated_modules: string[] | null;
  risk_score: number | null;
  risk_classification: string | null;
  entity_id: string | null;
  linked_system_id: string | null;
  linked_pa_id: string | null;
  metadata: Record<string, unknown> | null;
  sort_order: number | null;
  completed_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  assessment_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface CustomFunction {
  id: string;
  name: string;
  created_at: string;
}

export type TierConfig = {
  color: "red" | "amber" | "blue" | "gray";
  label: string;
  description: string;
};
