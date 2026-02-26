// Seed assessment frameworks into Supabase
// Run: node supabase/seed/seed-frameworks.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://pablomini-server:54521',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const modules = JSON.parse(readFileSync(new URL('./assessment_modules.json', import.meta.url), 'utf8'));
const questions = JSON.parse(readFileSync(new URL('./assessment_questions.json', import.meta.url), 'utf8'));

// Group questions by module_id
const questionsByModule = {};
for (const q of questions) {
  const mid = q.module_id;
  if (!questionsByModule[mid]) questionsByModule[mid] = [];
  questionsByModule[mid].push(q);
}

// Build sections from modules
const sections = modules.map(m => ({
  id: m.id,
  title: m.name,
  layer: m.layer,
  trigger_condition: m.trigger_condition,
  assessment_outputs: m.assessment_outputs,
  legal_driver: m.legal_driver,
  display_order: m.display_order,
  questions: (questionsByModule[m.id] || []).map(q => ({
    id: q.id,
    text: q.question_text,
    type: q.question_type,
    options: q.options || [],
    help_text: q.help_text || '',
    legal_basis: q.legal_basis || '',
    logic_skip: q.logic_skip || '',
    primary_persona: q.primary_persona || '',
    assessment_types: q.assessment_types || [],
    display_order: q.display_order,
  }))
}));

