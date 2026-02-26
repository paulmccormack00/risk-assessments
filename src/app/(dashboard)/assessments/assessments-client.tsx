"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, Plus, Clock, CheckCircle, FileText, AlertTriangle,
  ChevronRight, Trash2, Loader2, Link as LinkIcon, X,
} from "lucide-react";
import { createAssessment, deleteAssessment } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Framework {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  is_system: boolean;
}

interface Assessment {
  id: string;
  title: string;
  status: string;
  risk_score: number | null;
  risk_classification: string | null;
  created_at: string;
  completed_at: string | null;
  entity_id: string | null;
  linked_system_id: string | null;
  linked_pa_id: string | null;
  validated_at: string | null;
  validated_by: string | null;
  metadata?: Record<string, unknown> | null;
  framework: { name: string; slug: string } | null;
  entity: { id: string; name: string } | null;
  system: { id: string; name: string } | null;
  pa: { id: string; activity: string } | null;
}

interface Props {
  assessments: Assessment[];
  frameworks: Framework[];
  entities: { id: string; name: string }[];
  systems: { id: string; name: string }[];
  processingActivities: { id: string; activity: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeColor: "gray" | "blue" | "green" | "amber" | "teal"; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "text-gray-500 bg-gray-50 border-gray-200", badgeColor: "gray", icon: FileText },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200", badgeColor: "blue", icon: Clock },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200", badgeColor: "green", icon: CheckCircle },
  validated: { label: "Validated", color: "text-teal-600 bg-teal-50 border-teal-200", badgeColor: "teal", icon: ShieldCheck },
  awaiting_review: { label: "Awaiting Review", color: "text-amber-600 bg-amber-50 border-amber-200", badgeColor: "amber", icon: AlertTriangle },
};

