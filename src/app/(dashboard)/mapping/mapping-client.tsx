"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoreActivity, ProcessingActivity } from "@/lib/types";
import { Plus, ChevronRight, ChevronDown, Upload, Settings, Trash2, Search, Pencil, Check, X as XIcon } from "lucide-react";
import { ProcessingActivityModal } from "@/components/forms/processing-activity-modal";
import { ImportModal } from "@/components/forms/import-modal";
import { Modal } from "@/components/ui/modal";
import {
  createProcessingActivity,
  updateProcessingActivity,
  deleteProcessingActivity,
  importProcessingActivities,
} from "./actions";
import { addCustomFunction, deleteCustomFunction, renameCustomFunction, countPAsUsingFunction, editFunction, deleteFunction } from "./function-actions";
import { useRouter } from "next/navigation";
import { FUNCTIONS } from "@/lib/constants";

type EnrichedPA = ProcessingActivity & { system_ids?: string[]; system_names?: string[] };

interface Props {
  coreActivities: (Omit<CoreActivity, "processing_activities"> & { processing_activities: EnrichedPA[] })[];
  systems?: { id: string; name: string }[];
  entities?: { id: string; name: string; country: string }[];
  customFunctions?: { id: string; name: string }[];
}

const IMPORT_COLUMNS = [
  "Function", "Processing Activity", "Description", "Purpose",
  "Data Subjects", "Personal Data Categories", "Special Categories",
  "Legal Basis", "Retention Period", "Recipients",
  "International Transfer", "Transfer Countries", "Transfer Mechanism",
  "Source of Data", "Controller/Processor", "Automated Decision Making", "Notes",
];

/** Check if a PA has all key fields filled */
function isPAComplete(pa: EnrichedPA): boolean {
  const hasLegalBasis = pa.legal_basis && pa.legal_basis.length > 0;
  const hasDataTypes = !!pa.data_types;
  return !!(hasLegalBasis && hasDataTypes);
}