async function seed() {
  // Delete existing system frameworks first (clean slate)
  const { error: delError } = await supabase
    .from('assessment_frameworks')
    .delete()
    .eq('is_system', true);

  if (delError) {
    console.error('Error clearing existing frameworks:', delError.message);
  }

  // Insert the unified framework
  const { data, error } = await supabase
    .from('assessment_frameworks')
    .insert({
      slug: 'unified-v1',
      name: 'Unified Assessment',
      description: 'Comprehensive compliance assessment covering DPIA, FRIA, TIA, LIA, Cybersecurity, and Vendor Due Diligence. Dynamic module activation based on triage answers.',
      version: '1.0',
      sections: JSON.stringify(sections),
      is_system: true,
    })
    .select();

  if (error) {
    console.error('Error seeding unified framework:', error.message);
    return;
  }
  console.log('Seeded unified framework:', data[0]?.id);

  // Create individual framework entries for standalone use
  const standaloneFrameworks = [
    { slug: 'dpia', name: 'Data Protection Impact Assessment (DPIA)', description: 'GDPR Article 35 assessment for high-risk processing activities.', outputs: ['DPIA'] },
    { slug: 'fria', name: 'Fundamental Rights Impact Assessment (FRIA)', description: 'EU AI Act Article 27 assessment for high-risk AI systems.', outputs: ['FRIA'] },
    { slug: 'tia', name: 'Transfer Impact Assessment (TIA)', description: 'Assessment for international data transfers outside EU/EEA.', outputs: ['TIA'] },
    { slug: 'lia', name: 'Legitimate Interest Assessment (LIA)', description: 'Three-part balancing test for GDPR Article 6(1)(f) legal basis.', outputs: ['LIA'] },
    { slug: 'vendor-risk', name: 'Vendor Risk Assessment', description: 'Due diligence assessment for third-party vendors and processors.', outputs: ['VENDOR'] },
    { slug: 'cybersecurity', name: 'Cybersecurity Assessment', description: 'NIS2-aligned cybersecurity risk assessment.', outputs: ['CYBER'] },
  ];

  for (const fw of standaloneFrameworks) {
    const fwSections = sections
      .filter(s => {
        if (s.assessment_outputs.includes('ALL')) return true;
        return s.assessment_outputs.some(o => fw.outputs.includes(o));
      })
      .map(s => ({
        ...s,
        questions: s.questions.filter(q => {
          if (q.assessment_types.includes('ALL')) return true;
          return q.assessment_types.some(t => fw.outputs.includes(t));
        })
      }))
      .filter(s => s.questions.length > 0);

    const { error: fwError } = await supabase
      .from('assessment_frameworks')
      .insert({
        slug: fw.slug,
        name: fw.name,
        description: fw.description,
        version: '1.0',
        sections: JSON.stringify(fwSections),
        is_system: true,
      });

    if (fwError) console.error(`Error seeding ${fw.slug}:`, fwError.message);
    else console.log(`Seeded ${fw.slug}`);
  }

  // DPO-standard standalone frameworks (self-contained question sets)
  const dpoFrameworks = [
    {
      slug: 'ropa-review',
      name: 'ROPA Review',
      description: 'Periodic review of Records of Processing Activities (GDPR Art. 30). Validates completeness and accuracy of your processing register.',
      version: '1.0',
      sections: [
        {
          id: 'ropa_scope',
          title: 'Scope & Coverage',
          layer: '1',
          trigger_condition: 'Always',
          assessment_outputs: ['ROPA'],
          legal_driver: 'GDPR Art.30 – Records of processing activities',
          display_order: 1,
          questions: [
            { id: 'RR.1', text: 'When was the ROPA last reviewed?', type: 'text', options: [], help_text: 'Enter the date of the last formal review. If never reviewed, state "Initial review".', legal_basis: 'GDPR Art.30', display_order: 1, assessment_types: ['ROPA'] },
            { id: 'RR.2', text: 'How many processing activities are currently recorded in the ROPA?', type: 'text', options: [], help_text: 'Total count of processing activities across all entities.', legal_basis: 'GDPR Art.30(1)', display_order: 2, assessment_types: ['ROPA'] },
            { id: 'RR.3', text: 'Are all entities within the organisation represented in the ROPA?', type: 'select', options: ['Yes - all entities covered', 'Partially - some entities missing', 'No - significant gaps exist'], help_text: 'Each legal entity acting as a controller must maintain its own records.', legal_basis: 'GDPR Art.30(1)', display_order: 3, assessment_types: ['ROPA'] },
            { id: 'RR.4', text: 'Are processing activities where the organisation acts as a processor separately documented?', type: 'select', options: ['Yes', 'No', 'N/A - no processor activities'], help_text: 'Art.30(2) requires processors to maintain separate records.', legal_basis: 'GDPR Art.30(2)', display_order: 4, assessment_types: ['ROPA'] },
          ]
        },
        {
          id: 'ropa_completeness',
          title: 'Data Quality & Completeness',
          layer: '2',
          trigger_condition: 'Always',
          assessment_outputs: ['ROPA'],
          legal_driver: 'GDPR Art.30(1)(a)-(g)',
          display_order: 2,
          questions: [
            { id: 'RR.5', text: 'Do all processing activity records include the required Art.30(1) fields?', type: 'select', options: ['Yes - all mandatory fields populated', 'Mostly - minor gaps in some records', 'No - significant fields missing'], help_text: 'Required fields: controller name/contact, purposes, categories of data subjects, categories of personal data, recipients, transfers, retention periods, security measures.', legal_basis: 'GDPR Art.30(1)(a)-(g)', display_order: 5, assessment_types: ['ROPA'] },
            { id: 'RR.6', text: 'Is the legal basis recorded for each processing activity?', type: 'select', options: ['Yes - all activities', 'Partially', 'No'], help_text: 'While not required by Art.30, recording the legal basis supports accountability.', legal_basis: 'GDPR Art.6, Art.5(2)', display_order: 6, assessment_types: ['ROPA'] },
            { id: 'RR.7', text: 'Are retention periods specified for each processing activity?', type: 'select', options: ['Yes - specific periods defined', 'Partially - some use generic periods', 'No - retention not consistently documented'], help_text: 'Retention periods should be specific and justified, not blanket timeframes.', legal_basis: 'GDPR Art.30(1)(f)', display_order: 7, assessment_types: ['ROPA'] },
            { id: 'RR.8', text: 'Are international data transfers documented with the transfer mechanism?', type: 'select', options: ['Yes - countries and mechanisms recorded', 'Partially', 'No', 'N/A - no international transfers'], help_text: 'Art.30(1)(e) requires documentation of third country transfers and safeguards.', legal_basis: 'GDPR Art.30(1)(e), Art.44-49', display_order: 8, assessment_types: ['ROPA'] },
          ]
        },
        {
          id: 'ropa_governance',
          title: 'Governance & Maintenance',
          layer: '3',
          trigger_condition: 'Always',
          assessment_outputs: ['ROPA'],
          legal_driver: 'GDPR Art.5(2) – Accountability',
          display_order: 3,
          questions: [
            { id: 'RR.9', text: 'Is there a defined process for updating the ROPA when processing activities change?', type: 'select', options: ['Yes - formal change process in place', 'Informal - ad-hoc updates', 'No - no defined process'], help_text: 'A living ROPA requires a trigger-based update mechanism (e.g. new system onboarding, contract changes).', legal_basis: 'GDPR Art.5(2)', display_order: 9, assessment_types: ['ROPA'] },
            { id: 'RR.10', text: 'Who is responsible for maintaining the ROPA?', type: 'text', options: [], help_text: 'Identify the role or team responsible. Ideally the DPO oversees but business owners provide input.', legal_basis: 'GDPR Art.39(1)(b)', display_order: 10, assessment_types: ['ROPA'] },
            { id: 'RR.11', text: 'Is the ROPA available for inspection by the supervisory authority on request?', type: 'select', options: ['Yes - readily available', 'Yes - but would need preparation time', 'No'], help_text: 'Art.30(4) requires records be made available to the supervisory authority on request.', legal_basis: 'GDPR Art.30(4)', display_order: 11, assessment_types: ['ROPA'] },
            { id: 'RR.12', text: 'What findings or actions have been identified during this review?', type: 'textarea', options: [], help_text: 'Document any gaps, inaccuracies, or updates needed. Assign owners and deadlines for remediation.', legal_basis: 'GDPR Art.5(2)', display_order: 12, assessment_types: ['ROPA'] },
          ]
        },
      ]
    },
    {
      slug: 'breach-readiness',
      name: 'Breach Readiness Assessment',
      description: 'Evaluates preparedness for personal data breach detection, response, and notification under GDPR Art. 33-34.',
      version: '1.0',
      sections: [
        {
          id: 'breach_detection',
          title: 'Detection & Identification',
          layer: '1',
          trigger_condition: 'Always',
          assessment_outputs: ['BREACH'],
          legal_driver: 'GDPR Art.33 – Notification to supervisory authority',
          display_order: 1,
          questions: [
            { id: 'BR.1', text: 'Are there technical systems in place to detect data breaches (e.g. SIEM, DLP, intrusion detection)?', type: 'select', options: ['Yes - comprehensive monitoring', 'Partially - some systems monitored', 'No - limited detection capability'], help_text: 'Effective detection is the first step to meeting the 72-hour notification deadline.', legal_basis: 'GDPR Art.32(1)(d), Art.33(1)', display_order: 1, assessment_types: ['BREACH'] },
            { id: 'BR.2', text: 'Is there a clear definition of what constitutes a personal data breach shared with all staff?', type: 'select', options: ['Yes - documented and communicated', 'Partially - known by IT/security only', 'No - no formal definition shared'], help_text: 'A breach includes accidental or unlawful destruction, loss, alteration, unauthorised disclosure of or access to personal data.', legal_basis: 'GDPR Art.4(12)', display_order: 2, assessment_types: ['BREACH'] },
            { id: 'BR.3', text: 'Do employees know how and where to report a suspected breach?', type: 'select', options: ['Yes - clear reporting channel communicated', 'Partially - some awareness', 'No - no reporting mechanism defined'], help_text: 'Staff should know the internal reporting email/phone and that time is critical.', legal_basis: 'GDPR Art.33(1)', display_order: 3, assessment_types: ['BREACH'] },
            { id: 'BR.4', text: 'Are third-party processors contractually required to notify you of breaches without undue delay?', type: 'select', options: ['Yes - all DPAs include breach notification clause', 'Partially - some DPAs', 'No - not consistently included'], help_text: 'Art.33(2) requires processors to notify controllers without undue delay.', legal_basis: 'GDPR Art.33(2), Art.28(3)(f)', display_order: 4, assessment_types: ['BREACH'] },
          ]
        },
        {
          id: 'breach_response',
          title: 'Response & Containment',
          layer: '2',
          trigger_condition: 'Always',
          assessment_outputs: ['BREACH'],
          legal_driver: 'GDPR Art.33-34',
          display_order: 2,
          questions: [
            { id: 'BR.5', text: 'Is there a documented Breach Response Plan/Procedure?', type: 'select', options: ['Yes - documented and tested', 'Yes - documented but not tested', 'Draft only', 'No'], help_text: 'The plan should cover roles, escalation paths, containment steps, evidence preservation, and communication templates.', legal_basis: 'GDPR Art.32(1)(d), Art.33', display_order: 5, assessment_types: ['BREACH'] },
            { id: 'BR.6', text: 'Is a Breach Response Team identified with clear roles and contact details?', type: 'select', options: ['Yes - named team with 24/7 contacts', 'Partially - roles identified but no out-of-hours contacts', 'No - no formal team'], help_text: 'Typical team: DPO, IT Security, Legal, Communications, Senior Management representative.', legal_basis: 'GDPR Art.33(1)', display_order: 6, assessment_types: ['BREACH'] },
            { id: 'BR.7', text: 'Has a breach simulation or tabletop exercise been conducted in the last 12 months?', type: 'select', options: ['Yes - within last 12 months', 'Yes - but more than 12 months ago', 'No - never conducted'], help_text: 'Regular exercises reveal gaps in the response process before a real incident occurs.', legal_basis: 'GDPR Art.32(1)(d)', display_order: 7, assessment_types: ['BREACH'] },
            { id: 'BR.8', text: 'Is there a process for assessing the risk to individuals from a breach?', type: 'select', options: ['Yes - documented risk assessment methodology', 'Informal process only', 'No'], help_text: 'Risk assessment determines whether supervisory authority notification (Art.33) and individual notification (Art.34) are required.', legal_basis: 'GDPR Art.33(1), Art.34(1)', display_order: 8, assessment_types: ['BREACH'] },
          ]
        },
        {
          id: 'breach_notification',
          title: 'Notification & Compliance',
          layer: '3',
          trigger_condition: 'Always',
          assessment_outputs: ['BREACH'],
          legal_driver: 'GDPR Art.33-34',
          display_order: 3,
          questions: [
            { id: 'BR.9', text: 'Are you able to notify the supervisory authority within 72 hours of becoming aware of a breach?', type: 'select', options: ['Yes - process supports 72-hour deadline', 'Uncertain - process may not be fast enough', 'No - no process for timely notification'], help_text: 'Art.33(1) requires notification within 72 hours. Delays must be justified.', legal_basis: 'GDPR Art.33(1)', display_order: 9, assessment_types: ['BREACH'] },
            { id: 'BR.10', text: 'Do you have pre-prepared templates for supervisory authority notification (Art.33) and individual notification (Art.34)?', type: 'select', options: ['Yes - templates ready with all required fields', 'Partially - some templates exist', 'No - would need to create from scratch'], help_text: 'Templates should cover: nature of breach, contact point, likely consequences, measures taken/proposed.', legal_basis: 'GDPR Art.33(3)(a)-(d)', display_order: 10, assessment_types: ['BREACH'] },
            { id: 'BR.11', text: 'Is there a breach register to document all breaches (including those not reported to the authority)?', type: 'select', options: ['Yes - comprehensive register maintained', 'Partially - major breaches logged', 'No - no register'], help_text: 'Art.33(5) requires documentation of all breaches, their effects, and remedial action.', legal_basis: 'GDPR Art.33(5)', display_order: 11, assessment_types: ['BREACH'] },
            { id: 'BR.12', text: 'Is there a post-incident review process to update controls and prevent recurrence?', type: 'select', options: ['Yes - formal lessons-learned process', 'Informal review only', 'No'], help_text: 'Post-incident reviews should feed into updated security measures and the breach response plan.', legal_basis: 'GDPR Art.32(1)(d)', display_order: 12, assessment_types: ['BREACH'] },
          ]
        },
      ]
    },
  ];

  for (const fw of dpoFrameworks) {
    const { error: fwError } = await supabase
      .from('assessment_frameworks')
      .insert({
        slug: fw.slug,
        name: fw.name,
        description: fw.description,
        version: fw.version,
        sections: JSON.stringify(fw.sections),
        is_system: true,
      });

    if (fwError) console.error(`Error seeding ${fw.slug}:`, fwError.message);
    else console.log(`Seeded DPO framework: ${fw.slug}`);
  }

  console.log('Done seeding frameworks');
}

seed();