export function AssessmentsClient({
  assessments, frameworks, entities, systems, processingActivities,
}: Props) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedFramework, setSelectedFramework] = useState(() => {
    const unified = frameworks.find((f) => f.slug === "complio-unified-v1");
    return unified ? unified.id : "";
  });
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedPA, setSelectedPA] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Creation wizard steps
  const [creationStep, setCreationStep] = useState(0);

  // Auto-suggest title when framework changes
  useEffect(() => {
    if (!selectedFramework) return;
    const fw = frameworks.find((f) => f.id === selectedFramework);
    if (!fw) return;

    const parts: string[] = [];
    parts.push(fw.name);

    const entityName = selectedEntity
      ? entities.find((e) => e.id === selectedEntity)?.name
      : null;
    if (entityName) parts.push(entityName);

    const systemName = selectedSystem
      ? systems.find((s) => s.id === selectedSystem)?.name
      : null;
    if (systemName) parts.push(systemName);

    const paName = selectedPA
      ? processingActivities.find((p) => p.id === selectedPA)?.activity
      : null;
    if (paName) parts.push(paName);

    setNewTitle(parts.join(" - "));
  }, [selectedFramework, selectedEntity, selectedSystem, selectedPA, frameworks, entities, systems, processingActivities]);

  async function handleCreate() {
    if (!selectedFramework || !newTitle.trim()) return;
    setCreating(true);
    setError(null);

    const links = {
      entity_id: selectedEntity || null,
      linked_system_id: selectedSystem || null,
      linked_pa_id: selectedPA || null,
    };

    const result = await createAssessment(selectedFramework, newTitle.trim(), links);
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setShowNew(false);
      resetNewForm();
      router.push(`/assessments/${result.data.id}`);
    }
  }

  function resetNewForm() {
    setNewTitle("");
    const unified = frameworks.find((f) => f.slug === "complio-unified-v1");
    setSelectedFramework(unified ? unified.id : "");
    setSelectedEntity("");
    setSelectedSystem("");
    setSelectedPA("");
    setCreationStep(0);
    setError(null);
  }

  async function handleArchive(id: string) {
    setArchivingId(id);
    const result = await deleteAssessment(id);
    setArchivingId(null);
    setShowDeleteConfirm(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  const filteredAssessments = useMemo(() => {
    if (statusFilter === "all") return assessments;
    return assessments.filter((a) => a.status === statusFilter);
  }, [assessments, statusFilter]);

  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => a.status === "in_progress" || a.status === "draft").length,
    completed: assessments.filter((a) => a.status === "completed").length,
    validated: assessments.filter((a) => a.status === "validated").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Assessments</h2>
          <p className="text-[13px] text-text-muted mt-1">
            Privacy impact assessments, compliance reviews, and risk evaluations
          </p>
        </div>
        <Button onClick={() => { resetNewForm(); setShowNew(true); }} icon={<Plus size={14} />}>
          New Assessment
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle size={14} />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer text-sm">&times;</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-brand" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Validated", value: stats.validated, color: "text-teal-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-surface-border rounded-[10px] p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-muted">Filter:</span>
        {[
          { value: "all", label: "All" },
          { value: "draft", label: "Draft" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
          { value: "validated", label: "Validated" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === f.value
                ? "bg-brand text-white"
                : "bg-gray-100 text-text-muted hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New Assessment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowNew(false); resetNewForm(); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-1">Start New Assessment</h3>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-5">
              {["Framework", "Linking", "Details"].map((step, idx) => (
                <button
                  key={step}
                  onClick={() => idx <= creationStep ? setCreationStep(idx) : undefined}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    idx === creationStep
                      ? "bg-brand text-white"
                      : idx < creationStep
                        ? "bg-brand-light text-brand"
                        : "bg-gray-100 text-text-light"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0" style={{
                    borderColor: idx <= creationStep ? "transparent" : undefined,
                    backgroundColor: idx < creationStep ? "white" : undefined,
                    color: idx < creationStep ? "var(--color-brand)" : undefined,
                  }}>
                    {idx < creationStep ? <CheckCircle size={10} /> : idx + 1}
                  </span>
                  {step}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Step 0: Framework Selection */}
              {creationStep === 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-2">Select Framework</label>
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {frameworks.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => setSelectedFramework(fw.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedFramework === fw.id
                            ? "border-brand bg-brand-light"
                            : "border-surface-border hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-text-primary">{fw.name}</div>
                          <span className="text-[10px] text-text-muted">v{fw.version}</span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">{fw.description}</div>
                      </button>
                    ))}
                    {frameworks.length === 0 && (
                      <p className="text-xs text-text-muted py-4 text-center">
                        No frameworks available. Run the seed script to load assessment templates.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Link to entity / system / PA */}
              {creationStep === 1 && (
                <div className="space-y-4">
                  {selectedFramework && (
                    <div className="flex items-center justify-between p-2 bg-brand-light rounded-lg border border-brand/20">
                      <span className="text-xs font-medium text-brand">
                        {frameworks.find((f) => f.id === selectedFramework)?.name || "Selected framework"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCreationStep(0)}
                        className="text-[10px] text-brand hover:text-brand-hover underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Link to records <span className="text-text-light">(optional)</span>
                  </label>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-1 font-medium">Entity</label>
                    <select
                      value={selectedEntity}
                      onChange={(e) => setSelectedEntity(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                    >
                      <option value="">-- None --</option>
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-1 font-medium">System</label>
                    <select
                      value={selectedSystem}
                      onChange={(e) => setSelectedSystem(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                    >
                      <option value="">-- None --</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-1 font-medium">Processing Activity</label>
                    <select
                      value={selectedPA}
                      onChange={(e) => setSelectedPA(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                    >
                      <option value="">-- None --</option>
                      {processingActivities.map((p) => (
                        <option key={p.id} value={p.id}>{p.activity}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Assessment Title */}
              {creationStep === 2 && (
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Assessment Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. DPIA for new CRM system"
                    className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  {selectedFramework && (
                    <p className="text-[10px] text-text-light mt-1">
                      Auto-suggested based on selected framework and linked items.
                    </p>
                  )}

                  {/* Summary of selections */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-surface-border-light">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Summary</div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-text-light">Framework:</span>{" "}
                        <span className="text-text-primary font-medium">
                          {frameworks.find((f) => f.id === selectedFramework)?.name || "None"}
                        </span>
                      </div>
                      {selectedEntity && (
                        <div>
                          <span className="text-text-light">Entity:</span>{" "}
                          <span className="text-text-primary">
                            {entities.find((e) => e.id === selectedEntity)?.name}
                          </span>
                        </div>
                      )}
                      {selectedSystem && (
                        <div>
                          <span className="text-text-light">System:</span>{" "}
                          <span className="text-text-primary">
                            {systems.find((s) => s.id === selectedSystem)?.name}
                          </span>
                        </div>
                      )}
                      {selectedPA && (
                        <div>
                          <span className="text-text-light">Processing Activity:</span>{" "}
                          <span className="text-text-primary">
                            {processingActivities.find((p) => p.id === selectedPA)?.activity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-2">
                <div>
                  {creationStep > 0 && (
                    <Button
                      variant="ghost"
                      small
                      onClick={() => setCreationStep(creationStep - 1)}
                    >
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    small
                    onClick={() => { setShowNew(false); resetNewForm(); }}
                  >
                    Cancel
                  </Button>
                  {creationStep < 2 ? (
                    <Button
                      small
                      onClick={() => setCreationStep(creationStep + 1)}
                      disabled={creationStep === 0 && !selectedFramework}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !selectedFramework || !newTitle.trim()}
                      small
                    >
                      {creating ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Start Assessment"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-2">Archive Assessment</h3>
            <p className="text-xs text-text-muted mb-4">
              Are you sure you want to archive this assessment? It will no longer appear in the list but can be recovered later.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" small onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                small
                onClick={() => handleArchive(showDeleteConfirm)}
                disabled={archivingId === showDeleteConfirm}
              >
                {archivingId === showDeleteConfirm ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Archiving...
                  </>
                ) : (
                  "Archive"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment List */}
      {filteredAssessments.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-[10px] p-12 text-center">
          <ShieldCheck size={32} className="mx-auto text-text-light mb-3" />
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {statusFilter !== "all" ? "No assessments match this filter" : "No assessments yet"}
          </h3>
          <p className="text-xs text-text-muted mb-4">
            {statusFilter !== "all"
              ? "Try a different filter or create a new assessment."
              : "Start a new assessment to evaluate compliance risks for your processing activities, systems, or vendors."}
          </p>
          {statusFilter === "all" && (
            <Button onClick={() => { resetNewForm(); setShowNew(true); }} small>
              Start First Assessment
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssessments.map((a) => {
            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const linkedItems = getLinkedItems(a);
            return (
              <div
                key={a.id}
                onClick={() => router.push(`/assessments/${a.id}`)}
                className="bg-white border border-surface-border rounded-[10px] p-4 cursor-pointer transition-all group hover:border-brand/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <StatusIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-primary truncate">{a.title}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-text-muted">
                          {a.framework?.name || "Custom"}
                        </span>
                        <span className="text-[10px] text-text-light">
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {linkedItems.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <LinkIcon size={9} className="text-text-light shrink-0" />
                          {linkedItems.map((link, idx) => (
                            <span key={idx}>
                              <Link
                                href={link.href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-brand hover:text-brand-hover hover:underline"
                              >
                                {link.label}
                              </Link>
                              {idx < linkedItems.length - 1 && (
                                <span className="text-[10px] text-text-light mx-0.5">/</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {a.status === "validated" && a.validated_at && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-teal-600">
                          <ShieldCheck size={9} className="shrink-0" />
                          <span>
                            Validated on {new Date(a.validated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.risk_classification && (
                      <Badge color={a.risk_classification === "high" ? "red" : a.risk_classification === "medium" ? "amber" : "green"}>
                        {a.risk_classification.toUpperCase()} RISK
                      </Badge>
                    )}
                    {a.risk_score !== null && (
                      <span className="text-xs font-mono text-text-muted">{a.risk_score}%</span>
                    )}
                    <Badge color={cfg.badgeColor}>
                      {cfg.label}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(a.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-text-light hover:text-red-500 transition-all cursor-pointer"
                      title="Archive assessment"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} className="text-text-light" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Build linked items for an assessment */
function getLinkedItems(a: Assessment): { label: string; href: string }[] {
  const items: { label: string; href: string }[] = [];
  if (a.entity) {
    items.push({ label: a.entity.name, href: `/entities?highlight=${a.entity.id}` });
  }
  if (a.system) {
    items.push({ label: a.system.name, href: `/systems?highlight=${a.system.id}` });
  }
  if (a.pa) {
    items.push({ label: a.pa.activity, href: `/mapping?highlight=${a.pa.id}` });
  }
  return items;
}
