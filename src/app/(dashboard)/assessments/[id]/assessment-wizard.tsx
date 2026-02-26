"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, AlertTriangle,
  Loader2, CheckCircle, ShieldCheck, BarChart3,
  RefreshCw, RotateCcw, BadgeCheck, Plus, X,
  ChevronDown, ChevronUp, HelpCircle, Settings,
} from "lucide-react";
import {
  updateAssessmentResponses, completeAssessment,
  createActionItemFromAssessment, getActionItemsForAssessment,
  updateActionItemStatus, createSystemFromAssessment, createPAFromAssessment,
  reopenAssessment, redoAssessment, validateAssessment,
  getAssessmentLinkedRecords,
} from "../actions";
import {
  addOptionToList, updateOptionInList, deleteOptionFromList,
} from "../option-list-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- Interfaces ---

interface Section {
  id: string;
  title: string;
  layer: string;
  trigger_condition: string;
  display_order: number;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  type: string;
  options: string[];
  help_text: string;
  legal_basis: string;
  logic_skip: string;
  display_order: number;
}

interface Assessment {
  id: string;
  title: string;
  status: string;
  responses: Record<string, unknown>;
  activated_modules: string[];
  risk_score: number | null;
  risk_classification: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  entity_id: string | null;
  linked_system_id: string | null;
  linked_pa_id: string | null;
  validated_by: string | null;
  validated_at: string | null;
  metadata?: Record<string, unknown> | null;
  framework: {
    id: string;
    name: string;
    sections: string | Section[];
  } | null;
}

interface EditableOption {
  id: string;
  label: string;
  is_default: boolean;
}

interface Props {
  assessment: Assessment;
  entities: { id: string; name: string }[];
  systems: { id: string; name: string }[];
  processingActivities: { id: string; activity: string }[];
  editableOptions?: Record<string, EditableOption[]>;
}

// --- Module activation rules ---

function computeActivatedModules(responses: Record<string, unknown>): string[] {
  const modules = ["entry", "common_nucleus"];
  const r = (id: string) => {
    const val = responses[id];
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val;
    return "";
  };

  if (r("E2") === "Yes") modules.push("dpia");
  const e3 = r("E3");
  if (Array.isArray(e3) && e3.includes("To other countries")) modules.push("tia");
  if (r("E4") === "Yes") {
    modules.push("ai_scope_classification", "ai_prohibited_practices", "ai_high_risk_classification", "ai_limited_risk_gpai");
  }
  if (r("E7") === "Yes") {
    modules.push("vendor_general");
    if (r("E4") === "Yes") modules.push("vendor_ai_due_diligence");
  }
  if (r("E8") === "Yes" || r("E4") === "Yes") modules.push("cybersecurity");
  const dp3 = r("DP.3");
  if (Array.isArray(dp3) && dp3.some((v: string) => v.toLowerCase().includes("legitimate"))) modules.push("lia");

  return [...new Set(modules)];
}

// --- Risk Computation ---

interface RiskBreakdown {
  score: number;
  classification: string;
  factors: { label: string; questionId: string; contribution: number; severity: "high" | "medium" | "low"; reason: string }[];
}

