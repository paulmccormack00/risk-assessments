"use client";

import { useState, useMemo, Fragment, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProcessingActivity, CoreActivity } from "@/lib/types";
import { ArrowUp, ArrowDown, Search, ChevronRight, Pencil, Plus, Building2, ChevronDown } from "lucide-react";
import { ProcessingActivityModal } from "@/components/forms/processing-activity-modal";
import {
  createRopaActivity,
  updateProcessingActivity,
  deleteProcessingActivity,
} from "../mapping/actions";
import { useRouter } from "next/navigation";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/constants";

type EnrichedPA = ProcessingActivity & {
  system_ids?: string[];
  system_names?: string[];
  entity_ids?: string[];
  entity_names?: string[];
};

interface Props {
  activities: EnrichedPA[];
  systems?: { id: string; name: string }[];
  entities?: { id: string; name: string; country: string }[];
  coreActivities?: CoreActivity[];
}

type SortKey = "ref_id" | "function" | "activity" | "system_names" | "entity_names" | "legal_basis" | "transfer" | "dpia_status" | "controller_or_processor";
type SortDir = "asc" | "desc";
type RoleFilter = "" | "Controller" | "Processor" | "Joint Controller";

const COMPACT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "ref_id", label: "ID" },
  { key: "function", label: "Function" },
  { key: "activity", label: "Processing Activity" },
  { key: "entity_names", label: "Entity" },
  { key: "system_names", label: "System(s)" },
  { key: "legal_basis", label: "Legal Basis" },
  { key: "transfer", label: "Transfer" },
  { key: "dpia_status", label: "DPIA" },
  { key: "controller_or_processor", label: "Role" },
];

const PROCESSOR_HIDDEN_COLUMNS: SortKey[] = ["legal_basis", "dpia_status"];

const assessmentColor: Record<string, "green" | "amber" | "red" | "gray"> = {
  done: "green",
  in_progress: "amber",
  not_started: "red",
  not_required: "gray",
};

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "Controller", label: "Controller" },
  { value: "Processor", label: "Processor" },
  { value: "Joint Controller", label: "Joint Controller" },
];

