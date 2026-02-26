export const APP_NAME = "Risk Assessments";
export const BRAND_NAME = "Informatica by Salesforce";
export const VERSION = "1.0.0";

export const ROLES = ["admin", "user"] as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Entities", href: "/entities", icon: "Building2" },
  { label: "Systems", href: "/systems", icon: "Server" },
  { label: "Data Mapping", href: "/mapping", icon: "GitBranch" },
  { label: "RoPA", href: "/ropa", icon: "FileText" },
  { label: "Assessments", href: "/assessments", icon: "ShieldCheck" },
  { label: "Action Items", href: "/actions", icon: "CheckSquare" },
] as const;

export const ENTITY_STATUSES = ["Active", "Dormant", "Winding Down"] as const;
export const DPO_REQUIREMENTS = ["Mandatory", "Conditional", "Not Required", "Not Assessed"] as const;
export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export const CONTROLLER_REGISTRATION_STATUSES = ["Registered", "Pending", "Not Required", "Overdue"] as const;

export const SENSITIVITIES = ["High", "Medium", "Low"] as const;
export const DPA_STATUSES = ["Yes", "No", "In Progress", "Not Assessed"] as const;

export const FUNCTIONS = [
  "Human Resources",
  "Finance & Accounting",
  "IT & Technology",
  "Sales & Marketing",
  "Operations",
  "Legal & Compliance",
  "Customer Service",
  "Supply Chain",
  "Research & Development",
] as const;

export const LEGAL_BASES = [
  "Consent",
  "Contract",
  "Legal Obligation",
  "Vital Interests",
  "Public Task",
  "Legitimate Interest",
] as const;

export const SPECIAL_CATEGORIES = [
  "None",
  "Racial or Ethnic Origin",
  "Political Opinions",
  "Religious or Philosophical Beliefs",
  "Trade Union Membership",
  "Genetic Data",
  "Biometric Data",
  "Health Data",
  "Sex Life or Sexual Orientation",
  "Criminal Convictions",
] as const;

export const TRANSFER_MECHANISMS = [
  "Standard Contractual Clauses (SCCs)",
  "Binding Corporate Rules (BCRs)",
  "Adequacy Decision",
  "Consent",
  "Derogation — Contract",
  "Derogation — Legal Claims",
] as const;

export const CONTROLLER_PROCESSOR_ROLES = [
  "Controller",
  "Processor",
  "Joint Controller",
] as const;

export const DATA_SUBJECT_CATEGORIES = [
  "Employees",
  "Contractors",
  "Job Applicants",
  "Customers",
  "Website Visitors",
  "Suppliers",
  "Business Contacts",
  "Minors / Children",
  "Patients",
  "Students",
] as const;

export const DATA_TYPES_BY_SUBJECT: Record<string, string[]> = {
  Employees: ["Full Name", "Email", "Phone", "Address", "Date of Birth", "National Insurance Number", "Bank Details", "Salary", "Emergency Contact", "Performance Reviews"],
  Contractors: ["Full Name", "Email", "Phone", "Company", "Bank Details", "Contract Terms"],
  "Job Applicants": ["Full Name", "Email", "Phone", "CV/Resume", "References", "Interview Notes"],
  Customers: ["Full Name", "Email", "Phone", "Address", "Payment Details", "Purchase History", "Account ID"],
  "Website Visitors": ["IP Address", "Browser Fingerprint", "Cookies", "Page Views", "Location Data"],
  Suppliers: ["Contact Name", "Email", "Phone", "Company", "Bank Details", "Contract Terms"],
  "Business Contacts": ["Full Name", "Email", "Phone", "Company", "Job Title"],
};

export const TRANSFER_COUNTRIES = [
  { name: "United States", subRegions: ["California", "New York", "Texas", "Other"] },
  { name: "United Kingdom" },
  { name: "Canada" },
  { name: "Australia" },
  { name: "India" },
  { name: "China" },
  { name: "Japan" },
  { name: "Brazil" },
  { name: "South Africa" },
  { name: "Singapore" },
  { name: "UAE" },
  { name: "Israel" },
] as const;

export const TIER_CONFIG: Record<number, TierConfig> = {
  1: { color: "red", label: "Tier 1 — Critical", description: "Service delivery critical systems" },
  2: { color: "amber", label: "Tier 2 — Essential", description: "Operationally essential systems" },
  3: { color: "blue", label: "Tier 3 — Efficiency", description: "Business efficiency systems" },
  4: { color: "gray", label: "Tier 4 — Admin", description: "Administrative systems" },
};

type TierConfig = {
  color: "red" | "amber" | "blue" | "gray";
  label: string;
  description: string;
};

export const ASSESSMENT_STATUSES = {
  draft: { label: "Draft", color: "gray" as const },
  in_progress: { label: "In Progress", color: "amber" as const },
  completed: { label: "Completed", color: "green" as const },
  validated: { label: "Validated", color: "blue" as const },
  archived: { label: "Archived", color: "gray" as const },
};

export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  not_started: "Not Started",
  not_required: "Not Required",
};

export const ACTION_STATUSES = ["pending", "in_progress", "completed"] as const;
export const ACTION_PRIORITIES = ["critical", "high", "medium", "low"] as const;