// Default risk scoring configuration — can be overridden via settings
const DEFAULT_RISK_FACTORS: RiskFactor[] = [
  { id: "E2", label: "Personal data processing", points: 20, severity: "medium", condition: "equals:Yes", reason: "Processing personal data triggers GDPR obligations." },
  { id: "E4", label: "AI/ML system involvement", points: 25, severity: "high", condition: "equals:Yes", reason: "AI/ML involvement triggers EU AI Act obligations and GDPR Art.22 safeguards." },
  { id: "E8", label: "Sensitive or critical infrastructure data", points: 15, severity: "medium", condition: "equals:Yes", reason: "Sensitive data categories (Art.9) or critical infrastructure require enhanced safeguards." },
  { id: "E3", label: "Cross-border data transfers", points: 15, severity: "medium", condition: "includes:To other countries", reason: "International transfers require valid mechanisms under Art.44-49." },
  { id: "DP.2", label: "Special category data processed", points: 20, severity: "high", condition: "not_equals:No", reason: "Special category data is prohibited under Art.9 unless an explicit exception applies." },
  { id: "DP.9", label: "Solely automated decision-making", points: 15, severity: "high", condition: "equals:Yes", reason: "Automated decisions with legal or significant effects trigger GDPR Art.22 rights." },
  { id: "VR.3", label: "No DPA in place", points: 15, severity: "high", condition: "equals:No", reason: "Vendor processing personal data without a Data Processing Agreement violates Art.28." },
  { id: "TIA.4", label: "Government access risk", points: 20, severity: "high", condition: "equals:High", reason: "High government surveillance risk in recipient country undermines transfer safeguards." },
  { id: "DP.10", label: "Residual risk self-assessment", points: 0, severity: "medium", condition: "variable", reason: "Self-assessed residual risk level." },
];

const DEFAULT_THRESHOLDS = { high: 60, medium: 30 };

interface RiskFactor {
  id: string;
  label: string;
  points: number;
  severity: "high" | "medium" | "low";
  condition: string;
  reason: string;
}

function computeRiskDetailed(responses: Record<string, unknown>): RiskBreakdown {
  const factors: RiskBreakdown["factors"] = [];
  let totalRisk = 0;

  for (const factor of DEFAULT_RISK_FACTORS) {
    const val = responses[factor.id];
    if (val === undefined || val === null || val === "") continue;

    // Special handling for DP.10 (variable points)
    if (factor.condition === "variable") {
      const level = val as string;
      const rMap: Record<string, number> = { Low: 5, Medium: 15, High: 25 };
      const pts = rMap[level];
      if (pts !== undefined) {
        totalRisk += pts;
        const severityMap: Record<string, "high" | "medium" | "low"> = { High: "high", Medium: "medium", Low: "low" };
        factors.push({
          label: `Residual risk: ${level}`,
          questionId: factor.id,
          contribution: pts,
          severity: severityMap[level] || "medium",
          reason: `${factor.reason}${level === "High" ? " Consultation with supervisory authority required (Art.36)." : ""}`,
        });
      }
      continue;
    }

    let triggered = false;
    if (factor.condition.startsWith("equals:")) {
      triggered = val === factor.condition.slice(7);
    } else if (factor.condition.startsWith("not_equals:")) {
      triggered = val !== factor.condition.slice(11) && val !== "";
    } else if (factor.condition.startsWith("includes:")) {
      triggered = Array.isArray(val) && val.includes(factor.condition.slice(9));
    }

    if (triggered) {
      totalRisk += factor.points;
      factors.push({
        label: factor.label,
        questionId: factor.id,
        contribution: factor.points,
        severity: factor.severity,
        reason: factor.reason,
      });
    }
  }

  const score = Math.min(100, totalRisk);
  const classification = score >= DEFAULT_THRESHOLDS.high ? "high" : score >= DEFAULT_THRESHOLDS.medium ? "medium" : "low";

  return { score, classification, factors };
}

// --- Main Component ---

// Questions that support editable option lists
const EDITABLE_QUESTIONS = new Set(["E6", "CN.1"]);