// Multi-select entity filter dropdown
function EntityFilterDropdown({
  entities,
  selected,
  onChange,
}: {
  entities: { id: string; name: string; country: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label = selected.length === 0
    ? "All Entities"
    : selected.length === 1
      ? entities.find((e) => e.id === selected[0])?.name || "1 entity"
      : `${selected.length} entities`;

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer min-w-[140px]"
      >
        <Building2 size={11} className="text-text-light shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown size={10} className={`text-text-light transition-transform ml-auto ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-surface-border rounded-lg shadow-lg z-50 min-w-[220px] max-h-[280px] overflow-y-auto py-1">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full px-3 py-1.5 text-left text-xs text-brand hover:bg-brand-light/30 cursor-pointer"
            >
              Clear selection
            </button>
          )}
          {entities.map((e) => (
            <label
              key={e.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(e.id)}
                onChange={() => toggle(e.id)}
                className="rounded border-gray-300 text-brand focus:ring-brand/20"
              />
              <span className="text-xs text-text-primary truncate">{e.name}</span>
              <span className="text-[10px] text-text-light ml-auto shrink-0">{e.country}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function RopaClient({ activities, systems, entities, coreActivities }: Props) {
  const [viewMode, setViewMode] = useState<"dashboard" | "register">("dashboard");
  const [sortKey, setSortKey] = useState<SortKey>("ref_id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPA, setEditPA] = useState<EnrichedPA | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterFunction, setFilterFunction] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterRole, setFilterRole] = useState<RoleFilter>("");
  const [filterEntities, setFilterEntities] = useState<string[]>([]);
  const [specialCatFilter, setSpecialCatFilter] = useState(false);
  const [dpiaFilter, setDpiaFilter] = useState(false);
  const [transferFilter, setTransferFilter] = useState(false);
  const router = useRouter();

  const allFunctions = useMemo(
    () => [...new Set(activities.map((a) => a.function))].sort(),
    [activities]
  );

  const filtered = useMemo(() => {
    let result = activities;
    if (filterFunction) {
      result = result.filter((a) => a.function === filterFunction);
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.activity.toLowerCase().includes(q) ||
          a.purpose?.toLowerCase().includes(q) ||
          a.ref_id?.toLowerCase().includes(q)
      );
    }
    if (filterRole) {
      result = result.filter((a) => a.controller_or_processor === filterRole);
    }
    if (filterEntities.length > 0) {
      result = result.filter((a) =>
        a.entity_ids?.some((eid) => filterEntities.includes(eid))
      );
    }
    if (transferFilter) {
      result = result.filter((a) => a.transfer);
    }
    if (specialCatFilter) {
      result = result.filter((a) =>
        a.special_categories?.length && a.special_categories.some((c) => c !== "None")
      );
    }
    if (dpiaFilter) {
      result = result.filter((a) =>
        a.dpia_status === "in_progress" || a.dpia_status === "not_started"
      );
    }
    return result;
  }, [activities, filterFunction, filterSearch, filterRole, filterEntities, transferFilter, specialCatFilter, dpiaFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string, bv: string;
      if (sortKey === "system_names") {
        av = a.system_names?.join(", ") || "";
        bv = b.system_names?.join(", ") || "";
      } else if (sortKey === "entity_names") {
        av = a.entity_names?.join(", ") || "";
        bv = b.entity_names?.join(", ") || "";
      } else if (sortKey === "legal_basis") {
        const aVal = a.legal_basis;
        const bVal = b.legal_basis;
        av = Array.isArray(aVal) ? aVal.join(", ") : (aVal || "");
        bv = Array.isArray(bVal) ? bVal.join(", ") : (bVal || "");
      } else {
        av = String(a[sortKey as keyof ProcessingActivity] ?? "");
        bv = String(b[sortKey as keyof ProcessingActivity] ?? "");
      }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const visibleColumns = useMemo(() => {
    if (filterRole === "Processor") {
      return COMPACT_COLUMNS.filter((col) => !PROCESSOR_HIDDEN_COLUMNS.includes(col.key));
    }
    return COMPACT_COLUMNS;
  }, [filterRole]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleCreate(formData: FormData) {
    await createRopaActivity(formData);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    if (!editPA) return;
    await updateProcessingActivity(editPA.id, formData);
    router.refresh();
  }

  async function handleDeletePA() {
    if (!editPA) return;
    if (!confirm(`Delete "${editPA.activity}"? This cannot be undone.`)) return;
    await deleteProcessingActivity(editPA.id);
    setEditPA(null);
    router.refresh();
  }

  function formatArray(val: string[] | string | null | undefined): string {
    if (!val) return "";
    if (Array.isArray(val)) return val.join(", ");
    return val;
  }

  function renderCompactCell(pa: EnrichedPA, key: SortKey) {
    switch (key) {
      case "ref_id":
        return <span className="font-semibold text-brand whitespace-nowrap">{pa.ref_id}</span>;
      case "function":
        return <Badge color="purple">{pa.function}</Badge>;
      case "activity":
        return <span className="font-medium text-text-primary">{pa.activity}</span>;
      case "entity_names": {
        const names = pa.entity_names || [];
        if (names.length === 0) return <span className="text-text-light">&mdash;</span>;
        if (names.length === 1) return <Badge color="green">{names[0].split(" (")[0]}</Badge>;
        return (
          <span className="flex items-center gap-1" title={names.join("\n")}>
            <Badge color="green">{names.length} entities</Badge>
          </span>
        );
      }
      case "system_names":
        return pa.system_names?.length
          ? <span className="text-text-muted">{pa.system_names.join(", ")}</span>
          : <span className="text-text-light">&mdash;</span>;
      case "legal_basis": {
        const lb = formatArray(pa.legal_basis);
        return lb ? <span className="text-text-muted">{lb}</span> : <span className="text-text-light">&mdash;</span>;
      }
      case "transfer":
        return pa.transfer ? <Badge color="amber">Yes</Badge> : <span className="text-text-light">No</span>;
      case "dpia_status": {
        const status = pa.dpia_status || "not_started";
        return <Badge color={assessmentColor[status] || "gray"}>{ASSESSMENT_STATUS_LABELS[status] || status}</Badge>;
      }
      case "controller_or_processor":
        return <span className="text-text-muted">{pa.controller_or_processor || "\u2014"}</span>;
      default:
        return null;
    }
  }

  function DetailField({ label, value, badge }: { label: string; value: string | null | undefined; badge?: "red" | "amber" | "green" | "gray" }) {
    const display = value || "\u2014";
    return (
      <div>
        <div className="text-[10px] font-semibold text-text-light uppercase tracking-wider mb-0.5">{label}</div>
        {badge && value ? (
          <Badge color={badge}>{display}</Badge>
        ) : (
          <div className={`text-xs ${value ? "text-text-primary" : "text-text-light"}`}>{display}</div>
        )}
      </div>
    );
  }

  const hasEntityData = activities.some((a) => a.entity_names && a.entity_names.length > 0);
  const filterEntityLabel = filterEntities.length > 0 && entities
    ? filterEntities.map((id) => entities.find((e) => e.id === id)?.name).filter(Boolean).join(", ")
    : null;

  // Dashboard stats
  const stats = useMemo(() => {
    const byFunction: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    const byEntity: Record<string, { name: string; country: string; count: number }> = {};
    let withTransfer = 0;
    let withSpecialCat = 0;
    let dpiaRequired = 0;

    activities.forEach((a) => {
      byFunction[a.function] = (byFunction[a.function] || 0) + 1;
      const role = a.controller_or_processor || "Unassigned";
      byRole[role] = (byRole[role] || 0) + 1;
      if (a.transfer) withTransfer++;
      if (a.special_categories?.length && a.special_categories.some((c) => c !== "None")) withSpecialCat++;
      if (a.dpia_status === "in_progress" || a.dpia_status === "not_started") dpiaRequired++;
      // Count per entity
      if (a.entity_ids?.length) {
        a.entity_ids.forEach((eid, idx) => {
          if (!byEntity[eid]) {
            const name = a.entity_names?.[idx] || eid;
            const entity = entities?.find((e) => e.id === eid);
            byEntity[eid] = { name: entity?.name || name.split(" (")[0], country: entity?.country || "", count: 0 };
          }
          byEntity[eid].count++;
        });
      }
    });

    return { byFunction, byRole, byEntity, withTransfer, withSpecialCat, dpiaRequired };
  }, [activities, entities]);

  function navigateToRegisterFiltered(entityId?: string, func?: string, role?: RoleFilter) {
    if (entityId) setFilterEntities([entityId]);
    if (func) setFilterFunction(func);
    if (role !== undefined) setFilterRole(role);
    setViewMode("register");
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">
            Processing Summary (RoPA)
          </h2>
          <p className="text-[13px] text-text-muted mt-1">
            {viewMode === "dashboard"
              ? <>Article 30 Overview &mdash; {activities.length} processing activities</>
              : <>Article 30 Register &mdash; {filtered.length} of {activities.length} records
                  {filterRole && <span className="ml-1">({filterRole} view)</span>}
                  {filterEntityLabel && <span className="ml-1">&mdash; {filterEntityLabel}</span>}
                </>
            }
          </p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "dashboard"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode("register")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "register"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Register
            </button>
          </div>
          {viewMode === "register" && (
            <Button icon={<Plus size={14} />} small onClick={() => setShowCreate(true)}>
              Add Activity
            </Button>
          )}
        </div>
      </div>

      {/* -- Dashboard View -- */}
      {viewMode === "dashboard" && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {([
              {
                label: "Total Activities",
                value: activities.length,
                color: "text-brand",
                onClick: () => { setFilterFunction(""); setFilterSearch(""); setFilterRole(""); setFilterEntities([]); setTransferFilter(false); setSpecialCatFilter(false); setDpiaFilter(false); setViewMode("register"); },
              },
              {
                label: "International Transfers",
                value: stats.withTransfer,
                color: "text-amber-600",
                onClick: () => { setFilterFunction(""); setFilterSearch(""); setFilterRole(""); setFilterEntities([]); setTransferFilter(true); setSpecialCatFilter(false); setDpiaFilter(false); setViewMode("register"); },
              },
              {
                label: "Special Categories",
                value: stats.withSpecialCat,
                color: "text-red-600",
                onClick: () => { setFilterFunction(""); setFilterSearch(""); setFilterRole(""); setFilterEntities([]); setTransferFilter(false); setSpecialCatFilter(true); setDpiaFilter(false); setViewMode("register"); },
              },
              {
                label: "DPIA Pending",
                value: stats.dpiaRequired,
                color: "text-orange-600",
                onClick: () => { setFilterFunction(""); setFilterSearch(""); setFilterRole(""); setFilterEntities([]); setTransferFilter(false); setSpecialCatFilter(false); setDpiaFilter(true); setViewMode("register"); },
              },
            ]).map((card) => (
              <button
                key={card.label}
                onClick={card.onClick}
                className="bg-white border border-surface-border rounded-[10px] p-4 text-left cursor-pointer hover:border-brand/30 hover:shadow-sm transition-all group"
              >
                <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider group-hover:text-brand transition-colors">{card.label}</div>
                <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* By Function */}
            <div className="bg-white border border-surface-border rounded-[10px] p-5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">By Function</div>
              <div className="space-y-2">
                {Object.entries(stats.byFunction).sort((a, b) => b[1] - a[1]).map(([func, count]) => {
                  const pct = activities.length ? Math.round((count / activities.length) * 100) : 0;
                  return (
                    <button
                      key={func}
                      onClick={() => navigateToRegisterFiltered(undefined, func)}
                      className="w-full text-left cursor-pointer hover:bg-brand-light/30 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-text-primary">{func}</span>
                        <span className="text-xs text-text-muted">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-purple-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* By Capacity */}
            <div className="bg-white border border-surface-border rounded-[10px] p-5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">By Capacity</div>
              <div className="space-y-2">
                {Object.entries(stats.byRole).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                  const pct = activities.length ? Math.round((count / activities.length) * 100) : 0;
                  return (
                    <button
                      key={role}
                      onClick={() => navigateToRegisterFiltered(undefined, undefined, role === "Unassigned" ? "" : role as RoleFilter)}
                      className="w-full text-left cursor-pointer hover:bg-brand-light/30 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-text-primary">{role}</span>
                        <span className="text-xs text-text-muted">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-brand"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* By Entity */}
            <div className="bg-white border border-surface-border rounded-[10px] p-5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">By Entity</div>
              {Object.keys(stats.byEntity).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(stats.byEntity).sort((a, b) => b[1].count - a[1].count).map(([eid, info]) => {
                    const pct = activities.length ? Math.round((info.count / activities.length) * 100) : 0;
                    return (
                      <button
                        key={eid}
                        onClick={() => navigateToRegisterFiltered(eid)}
                        className="w-full text-left cursor-pointer hover:bg-brand-light/30 rounded-lg p-2 transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="text-xs font-medium text-text-primary">{info.name}</span>
                            {info.country && <span className="text-[10px] text-text-light ml-1.5">{info.country}</span>}
                          </div>
                          <span className="text-xs text-text-muted">{info.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-green-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-text-light py-4 text-center">
                  No entities assigned yet. Edit activities to link them to legal entities.
                </div>
              )}
            </div>
          </div>

          {/* Unlinked activities warning */}
          {activities.length > 0 && (() => {
            const unlinked = activities.filter((a) => !a.entity_ids?.length).length;
            if (unlinked === 0) return null;
            return (
              <div className="mt-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>{unlinked} activit{unlinked === 1 ? "y" : "ies"}</strong> not linked to any entity.
                <button
                  onClick={() => { setFilterEntities([]); setViewMode("register"); }}
                  className="text-brand font-medium ml-1 hover:underline cursor-pointer"
                >
                  View in register
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* -- Register View -- */}
      {viewMode === "register" && (
      <>

      {/* Controller/Processor Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterRole(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterRole === tab.value
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterFunction}
          onChange={(e) => setFilterFunction(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Functions</option>
          {allFunctions.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        {entities && entities.length > 0 && (
          <EntityFilterDropdown
            entities={entities}
            selected={filterEntities}
            onChange={setFilterEntities}
          />
        )}
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-surface-border px-3 py-1.5">
          <Search size={12} className="text-text-light" />
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search activities..."
            className="border-none bg-transparent text-xs text-text-primary outline-none w-40 placeholder:text-text-light"
          />
        </div>
        {transferFilter && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
            International Transfers
            <button onClick={() => setTransferFilter(false)} className="hover:text-amber-900 cursor-pointer">&times;</button>
          </span>
        )}
        {specialCatFilter && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            Special Categories
            <button onClick={() => setSpecialCatFilter(false)} className="hover:text-red-900 cursor-pointer">&times;</button>
          </span>
        )}
        {dpiaFilter && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700 font-medium">
            DPIA Pending
            <button onClick={() => setDpiaFilter(false)} className="hover:text-orange-900 cursor-pointer">&times;</button>
          </span>
        )}
        {(filterFunction || filterSearch || filterEntities.length > 0 || transferFilter || specialCatFilter || dpiaFilter) && (
          <button
            onClick={() => { setFilterFunction(""); setFilterSearch(""); setFilterEntities([]); setTransferFilter(false); setSpecialCatFilter(false); setDpiaFilter(false); }}
            className="text-xs text-brand hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Processor view info banner */}
      {filterRole === "Processor" && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <strong>Article 30(2) view</strong> — Processor records require: categories of processing, transfers, and security measures. Some controller-only fields are hidden.
        </div>
      )}

      {/* Entity assignment hint */}
      {!hasEntityData && entities && entities.length > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Entity assignment</strong> — Processing activities can be linked to specific legal entities. Edit an activity and select entities to enable entity-scoped RoPA exports.
        </div>
      )}

      <div className="bg-white border border-surface-border rounded-[10px] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="w-8 border-b border-surface-border" />
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-3 py-2.5 text-left font-semibold text-text-muted text-[10px] uppercase tracking-wider border-b border-surface-border whitespace-nowrap cursor-pointer hover:text-brand select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc"
                        ? <ArrowUp size={10} className="text-brand" />
                        : <ArrowDown size={10} className="text-brand" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((pa) => {
              const isExpanded = expandedId === pa.id;
              return (
                <Fragment key={pa.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : pa.id)}
                    className={`cursor-pointer transition-colors ${isExpanded ? "bg-brand-light" : "hover:bg-brand-light/30"}`}
                  >
                    <td className="pl-3 py-2 border-b border-surface-border-light">
                      <ChevronRight
                        size={12}
                        className={`text-text-light transition-transform duration-200 ${isExpanded ? "rotate-90 text-brand" : ""}`}
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 border-b border-surface-border-light text-[11px]"
                      >
                        {renderCompactCell(pa, col.key)}
                      </td>
                    ))}
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="border-b border-surface-border bg-gray-50/50">
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                            <DetailField label="Purpose" value={pa.purpose} />
                            <DetailField label="Description" value={pa.description} />
                            {/* Show full entity list in expanded view */}
                            <div>
                              <div className="text-[10px] font-semibold text-text-light uppercase tracking-wider mb-0.5">Entities</div>
                              {pa.entity_names && pa.entity_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pa.entity_names.map((name) => (
                                    <Badge key={name} color="green">{name}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-text-light">{"\u2014"}</div>
                              )}
                            </div>
                            <DetailField label="Data Subjects" value={formatArray(pa.data_subjects)} />
                            <DetailField label="Personal Data Types" value={pa.data_types} />
                            <DetailField
                              label="Special Categories"
                              value={formatArray(pa.special_categories)}
                              badge={pa.special_categories?.length ? "red" : undefined}
                            />
                            <DetailField label="Retention Period" value={pa.retention_period} />
                            <DetailField label="Recipients" value={pa.recipients} />
                            <DetailField label="Source of Data" value={pa.source_of_data} />
                            <DetailField label="Transfer Countries" value={formatArray(pa.transfer_countries)} />
                            <DetailField label="Transfer Mechanism" value={pa.transfer_mechanism} />
                            <DetailField
                              label="TIA Status"
                              value={ASSESSMENT_STATUS_LABELS[pa.tia_status || "not_started"] || pa.tia_status}
                              badge={assessmentColor[pa.tia_status || "not_started"]}
                            />
                            <DetailField
                              label="Automated Decision Making"
                              value={pa.automated_decision_making ? "Yes" : "No"}
                              badge={pa.automated_decision_making ? "red" : undefined}
                            />
                            {pa.legitimate_interest_detail && (
                              <DetailField label="Legitimate Interest Detail" value={pa.legitimate_interest_detail} />
                            )}
                            {pa.notes && (
                              <DetailField label="Notes" value={pa.notes} />
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-surface-border-light flex gap-2">
                            <Button
                              small
                              icon={<Pencil size={12} />}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setEditPA(pa);
                              }}
                            >
                              Edit Activity
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            {activities.length === 0
              ? "No processing activities with RoPA references yet. Add an activity or complete data mapping to populate this view."
              : "No records match the current filters."}
          </div>
        )}
      </div>

      {/* Create PA Modal */}
      {showCreate && (
        <ProcessingActivityModal
          key="create-ropa"
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
        selectedEntityIds={editPA?.entity_ids}
        systems={systems}
        entities={entities}
        onSave={handleUpdate}
        onDelete={handleDeletePA}
      />
      </>
      )}
    </div>
  );
}