export function MappingClient({ coreActivities, systems, entities, customFunctions = [] }: Props) {
  const viewMode = "mapping" as const;
  const [expanded, setExpanded] = useState<number>(-1);
  const [functionFilter, setFunctionFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editPA, setEditPA] = useState<EnrichedPA | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFunctionManager, setShowFunctionManager] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState("");
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [editingFunctionName, setEditingFunctionName] = useState("");
  const [functionError, setFunctionError] = useState<string | null>(null);
  // State for editing standard (platform default) functions inline
  const [editingStdFunction, setEditingStdFunction] = useState<string | null>(null);
  const [editingStdFunctionName, setEditingStdFunctionName] = useState("");

  // Track which function groups are collapsed (by function name) - all collapsed by default
  const [collapsedFunctions, setCollapsedFunctions] = useState<Set<string>>(() => {
    const allFns = new Set<string>();
    for (const ca of coreActivities) {
      allFns.add(ca.function || "Unassigned");
    }
    for (const cf of customFunctions) {
      allFns.add(cf.name);
    }
    return allFns;
  });

  const router = useRouter();

  const filtered = functionFilter
    ? coreActivities.filter((ca) => ca.function === functionFilter)
    : coreActivities;

  const allFunctions = [...new Set(coreActivities.map((ca) => ca.function))];

  // Merge built-in functions with custom functions for dropdowns
  const allAvailableFunctions = [...new Set([...FUNCTIONS, ...customFunctions.map((cf) => cf.name), ...allFunctions])].sort();

  // --- Search/filter: apply search query across PAs within core activities ---
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered
      .map((ca) => ({
        ...ca,
        processing_activities: ca.processing_activities.filter((pa) => {
          const activityMatch = pa.activity?.toLowerCase().includes(q);
          const legalBasisMatch = pa.legal_basis?.some((lb) => lb.toLowerCase().includes(q));
          const dataTypesMatch = pa.data_types?.toLowerCase().includes(q);
          const functionMatch = ca.function?.toLowerCase().includes(q);
          const descriptionMatch = pa.description?.toLowerCase().includes(q);
          return activityMatch || legalBasisMatch || dataTypesMatch || functionMatch || descriptionMatch;
        }),
      }))
      .filter((ca) => ca.processing_activities.length > 0 || ca.function?.toLowerCase().includes(searchQuery.toLowerCase()) || ca.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [filtered, searchQuery]);

  // --- Group PAs by function ---
  const groupedByFunction = useMemo(() => {
    const groups: Record<string, {
      coreActivities: typeof searchFiltered;
      totalPAs: number;
      completePAs: number;
    }> = {};

    // Seed empty groups for custom functions so they appear even with no PAs
    for (const cf of customFunctions) {
      if (!groups[cf.name]) {
        groups[cf.name] = { coreActivities: [], totalPAs: 0, completePAs: 0 };
      }
    }

    for (const ca of searchFiltered) {
      const fn = ca.function || "Unassigned";
      if (!groups[fn]) {
        groups[fn] = { coreActivities: [], totalPAs: 0, completePAs: 0 };
      }
      groups[fn].coreActivities.push(ca);
      groups[fn].totalPAs += ca.processing_activities.length;
      groups[fn].completePAs += ca.processing_activities.filter(isPAComplete).length;
    }

    // Sort function groups alphabetically
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map((fn) => ({
      functionName: fn,
      ...groups[fn],
    }));
  }, [searchFiltered, customFunctions]);

  const totalActivities = searchFiltered.reduce(
    (acc, ca) => acc + ca.processing_activities.length,
    0
  );

  function toggleFunctionGroup(fn: string) {
    setCollapsedFunctions((prev) => {
      const next = new Set(prev);
      if (next.has(fn)) {
        next.delete(fn);
      } else {
        next.add(fn);
      }
      return next;
    });
  }

  async function handleCreate(formData: FormData) {
    await createProcessingActivity(formData);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    if (!editPA) return;
    await updateProcessingActivity(editPA.id, formData);
    router.refresh();
  }

  async function handleImport(rows: Record<string, string>[]) {
    const result = await importProcessingActivities(rows);
    if (!result.error) router.refresh();
    return result;
  }

  async function handleDeletePA() {
    if (!editPA) return;
    if (!confirm(`Delete "${editPA.activity}"? This cannot be undone.`)) return;
    await deleteProcessingActivity(editPA.id);
    setEditPA(null);
    router.refresh();
  }

  async function handleAddFunction() {
    if (!newFunctionName.trim()) return;
    setFunctionError(null);
    const result = await addCustomFunction(newFunctionName.trim());
    if (result.error) {
      setFunctionError(result.error);
    } else {
      setNewFunctionName("");
      router.refresh();
    }
  }

  async function handleDeleteFunction(id: string, name: string) {
    setFunctionError(null);
    // Check if any PAs use this function
    const count = await countPAsUsingFunction(name);
    if (count > 0) {
      setFunctionError(`Cannot delete "${name}" -- ${count} processing ${count === 1 ? "activity uses" : "activities use"} this function. Reassign them first.`);
      return;
    }
    if (!confirm(`Remove custom function "${name}"?`)) return;
    await deleteCustomFunction(id);
    router.refresh();
  }

  async function handleRenameFunction(id: string) {
    if (!editingFunctionName.trim()) return;
    setFunctionError(null);
    const result = await renameCustomFunction(id, editingFunctionName.trim());
    if (result.error) {
      setFunctionError(result.error);
    } else {
      setEditingFunctionId(null);
      setEditingFunctionName("");
      router.refresh();
    }
  }

  function startEditFunction(cf: { id: string; name: string }) {
    setEditingFunctionId(cf.id);
    setEditingFunctionName(cf.name);
    setFunctionError(null);
  }

  function cancelEditFunction() {
    setEditingFunctionId(null);
    setEditingFunctionName("");
    setEditingStdFunction(null);
    setEditingStdFunctionName("");
    setFunctionError(null);
  }

  function startEditStdFunction(name: string) {
    setEditingStdFunction(name);
    setEditingStdFunctionName(name);
    setFunctionError(null);
  }

  async function handleRenameStdFunction(oldName: string) {
    if (!editingStdFunctionName.trim()) return;
    setFunctionError(null);
    const result = await editFunction(oldName, editingStdFunctionName.trim());
    if (result.error) {
      setFunctionError(result.error);
    } else {
      setEditingStdFunction(null);
      setEditingStdFunctionName("");
      router.refresh();
    }
  }

  async function handleDeleteStdFunction(name: string) {
    setFunctionError(null);
    const count = await countPAsUsingFunction(name);
    if (count > 0) {
      if (!confirm(`${count} processing ${count === 1 ? "activity uses" : "activities use"} the function "${name}". Deleting will remove the function label from these activities (set to "Unassigned"). Continue?`)) return;
    } else {
      if (!confirm(`Remove standard function "${name}"?`)) return;
    }
    const result = await deleteFunction(name);
    if (result.error) {
      setFunctionError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">
            Process & Data Mapping
          </h2>
          <p className="text-[13px] text-text-muted mt-1">
            {functionFilter || "All Functions"} &mdash; {searchFiltered.length} Core Activities, {totalActivities} Processing Activities
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === "mapping" && (
            <>
              <select
                value={functionFilter}
                onChange={(e) => { setFunctionFilter(e.target.value); setExpanded(0); }}
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="">All Functions</option>
                {allAvailableFunctions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <Button variant="secondary" icon={<Settings size={14} />} small onClick={() => setShowFunctionManager(true)}>
                Functions
              </Button>
              <Button variant="secondary" icon={<Upload size={14} />} small onClick={() => setShowImport(true)}>
                Import
              </Button>
              <Button icon={<Plus size={14} />} small onClick={() => setShowCreate(true)}>
                Add Activity
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Process Mapping View */}
      {viewMode === "mapping" && (
      <>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by activity name, legal basis, data types, or function..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-border text-sm bg-white text-text-primary placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Grouped by Function */}
      {groupedByFunction.map((group) => {
        const isCollapsed = collapsedFunctions.has(group.functionName);
        const completionPct = group.totalPAs > 0 ? Math.round((group.completePAs / group.totalPAs) * 100) : 0;

        return (
          <div key={group.functionName} className="mb-4">
            {/* Function Group Header */}
            <div
              onClick={() => toggleFunctionGroup(group.functionName)}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 border border-surface-border cursor-pointer hover:bg-gray-100 transition-colors mb-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-text-muted transition-transform duration-200">
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </span>
                <span className="text-sm font-semibold text-text-primary">{group.functionName}</span>
                <Badge color="purple">{group.totalPAs} {group.totalPAs === 1 ? "activity" : "activities"}</Badge>
              </div>
              <div className="flex items-center gap-3">
                {/* Completion indicator */}
                {group.totalPAs > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          completionPct === 100 ? "bg-status-green" : completionPct > 0 ? "bg-status-amber" : "bg-gray-300"
                        }`}
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${
                      completionPct === 100 ? "text-status-green" : completionPct > 0 ? "text-status-amber" : "text-text-light"
                    }`}>
                      {completionPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Function Group Content */}
            {!isCollapsed && (
              <div className="ml-3 border-l-2 border-surface-border pl-3">
                {group.coreActivities.length === 0 && (
                  <div className="bg-white border border-dashed border-surface-border rounded-[10px] mb-3 px-5 py-6 text-center">
                    <p className="text-sm text-text-light">No activities yet</p>
                    <p className="text-xs text-text-muted mt-1">
                      Click &quot;Add Activity&quot; and select this function to add processing activities here.
                    </p>
                  </div>
                )}
                {group.coreActivities.map((ca) => {
                  // Find global index for accordion expand
                  const globalIdx = searchFiltered.indexOf(ca);
                  return (
                    <div
                      key={ca.id}
                      className="bg-white border border-surface-border rounded-[10px] mb-3 overflow-hidden"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => setExpanded(expanded === globalIdx ? -1 : globalIdx)}
                        className={`px-5 py-3.5 flex justify-between items-center cursor-pointer transition-colors ${
                          expanded === globalIdx ? "bg-brand-light" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-brand transition-transform duration-200 ${
                              expanded === globalIdx ? "rotate-90" : ""
                            }`}
                          >
                            <ChevronRight size={14} />
                          </span>
                          <span className="text-sm font-semibold text-text-primary">
                            {ca.name}
                          </span>
                          <Badge color="gray">{ca.function}</Badge>
                        </div>
                        <Badge color="purple">
                          {ca.processing_activities.length} activities
                        </Badge>
                      </div>

                      {/* Accordion Content */}
                      {expanded === globalIdx && (
                        <div className="border-t border-surface-border-light">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50/80">
                                {["", "Processing Activity", "System(s)", "Data Types", "Special Cat.", "Legal Basis", "Retention", "Transfer"].map(
                                  (h) => (
                                    <th
                                      key={h}
                                      className={`px-3.5 py-2 text-left font-semibold text-text-muted text-[10px] uppercase tracking-wider border-b border-surface-border ${
                                        h === "" ? "w-6" : ""
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {ca.processing_activities.map((pa) => {
                                const complete = isPAComplete(pa);
                                return (
                                  <tr
                                    key={pa.id}
                                    onClick={() => setEditPA(pa)}
                                    className="cursor-pointer hover:bg-brand-light/50 transition-colors"
                                  >
                                    {/* Completion dot */}
                                    <td className="px-2 py-2 border-b border-surface-border-light">
                                      <span
                                        className={`inline-block w-2 h-2 rounded-full ${
                                          complete ? "bg-status-green" : "bg-status-amber"
                                        }`}
                                        title={complete ? "Complete" : "Incomplete -- missing legal basis or data types"}
                                      />
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light font-medium text-text-primary">
                                      {pa.activity}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light text-text-muted">
                                      {pa.system_names?.length ? pa.system_names.join(", ") : (
                                        <span className="text-text-light">&mdash;</span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light text-text-muted">
                                      {pa.data_types || (
                                        <span className="text-brand italic font-medium">
                                          Click to map...
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light">
                                      {pa.special_categories?.length ? (
                                        <div className="flex flex-wrap gap-0.5">
                                          {(Array.isArray(pa.special_categories) ? pa.special_categories : [pa.special_categories]).map((sc) => (
                                            <Badge key={sc} color="red">{sc}</Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-text-light">&mdash;</span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light text-text-primary">
                                      {pa.legal_basis?.length ? (
                                        Array.isArray(pa.legal_basis) ? pa.legal_basis.join(", ") : pa.legal_basis
                                      ) : (
                                        <span className="text-text-light">&mdash;</span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light text-text-muted">
                                      {pa.retention_period || (
                                        <span className="text-text-light">&mdash;</span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 border-b border-surface-border-light">
                                      {pa.transfer ? (
                                        <Badge color="amber">
                                          {pa.transfer_mechanism || "Yes"}
                                        </Badge>
                                      ) : (
                                        <span className="text-text-light">No</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {ca.processing_activities.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={8}
                                    className="px-3.5 py-6 text-center text-text-light text-sm"
                                  >
                                    No processing activities yet. Click &quot;Add Activity&quot; to start
                                    mapping.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {searchFiltered.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          {searchQuery ? (
            <>
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">
                Try adjusting your search query or clearing the filter.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No core activities defined</p>
              <p className="text-sm mt-1">
                Core activities will be pre-populated when an engagement is set up.
              </p>
            </>
          )}
        </div>
      )}

      {/* Create PA Modal -- key forces remount to reset state */}
      {showCreate && (
        <ProcessingActivityModal
          key="create-mapping"
          open
          onClose={() => setShowCreate(false)}
          coreActivities={coreActivities}
          systems={systems}
          entities={entities}
          onSave={handleCreate}
        />
      )}

      {/* Edit PA Modal */}
      <ProcessingActivityModal
        open={!!editPA}
        onClose={() => setEditPA(null)}
        activity={editPA}
        selectedSystemIds={editPA?.system_ids}
        systems={systems}
        entities={entities}
        onSave={handleUpdate}
        onDelete={handleDeletePA}
      />

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Processing Activities"
        expectedColumns={IMPORT_COLUMNS}
        onImport={handleImport}
      />

      {/* Function Manager Modal */}
      <Modal
        open={showFunctionManager}
        onClose={() => { setShowFunctionManager(false); setFunctionError(null); cancelEditFunction(); }}
        title="Manage Functions"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-muted mb-3">
              Functions group your processing activities by business area.
              The platform provides a standard set of functions common to most organisations.
              You can add custom functions below to reflect your specific organisational structure.
            </p>
          </div>

          {/* Error banner */}
          {functionError && (
            <div className="flex items-start gap-2 px-3 py-2 bg-status-red-light border border-red-200 rounded-lg text-xs text-status-red">
              <span className="shrink-0 mt-0.5">!</span>
              <span>{functionError}</span>
              <button onClick={() => setFunctionError(null)} className="ml-auto shrink-0 cursor-pointer hover:text-red-800">
                <XIcon size={12} />
              </button>
            </div>
          )}

          {/* Built-in functions */}
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Standard Functions (Platform Default)</div>
            <p className="text-[11px] text-text-light mb-2">These are available by default. You can rename or remove them.</p>
            <div className="space-y-1.5">
              {FUNCTIONS.map((f) => (
                <div key={f} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  {editingStdFunction === f ? (
                    /* Inline edit mode for standard function */
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editingStdFunctionName}
                        onChange={(e) => setEditingStdFunctionName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-md border border-surface-border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleRenameStdFunction(f); }
                          if (e.key === "Escape") { cancelEditFunction(); }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameStdFunction(f)}
                        className="text-status-green hover:text-green-700 cursor-pointer"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEditFunction}
                        className="text-text-muted hover:text-text-primary cursor-pointer"
                        title="Cancel"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <span className="text-xs font-medium text-text-muted">{f}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditStdFunction(f)}
                          className="text-text-light hover:text-text-primary cursor-pointer"
                          title="Rename function"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteStdFunction(f)}
                          className="text-red-300 hover:text-red-600 cursor-pointer"
                          title="Delete function"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom functions */}
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Custom Functions</div>
            {customFunctions.length > 0 ? (
              <div className="space-y-1.5">
                {customFunctions.map((cf) => (
                  <div key={cf.id} className="flex items-center justify-between px-3 py-1.5 bg-brand-light rounded-lg border border-brand/20">
                    {editingFunctionId === cf.id ? (
                      /* Inline edit mode */
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={editingFunctionName}
                          onChange={(e) => setEditingFunctionName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-md border border-surface-border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleRenameFunction(cf.id); }
                            if (e.key === "Escape") { cancelEditFunction(); }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameFunction(cf.id)}
                          className="text-status-green hover:text-green-700 cursor-pointer"
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEditFunction}
                          className="text-text-muted hover:text-text-primary cursor-pointer"
                          title="Cancel"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Display mode */
                      <>
                        <span className="text-xs font-medium text-brand">{cf.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEditFunction(cf)}
                            className="text-brand/60 hover:text-brand cursor-pointer"
                            title="Rename function"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteFunction(cf.id, cf.name)}
                            className="text-red-400 hover:text-red-600 cursor-pointer"
                            title="Delete function"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-light">No custom functions added yet.</p>
            )}
          </div>

          {/* Add new function */}
          <div className="border-t border-surface-border-light pt-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Add Function</div>
            <div className="flex gap-2">
              <input
                value={newFunctionName}
                onChange={(e) => setNewFunctionName(e.target.value)}
                placeholder="e.g. Research & Development"
                className="flex-1 px-3 py-2 rounded-md border border-surface-border text-sm bg-surface-bg focus:outline-none focus:ring-2 focus:ring-brand/20"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFunction(); } }}
              />
              <Button small onClick={handleAddFunction} icon={<Plus size={12} />}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      </>
      )}
    </div>
  );
}