export function AssessmentWizard({ assessment, entities, systems, processingActivities, editableOptions }: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, unknown>>(
    (assessment.responses as Record<string, unknown>) || {}
  );
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  // Complete confirmation dialog
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Risk explanation panel
  const [showRiskExplainer, setShowRiskExplainer] = useState(false);

  // Post-assessment actions
  const [actionItems, setActionItems] = useState<Record<string, unknown>[]>([]);
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionDesc, setNewActionDesc] = useState("");
  const [newActionPriority, setNewActionPriority] = useState("medium");
  const [newActionDueDate, setNewActionDueDate] = useState("");
  const [creatingAction, setCreatingAction] = useState(false);
  const [systemCreated, setSystemCreated] = useState(false);
  const [paCreated, setPaCreated] = useState(false);
  const [creatingSystem, setCreatingSystem] = useState(false);
  const [creatingPA, setCreatingPA] = useState(false);

  // Linked records and toast
  const [linkedRecords, setLinkedRecords] = useState<Array<{ type: string; id: string; title: string; created_at: string }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reopen / Redo / Validate states
  const [reopening, setReopening] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [validating, setValidating] = useState(false);

  // Auto-save timer
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Parse framework sections
  const sections: Section[] = useMemo(() => {
    if (!assessment.framework?.sections) return [];
    const raw = typeof assessment.framework.sections === "string"
      ? JSON.parse(assessment.framework.sections)
      : assessment.framework.sections;
    return (raw as Section[]).sort((a, b) => a.display_order - b.display_order);
  }, [assessment.framework]);

  const activatedModules = useMemo(() => computeActivatedModules(responses), [responses]);

  const activeSections = useMemo(
    () => sections.filter((s) => activatedModules.includes(s.id)),
    [sections, activatedModules]
  );

  const currentSection = activeSections[currentSectionIdx];
  const isLastSection = currentSectionIdx === activeSections.length - 1;
  const isCompleted = assessment.status === "completed" || assessment.status === "validated";
  const isValidated = assessment.status === "validated";

  const riskBreakdown = useMemo(() => computeRiskDetailed(responses), [responses]);

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Auto-save on responses change (debounced)
  useEffect(() => {
    if (isCompleted) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const result = await updateAssessmentResponses(assessment.id, responses, activatedModules);
      if (!result.error) {
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

  // Load action items and linked records on mount for completed assessments
  useEffect(() => {
    if (isCompleted) {
      getActionItemsForAssessment(assessment.id).then((result) => {
        if (result.data) setActionItems(result.data);
      });
      getAssessmentLinkedRecords(assessment.id).then((result) => {
        if (result.data) setLinkedRecords(result.data);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- Handlers ---

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAssessmentResponses(assessment.id, responses, activatedModules);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setLastSavedAt(new Date().toLocaleTimeString());
    }
  }

  async function handleComplete() {
    setShowCompleteConfirm(false);
    setCompleting(true);
    setError(null);
    const saveResult = await updateAssessmentResponses(assessment.id, responses, activatedModules);
    if (saveResult.error) {
      setError(saveResult.error);
      setCompleting(false);
      return;
    }
    const { score, classification } = riskBreakdown;
    const completeResult = await completeAssessment(assessment.id, score, classification);
    setCompleting(false);
    if (completeResult.error) {
      setError(completeResult.error);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    }
  }

  async function handleReopen() {
    setReopening(true);
    setError(null);
    const result = await reopenAssessment(assessment.id);
    setReopening(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleRedo() {
    setRedoing(true);
    setError(null);
    const result = await redoAssessment(assessment.id);
    setRedoing(false);
    if (result.error) setError(result.error);
    else if (result.data) router.push(`/assessments/${result.data.id}`);
  }

  async function handleValidate() {
    setValidating(true);
    setError(null);
    const result = await validateAssessment(assessment.id);
    setValidating(false);
    if (result.error) setError(result.error);
    else {
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    }
  }

  async function handleCreateAction() {
    if (!newActionTitle.trim()) return;
    setCreatingAction(true);
    const result = await createActionItemFromAssessment(
      assessment.id,
      {
        title: newActionTitle.trim(),
        description: newActionDesc,
        priority: newActionPriority,
        due_date: newActionDueDate || null,
      }
    );
    setCreatingAction(false);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setActionItems((prev) => [result.data!, ...prev]);
      setShowCreateAction(false);
      setToastMessage(`Action item "${newActionTitle.trim()}" created.`);
      setNewActionTitle("");
      setNewActionDesc("");
      setNewActionPriority("medium");
      setNewActionDueDate("");
    }
  }

  async function handleToggleActionStatus(actionId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const result = await updateActionItemStatus(actionId, newStatus);
    if (result.error) {
      setError(result.error);
    } else {
      setActionItems((prev) =>
        prev.map((a) =>
          (a as Record<string, unknown>).id === actionId
            ? { ...a, status: newStatus }
            : a
        )
      );
    }
  }

  async function handleCreateSystem() {
    const vendorName = (responses["VR.1"] as string) || "";
    const systemName = vendorName || assessment.title;
    const dataTypes = Array.isArray(responses["DP.1"]) ? (responses["DP.1"] as string[]) : [];
    setCreatingSystem(true);
    const result = await createSystemFromAssessment(assessment.id, {
      name: systemName,
      description: `System identified from assessment: ${assessment.title}`,
      vendor: vendorName,
      data_types: dataTypes,
    });
    setCreatingSystem(false);
    if (result.error) setError(result.error);
    else if (result.data) {
      setSystemCreated(true);
      setToastMessage(`System record "${systemName}" created.`);
    }
  }

  async function handleCreatePA() {
    const activity = assessment.title;
    const legalBasis = Array.isArray(responses["DP.3"]) ? (responses["DP.3"] as string[]) : responses["DP.3"] ? [responses["DP.3"] as string] : [];
    setCreatingPA(true);
    const result = await createPAFromAssessment(assessment.id, {
      activity,
      purpose: (responses["CN.2"] as string) || undefined,
      legal_basis: legalBasis.length > 0 ? legalBasis : undefined,
    });
    setCreatingPA(false);
    if (result.error) setError(result.error);
    else if (result.data) {
      setPaCreated(true);
      setToastMessage(`Processing activity "${activity}" created.`);
    }
  }

  function handleNext() {
    if (currentSectionIdx < activeSections.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      window.scrollTo(0, 0);
    }
  }

  function handlePrev() {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx(currentSectionIdx - 1);
      window.scrollTo(0, 0);
    }
  }

  // Count answered questions per section
  function sectionProgress(section: Section): { answered: number; total: number } {
    const total = section.questions.length;
    const answered = section.questions.filter((q) => {
      const val = responses[q.id];
      if (val === undefined || val === null || val === "") return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;
    return { answered, total };
  }

  // --- Render ---

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg text-xs flex items-center gap-2">
          <CheckCircle size={14} />
          {toastMessage}
          <button onClick={() => setToastMessage(null)} className="ml-2 text-green-600 hover:text-green-800 cursor-pointer">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/assessments"
            className="p-2 rounded-lg hover:bg-gray-100 text-text-muted transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="text-[18px] font-bold text-text-primary">{assessment.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-text-muted">{assessment.framework?.name || "Custom"}</span>
              <Badge
                color={
                  assessment.status === "validated" ? "teal"
                    : assessment.status === "completed" ? "green"
                      : assessment.status === "in_progress" ? "blue"
                        : "gray"
                }
              >
                {assessment.status.replace("_", " ").toUpperCase()}
              </Badge>
              {lastSavedAt && !isCompleted && (
                <span className="text-[10px] text-text-light">Saved at {lastSavedAt}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              <Button variant="secondary" small onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                Save
              </Button>
              <Button small onClick={() => setShowCompleteConfirm(true)} disabled={completing}>
                {completing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Complete
              </Button>
            </>
          )}
          {assessment.status === "completed" && !isValidated && (
            <>
              <Button variant="secondary" small onClick={handleReopen} disabled={reopening}>
                {reopening ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Reopen
              </Button>
              <Button small onClick={handleValidate} disabled={validating}>
                {validating ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
                Validate
              </Button>
            </>
          )}
          {isValidated && (
            <Button variant="secondary" small onClick={handleRedo} disabled={redoing}>
              {redoing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Redo Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle size={14} />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">&times;</button>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCompleteConfirm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-2">Complete Assessment</h3>
            <p className="text-xs text-text-muted mb-3">
              This will finalise the assessment with the current responses and calculate the risk score.
            </p>
            <div className="p-3 bg-gray-50 rounded-lg border border-surface-border mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Calculated Risk Score:</span>
                <span className={`font-bold ${
                  riskBreakdown.classification === "high" ? "text-red-600"
                    : riskBreakdown.classification === "medium" ? "text-amber-600"
                      : "text-green-600"
                }`}>
                  {riskBreakdown.score}% ({riskBreakdown.classification.toUpperCase()})
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" small onClick={() => setShowCompleteConfirm(false)}>Cancel</Button>
              <Button small onClick={handleComplete} disabled={completing}>
                {completing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirm Complete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Assessment: Risk Summary and Post-Actions */}
      {isCompleted && (
        <div className="mb-6 space-y-4">
          {/* Risk Summary Card */}
          <div className="bg-white border border-surface-border rounded-[10px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <BarChart3 size={16} />
                Risk Assessment Summary
              </h3>
              <button
                onClick={() => setShowRiskExplainer(!showRiskExplainer)}
                className="text-xs text-brand hover:text-brand-hover cursor-pointer flex items-center gap-1"
              >
                {showRiskExplainer ? "Hide" : "Show"} details
                {showRiskExplainer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  riskBreakdown.classification === "high" ? "text-red-600"
                    : riskBreakdown.classification === "medium" ? "text-amber-600"
                      : "text-green-600"
                }`}>
                  {assessment.risk_score ?? riskBreakdown.score}%
                </div>
                <div className="text-[10px] text-text-muted mt-1">Risk Score</div>
              </div>
              <Badge
                color={
                  (assessment.risk_classification || riskBreakdown.classification) === "high" ? "red"
                    : (assessment.risk_classification || riskBreakdown.classification) === "medium" ? "amber"
                      : "green"
                }
              >
                {(assessment.risk_classification || riskBreakdown.classification).toUpperCase()} RISK
              </Badge>
              {assessment.completed_at && (
                <span className="text-[10px] text-text-light">
                  Completed {new Date(assessment.completed_at).toLocaleDateString()}
                </span>
              )}
              {isValidated && assessment.validated_at && (
                <span className="text-[10px] text-teal-600 flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Validated {new Date(assessment.validated_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {showRiskExplainer && riskBreakdown.factors.length > 0 && (
              <div className="space-y-2 border-t border-surface-border pt-3">
                {riskBreakdown.factors.map((f) => (
                  <div key={f.questionId} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      f.severity === "high" ? "bg-red-500" : f.severity === "medium" ? "bg-amber-500" : "bg-green-500"
                    }`} />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-text-primary">{f.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{f.reason}</div>
                    </div>
                    <span className="text-xs font-mono text-text-muted shrink-0">+{f.contribution}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post-completion Actions */}
          <div className="bg-white border border-surface-border rounded-[10px] p-5">
            <h3 className="text-sm font-bold text-text-primary mb-3">Post-Assessment Actions</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="secondary"
                small
                onClick={() => setShowCreateAction(true)}
                icon={<Plus size={12} />}
              >
                Create Action Item
              </Button>
              {!assessment.linked_system_id && !systemCreated && (
                <Button
                  variant="secondary"
                  small
                  onClick={handleCreateSystem}
                  disabled={creatingSystem}
                >
                  {creatingSystem ? <Loader2 size={12} className="animate-spin" /> : null}
                  Create System Record
                </Button>
              )}
              {!assessment.linked_pa_id && !paCreated && (
                <Button
                  variant="secondary"
                  small
                  onClick={handleCreatePA}
                  disabled={creatingPA}
                >
                  {creatingPA ? <Loader2 size={12} className="animate-spin" /> : null}
                  Create Processing Activity
                </Button>
              )}
            </div>

            {/* Action Items List */}
            {actionItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Action Items</div>
                {actionItems.map((item) => {
                  const a = item as Record<string, unknown>;
                  return (
                    <div key={a.id as string} className="flex items-center gap-3 p-2 rounded-lg border border-surface-border">
                      <button
                        onClick={() => handleToggleActionStatus(a.id as string, a.status as string)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                          a.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-300"
                        }`}
                      >
                        {a.status === "completed" && <Check size={10} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${a.status === "completed" ? "line-through text-text-light" : "text-text-primary"}`}>
                          {a.title as string}
                        </div>
                        {typeof a.description === "string" && a.description && (
                          <div className="text-[10px] text-text-muted truncate">{a.description}</div>
                        )}
                      </div>
                      <Badge
                        color={
                          a.priority === "critical" ? "red"
                            : a.priority === "high" ? "amber"
                              : a.priority === "medium" ? "blue"
                                : "gray"
                        }
                      >
                        {(a.priority as string).toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Linked Records */}
            {linkedRecords.length > 0 && (
              <div className="mt-4 pt-3 border-t border-surface-border">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Linked Records</div>
                <div className="flex flex-wrap gap-2">
                  {linkedRecords.map((r) => (
                    <span key={r.id} className="inline-flex items-center px-2 py-1 bg-gray-50 border border-surface-border rounded text-[10px] text-text-muted">
                      {r.type.replace("_", " ")}: {r.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Action Item Modal */}
          {showCreateAction && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCreateAction(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-text-primary mb-4">Create Action Item</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Title</label>
                    <input
                      type="text"
                      value={newActionTitle}
                      onChange={(e) => setNewActionTitle(e.target.value)}
                      placeholder="Action item title..."
                      className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                    <textarea
                      value={newActionDesc}
                      onChange={(e) => setNewActionDesc(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Priority</label>
                      <select
                        value={newActionPriority}
                        onChange={(e) => setNewActionPriority(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-primary mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newActionDueDate}
                        onChange={(e) => setNewActionDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="secondary" small onClick={() => setShowCreateAction(false)}>Cancel</Button>
                  <Button small onClick={handleCreateAction} disabled={creatingAction || !newActionTitle.trim()}>
                    {creatingAction ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Wizard Layout */}
      <div className="flex gap-6">
        {/* Section Sidebar */}
        <div className="w-56 shrink-0">
          <div className="bg-white border border-surface-border rounded-[10px] p-3 sticky top-4">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Sections</div>
            <div className="space-y-0.5">
              {activeSections.map((s, idx) => {
                const prog = sectionProgress(s);
                const isCurrent = idx === currentSectionIdx;
                const isComplete = prog.answered === prog.total && prog.total > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setCurrentSectionIdx(idx); window.scrollTo(0, 0); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                      isCurrent
                        ? "bg-brand-light text-brand font-medium"
                        : "text-text-muted hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${
                      isComplete
                        ? "bg-green-100 text-green-600"
                        : isCurrent
                          ? "bg-brand text-white"
                          : "bg-gray-100 text-text-light"
                    }`}>
                      {isComplete ? <Check size={8} /> : idx + 1}
                    </span>
                    <span className="truncate flex-1">{s.title}</span>
                    <span className="text-[9px] text-text-light shrink-0">{prog.answered}/{prog.total}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 min-w-0">
          {currentSection ? (
            <div className="bg-white border border-surface-border rounded-[10px] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{currentSection.title}</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Section {currentSectionIdx + 1} of {activeSections.length}
                  </p>
                </div>
                {(() => {
                  const prog = sectionProgress(currentSection);
                  return (
                    <span className="text-[10px] text-text-muted">
                      {prog.answered} / {prog.total} answered
                    </span>
                  );
                })()}
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {currentSection.questions
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((q) => (
                    <QuestionField
                      key={q.id}
                      question={q}
                      value={responses[q.id]}
                      onChange={(val) => setAnswer(q.id, val)}
                      disabled={isCompleted}
                      expandedHelp={expandedHelp}
                      onToggleHelp={setExpandedHelp}
                      editableOptions={EDITABLE_QUESTIONS.has(q.id) ? editableOptions?.[q.id] : undefined}
                    />
                  ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-border">
                <Button
                  variant="ghost"
                  small
                  onClick={handlePrev}
                  disabled={currentSectionIdx === 0}
                >
                  <ArrowLeft size={12} />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {!isCompleted && (
                    <Button variant="secondary" small onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                      Save Progress
                    </Button>
                  )}
                  {isLastSection && !isCompleted ? (
                    <Button small onClick={() => setShowCompleteConfirm(true)}>
                      <Check size={12} />
                      Complete Assessment
                    </Button>
                  ) : (
                    <Button small onClick={handleNext} disabled={isLastSection}>
                      Next
                      <ArrowRight size={12} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-surface-border rounded-[10px] p-12 text-center">
              <ShieldCheck size={32} className="mx-auto text-text-light mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">No sections available</h3>
              <p className="text-xs text-text-muted">
                This framework does not have any sections configured. Please check the framework configuration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Question Field Component ---

function QuestionField({
  question,
  value,
  onChange,
  disabled,
  expandedHelp,
  onToggleHelp,
  editableOptions,
}: {
  question: Question;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled: boolean;
  expandedHelp: string | null;
  onToggleHelp: (id: string | null) => void;
  editableOptions?: EditableOption[];
}) {
  const stringValue = typeof value === "string" ? value : "";
  const arrayValue = Array.isArray(value) ? value : [];
  const showHelp = expandedHelp === question.id;

  // Use editable options if available, otherwise fall back to static options from the question
  const effectiveOptions = editableOptions
    ? editableOptions.map((o) => o.label)
    : question.options || [];

  return (
    <div className="group relative">
      <div className="flex items-start gap-2 mb-1.5">
        <label className="text-xs font-medium text-text-primary flex-1">
          <span className="text-[10px] text-text-light mr-1.5">{question.id}</span>
          {question.text}
        </label>
        <div className="flex items-center gap-1 shrink-0">
          {editableOptions && !disabled && (
            <EditableOptionsManager
              questionId={question.id}
              options={editableOptions}
            />
          )}
          {question.help_text && (
            <button
              type="button"
              onClick={() => onToggleHelp(showHelp ? null : question.id)}
              className="text-text-light hover:text-brand transition-colors cursor-pointer mt-0.5"
              title="Show help"
            >
              <HelpCircle size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Help text */}
      {showHelp && question.help_text && (
        <div className="mb-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
          {question.help_text}
          {question.legal_basis && (
            <div className="mt-1 text-[10px] text-blue-600">
              Legal basis: {question.legal_basis}
            </div>
          )}
        </div>
      )}

      {/* Input based on question type */}
      {question.type === "yes_no" && effectiveOptions.length > 0 ? (
        <div className="flex gap-2">
          {effectiveOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { if (!disabled) onChange(opt); }}
              disabled={disabled}
              className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                stringValue === opt
                  ? "bg-brand text-white border-brand"
                  : "border-surface-border hover:bg-gray-50 text-text-primary"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : question.type === "select" && effectiveOptions.length > 0 ? (
        <select
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-md border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-text-muted"
        >
          <option value="">-- Select --</option>
          {effectiveOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : question.type === "multi_select" && effectiveOptions.length > 0 ? (
        <div className="space-y-1.5">
          {effectiveOptions.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md border transition-colors text-xs ${
                arrayValue.includes(opt)
                  ? "bg-brand-light border-brand/20 text-brand"
                  : "border-surface-border hover:bg-gray-50 text-text-primary"
              } ${disabled ? "opacity-60" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={arrayValue.includes(opt)}
                onChange={(e) => {
                  if (disabled) return;
                  if (e.target.checked) {
                    onChange([...arrayValue, opt]);
                  } else {
                    onChange(arrayValue.filter((v: string) => v !== opt));
                  }
                }}
                disabled={disabled}
                className="sr-only"
              />
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                arrayValue.includes(opt) ? "bg-brand border-brand" : "border-gray-300"
              }`}>
                {arrayValue.includes(opt) && <Check size={8} className="text-white" />}
              </div>
              {opt}
            </label>
          ))}
        </div>
      ) : question.type === "textarea" ? (
        <textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          placeholder="Enter your response..."
          className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none disabled:bg-gray-50 disabled:text-text-muted"
        />
      ) : (
        <input
          type="text"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter your response..."
          className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-text-muted"
        />
      )}
    </div>
  );
}

// --- Editable Options Manager (inline CRUD for option lists) ---

function EditableOptionsManager({
  questionId,
  options,
}: {
  questionId: string;
  options: EditableOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newLabel.trim() || saving) return;
    setSaving(true);
    const result = await addOptionToList(questionId, newLabel.trim());
    setSaving(false);
    if (result.data) {
      setLocalOptions([...localOptions, { id: result.data.id, label: result.data.label, is_default: false }]);
      setNewLabel("");
      router.refresh();
    }
  }

  async function handleUpdate(id: string) {
    if (!editLabel.trim() || saving) return;
    setSaving(true);
    const result = await updateOptionInList(id, editLabel.trim());
    setSaving(false);
    if (!result.error) {
      setLocalOptions(localOptions.map((o) => o.id === id ? { ...o, label: editLabel.trim() } : o));
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (saving) return;
    setSaving(true);
    const result = await deleteOptionFromList(id);
    setSaving(false);
    if (!result.error) {
      setLocalOptions(localOptions.filter((o) => o.id !== id));
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text-light hover:text-brand transition-colors cursor-pointer mt-0.5"
        title="Edit options list"
      >
        <Settings size={13} />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-brand hover:text-brand-hover transition-colors cursor-pointer mt-0.5"
        title="Close editor"
      >
        <Settings size={13} />
      </button>
      <div className="absolute right-0 top-6 z-20 w-72 bg-white border border-surface-border rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-primary">Edit Options</span>
          <button type="button" onClick={() => setOpen(false)} className="text-text-light hover:text-text-primary cursor-pointer">
            <X size={12} />
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-auto mb-2">
          {localOptions.map((opt) => (
            <div key={opt.id} className="flex items-center gap-1.5">
              {editingId === opt.id ? (
                <>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(opt.id)}
                    className="flex-1 px-2 py-1 rounded border border-brand text-xs focus:outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={() => handleUpdate(opt.id)} className="text-green-600 hover:text-green-700 cursor-pointer" disabled={saving}>
                    <Check size={12} />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-text-light hover:text-text-primary cursor-pointer">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-text-primary truncate">{opt.label}</span>
                  <button
                    type="button"
                    onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}
                    className="text-text-light hover:text-brand cursor-pointer opacity-0 group-hover:opacity-100"
                    style={{ opacity: 1 }}
                  >
                    <RefreshCw size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(opt.id)}
                    className="text-text-light hover:text-red-500 cursor-pointer"
                    disabled={saving}
                  >
                    <X size={10} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add new option..."
            className="flex-1 px-2 py-1 rounded border border-surface-border text-xs focus:outline-none focus:ring-1 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim() || saving}
            className="px-2 py-1 bg-brand text-white rounded text-xs font-medium disabled:opacity-50 cursor-pointer hover:bg-brand-hover"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
    </>
  );
}
