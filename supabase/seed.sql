-- Seed Assessment Frameworks for Risk Assessments app

INSERT INTO public.assessment_frameworks (slug, name, description, version, is_system, sections) VALUES
(
  'dpia',
  'Data Protection Impact Assessment (DPIA)',
  'Standard DPIA template following GDPR Article 35 requirements',
  '1.0',
  true,
  '[
    {
      "id": "entry",
      "title": "Entry & Scope",
      "description": "Define the scope and context of the assessment",
      "questions": [
        {"id": "EN.1", "text": "What is the name and purpose of this processing activity?", "type": "textarea", "required": true},
        {"id": "EN.2", "text": "Who is the data controller for this processing?", "type": "text", "required": true},
        {"id": "EN.3", "text": "What categories of personal data are processed?", "type": "textarea", "required": true},
        {"id": "EN.4", "text": "What categories of data subjects are affected?", "type": "textarea", "required": true},
        {"id": "EN.5", "text": "What is the estimated number of data subjects affected?", "type": "text"},
        {"id": "EN.6", "text": "What is the geographic scope of processing?", "type": "textarea"}
      ]
    },
    {
      "id": "common_nucleus",
      "title": "Necessity & Proportionality",
      "description": "Assess the necessity and proportionality of processing",
      "questions": [
        {"id": "CN.1", "text": "What is the lawful basis for processing?", "type": "select", "options": ["Consent", "Contract", "Legal Obligation", "Vital Interests", "Public Task", "Legitimate Interest"], "required": true},
        {"id": "CN.2", "text": "Describe the necessity of the processing — why is it needed?", "type": "textarea", "required": true},
        {"id": "CN.3", "text": "Could the same purpose be achieved with less data or in a less intrusive way?", "type": "textarea", "required": true},
        {"id": "CN.4", "text": "How is data quality ensured?", "type": "textarea"},
        {"id": "CN.5", "text": "What is the retention period and justification?", "type": "textarea", "required": true}
      ]
    },
    {
      "id": "dpia",
      "title": "Risk Assessment",
      "description": "Identify and assess risks to data subjects",
      "questions": [
        {"id": "DP.1", "text": "What risks does this processing pose to data subjects rights and freedoms?", "type": "textarea", "required": true, "weight": 3},
        {"id": "DP.2", "text": "What is the likelihood of each identified risk occurring?", "type": "select", "options": ["Very Low", "Low", "Medium", "High", "Very High"], "required": true, "weight": 2},
        {"id": "DP.3", "text": "What is the potential severity of impact on data subjects?", "type": "select", "options": ["Minimal", "Limited", "Significant", "Maximum"], "required": true, "weight": 3},
        {"id": "DP.4", "text": "Are any special categories of data processed? If so, what additional safeguards are in place?", "type": "textarea", "weight": 2},
        {"id": "DP.5", "text": "What technical and organisational security measures are in place?", "type": "textarea", "required": true, "weight": 2},
        {"id": "DP.6", "text": "Has the Data Protection Officer been consulted?", "type": "select", "options": ["Yes", "No", "Not Applicable"], "required": true, "weight": 1},
        {"id": "DP.7", "text": "What measures are in place to mitigate identified risks?", "type": "textarea", "required": true, "weight": 2},
        {"id": "DP.8", "text": "Are data subjects informed about the processing?", "type": "select", "options": ["Yes — Privacy Notice provided", "Yes — Other notification", "No", "Partially"], "required": true, "weight": 1},
        {"id": "DP.9", "text": "How can data subjects exercise their rights?", "type": "textarea", "weight": 1},
        {"id": "DP.10", "text": "What is the residual risk level after mitigations?", "type": "select", "options": ["Very Low", "Low", "Medium", "High", "Very High"], "required": true, "weight": 3}
      ]
    },
    {
      "id": "tia",
      "title": "Transfer Impact Assessment",
      "description": "Assess risks of international data transfers (if applicable)",
      "module_trigger": "transfer",
      "questions": [
        {"id": "TIA.1", "text": "To which countries is data transferred?", "type": "textarea", "required": true, "weight": 1},
        {"id": "TIA.2", "text": "What transfer mechanism is used (e.g. SCCs, BCRs, Adequacy Decision)?", "type": "select", "options": ["Standard Contractual Clauses (SCCs)", "Binding Corporate Rules (BCRs)", "Adequacy Decision", "Consent", "Derogation — Contract", "Derogation — Legal Claims"], "required": true, "weight": 2},
        {"id": "TIA.3", "text": "Does the destination country have equivalent data protection laws?", "type": "select", "options": ["Yes — Adequacy decision", "Partial equivalence", "No — Supplementary measures needed", "Unknown"], "required": true, "weight": 3},
        {"id": "TIA.4", "text": "What supplementary measures are in place for the transfer?", "type": "textarea", "weight": 2},
        {"id": "TIA.5", "text": "What is the overall risk level of the transfer?", "type": "select", "options": ["Very Low", "Low", "Medium", "High", "Very High"], "required": true, "weight": 3}
      ]
    }
  ]'::JSONB
),
(
  'vendor-risk',
  'Vendor Risk Assessment',
  'Assess data protection risks when engaging third-party vendors or processors',
  '1.0',
  true,
  '[
    {
      "id": "entry",
      "title": "Vendor Overview",
      "description": "Basic information about the vendor engagement",
      "questions": [
        {"id": "VR.1", "text": "What is the vendor/processor name?", "type": "text", "required": true},
        {"id": "VR.2", "text": "What service does the vendor provide?", "type": "textarea", "required": true},
        {"id": "VR.3", "text": "What categories of personal data will the vendor process?", "type": "textarea", "required": true},
        {"id": "VR.4", "text": "Where does the vendor store/process data?", "type": "textarea", "required": true}
      ]
    },
    {
      "id": "common_nucleus",
      "title": "Security & Compliance",
      "description": "Evaluate the vendors security posture and compliance",
      "questions": [
        {"id": "VR.5", "text": "Does the vendor hold ISO 27001, SOC 2, or equivalent certification?", "type": "select", "options": ["ISO 27001", "SOC 2 Type II", "SOC 2 Type I", "CSA STAR", "Multiple certifications", "None"], "required": true, "weight": 2},
        {"id": "VR.6", "text": "Is a Data Processing Agreement (DPA) in place?", "type": "select", "options": ["Yes", "No", "In Progress"], "required": true, "weight": 3},
        {"id": "VR.7", "text": "Does the vendor have a designated DPO or privacy officer?", "type": "select", "options": ["Yes", "No", "Unknown"], "weight": 1},
        {"id": "VR.8", "text": "Describe the vendors data breach notification process", "type": "textarea", "required": true, "weight": 2},
        {"id": "VR.9", "text": "Does the vendor use sub-processors? If so, list them.", "type": "textarea", "weight": 2},
        {"id": "VR.10", "text": "What is the overall vendor risk level?", "type": "select", "options": ["Very Low", "Low", "Medium", "High", "Very High"], "required": true, "weight": 3}
      ]
    }
  ]'::JSONB
),
(
  'lia',
  'Legitimate Interest Assessment (LIA)',
  'Assess whether legitimate interest can be relied upon as a lawful basis',
  '1.0',
  true,
  '[
    {
      "id": "entry",
      "title": "Purpose & Interest",
      "description": "Identify the legitimate interest being pursued",
      "questions": [
        {"id": "LI.1", "text": "What is the legitimate interest being pursued?", "type": "textarea", "required": true},
        {"id": "LI.2", "text": "Is the processing necessary to achieve that interest?", "type": "textarea", "required": true},
        {"id": "LI.3", "text": "Could the same goal be achieved in a less intrusive way?", "type": "textarea", "required": true}
      ]
    },
    {
      "id": "common_nucleus",
      "title": "Balancing Test",
      "description": "Balance the interest against data subject rights",
      "questions": [
        {"id": "LI.4", "text": "What is the impact on data subjects?", "type": "textarea", "required": true, "weight": 3},
        {"id": "LI.5", "text": "Would data subjects reasonably expect this processing?", "type": "select", "options": ["Yes — clearly expected", "Probably — within reasonable expectations", "Uncertain", "No — unlikely to expect"], "required": true, "weight": 2},
        {"id": "LI.6", "text": "Are any vulnerable groups (e.g. children) affected?", "type": "select", "options": ["No", "Yes — children", "Yes — other vulnerable group", "Unknown"], "required": true, "weight": 2},
        {"id": "LI.7", "text": "What safeguards are in place to protect data subjects?", "type": "textarea", "required": true, "weight": 2},
        {"id": "LI.8", "text": "Can data subjects easily opt out?", "type": "select", "options": ["Yes — simple opt-out available", "Yes — but requires effort", "No"], "required": true, "weight": 2},
        {"id": "LI.9", "text": "Does the legitimate interest override data subject rights?", "type": "select", "options": ["Yes — interest clearly overrides", "Yes — on balance", "Borderline — additional safeguards needed", "No — interest does not override"], "required": true, "weight": 3}
      ]
    }
  ]'::JSONB
);
