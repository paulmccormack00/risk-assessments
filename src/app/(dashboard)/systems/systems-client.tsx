"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/ui/tier-badge";
import { Modal } from "@/components/ui/modal";
import type { System } from "@/lib/types";
import { Plus, X, Upload, Search, ArrowUp, ArrowDown, LayoutGrid, Table2 } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { ImportModal } from "@/components/forms/import-modal";
import { createSystem, updateSystem, deleteSystem, importSystems, updateSystemTier } from "./actions";
import { useRouter } from "next/navigation";
import { SENSITIVITIES, DPA_STATUSES, FUNCTIONS, SPECIAL_CATEGORIES } from "@/lib/constants";

interface Props {
  systems: System[];
}

const inputCls =
  "w-full px-3 py-2 rounded-md border border-surface-border text-sm bg-surface-bg focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelCls = "block text-sm font-medium text-text-primary mb-1";

const IMPORT_COLUMNS = [
  "System Name", "Department", "Owner", "Tier", "Sensitivity",
  "Personal Data", "Data Subjects", "Data Types", "Special Categories",
  "Storage Location", "DPA Status", "Vendor", "Third Party",
];

type SortKey = keyof System;
type SortDir = "asc" | "desc";

export function SystemsClient({ systems }: Props) {
  const [viewMode, setViewMode] = useState<"table" | "board">("table");
  const [selected, setSelected] = useState<System | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editSystem, setEditSystem] = useState<System | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterSensitivity, setFilterSensitivity] = useState("");
  const router = useRouter();

  // Track whether user has applied manual column sorting
  const [manualSort, setManualSort] = useState(false);
  // Local ordered list
  const [tableOrder, setTableOrder] = useState<System[]>(systems);

  // Sync tableOrder when systems prop changes
  useEffect(() => {
    setTableOrder(systems);
  }, [systems]);

  const filtered = useMemo(() => {
    let result = tableOrder;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.vendor?.toLowerCase().includes(q) ||
          s.owner?.toLowerCase().includes(q)
      );
    }
    if (filterDept) result = result.filter((s) => s.department === filterDept);
    if (filterTier) result = result.filter((s) => s.tier === parseInt(filterTier));
    if (filterSensitivity) result = result.filter((s) => s.sensitivity === filterSensitivity);
    return result;
  }, [tableOrder, filterSearch, filterDept, filterTier, filterSensitivity]);

  const sorted = useMemo(() => {
    if (!manualSort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else if (typeof av === "boolean" && typeof bv === "boolean") {
        cmp = av === bv ? 0 : av ? -1 : 1;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, manualSort]);

  function toggleSort(key: SortKey) {
    setManualSort(true);
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const allDepts = [...new Set(systems.map((s) => s.department).filter(Boolean))] as string[];
  const hasFilters = filterSearch || filterDept || filterTier || filterSensitivity;

  const sensitivityColor = (s: string | null) =>
    s === "High" ? "red" : s === "Medium" ? "amber" : "gray";
  const dpaColor = (d: string) =>
    d === "Yes" ? "green" : d === "No" ? "red" : "amber";

  async function handleCreate(formData: FormData) {
    await createSystem(formData);
    setShowForm(false);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    if (!editSystem) return;
    await updateSystem(editSystem.id, formData);
    setEditSystem(null);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete(system: System) {
    if (!confirm(`Delete system "${system.name}"? This cannot be undone.`)) return;
    await deleteSystem(system.id);
    setEditSystem(null);
    setSelected(null);
    router.refresh();
  }

  async function handleImport(rows: Record<string, string>[]) {
    const result = await importSystems(rows);
    if (!result.error) router.refresh();
    return result;
  }

  async function handleTierChange(systemId: string, newTier: number) {
    await updateSystemTier(systemId, newTier);
    router.refresh();
  }

  const tierColumns = [1, 2, 3, 4].map((tier) => ({
    tier,
    systems: sorted.filter((s) => s.tier === tier),
  }));

  const TIER_COLORS: Record<number, { bg: string; border: string; text: string; dot: string }> = {
    1: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
    2: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    3: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    4: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dot: "bg-gray-400" },
  };

  const TIER_LABELS: Record<number, string> = {
    1: "Service Delivery Critical",
    2: "Operationally Essential",
    3: "Business Efficiency",
    4: "Administrative",
  };

  const systemFormFields = (defaults?: System) => (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>System Name *</label>
        <input name="name" required defaultValue={defaults?.name} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Department</label>
          <select name="department" defaultValue={defaults?.department || ""} className={inputCls}>
            <option value="">Select...</option>
            {FUNCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Owner</label>
          <input name="owner" defaultValue={defaults?.owner || ""} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Tier</label>
          <select name="tier" defaultValue={defaults?.tier || 3} className={inputCls}>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sensitivity</label>
          <select name="sensitivity" defaultValue={defaults?.sensitivity || ""} className={inputCls}>
            <option value="">Select...</option>
            {SENSITIVITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>DPA Status</label>
          <select name="dpa_status" defaultValue={defaults?.dpa_status || "Not Assessed"} className={inputCls}>
            {DPA_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Personal Data</label>
          <select name="personal_data" defaultValue={defaults?.personal_data ? "true" : "false"} className={inputCls}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Data Subjects</label>
          <input name="data_subjects" defaultValue={defaults?.data_subjects || ""} placeholder="e.g. Employees, Contractors" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Vendor</label>
          <input name="vendor" defaultValue={defaults?.vendor || ""} placeholder="e.g. Microsoft, SAP" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Third Party?</label>
          <select name="is_third_party" defaultValue={defaults?.is_third_party ? "true" : "false"} className={inputCls}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      </div>

      {/* Extended fields — only in edit mode */}
      {defaults && (
        <>
          <div className="border-t border-surface-border-light pt-3 mt-4">
            <div className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">Data Details</div>
          </div>
          <div>
            <label className={labelCls}>Data Types</label>
            <input name="data_types" defaultValue={defaults.data_types || ""} placeholder="e.g. Name, Email, NI Number" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Special Categories</label>
            <select name="special_categories" defaultValue={defaults.special_categories || ""} className={inputCls}>
              <option value="">None</option>
              {SPECIAL_CATEGORIES.filter((c) => c !== "None").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Storage Location</label>
            <input name="storage_location" defaultValue={defaults.storage_location || ""} placeholder="e.g. EU, UK, US" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Operational Tier</label>
              <select name="operational_tier" defaultValue={defaults.operational_tier || ""} className={inputCls}>
                <option value="">Not assessed</option>
                {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data Sensitivity Tier</label>
              <select name="data_sensitivity_tier" defaultValue={defaults.data_sensitivity_tier || ""} className={inputCls}>
                <option value="">Not assessed</option>
                {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" rows={3} defaultValue={defaults.notes || ""} className={inputCls} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">
            System Inventory
          </h2>
          <p className="text-[13px] text-text-muted mt-1">
            {filtered.length === systems.length
              ? `${systems.length} systems`
              : `${filtered.length} of ${systems.length} systems`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "table"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Table view"
            >
              <Table2 size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "board"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Board view"
            >
              <LayoutGrid size={14} /> Board
            </button>
          </div>
          <Button variant="secondary" icon={<Upload size={14} />} small onClick={() => setShowImport(true)}>
            Import
          </Button>
          <Button icon={<Plus size={14} />} small onClick={() => setShowForm(true)}>
            Add System
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-surface-border px-3 py-1.5">
          <Search size={12} className="text-text-light" />
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search systems..."
            className="border-none bg-transparent text-xs text-text-primary outline-none w-36 placeholder:text-text-light"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Departments</option>
          {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Tiers</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select
          value={filterSensitivity}
          onChange={(e) => setFilterSensitivity(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-xs bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Sensitivity</option>
          {SENSITIVITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterSearch(""); setFilterDept(""); setFilterTier(""); setFilterSensitivity(""); }}
            className="text-xs text-brand hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Board View — static tiles (no drag-and-drop) */}
      {viewMode === "board" && (
        <div className="grid grid-cols-4 gap-4">
          {tierColumns.map(({ tier, systems: tierSystems }) => {
            const colors = TIER_COLORS[tier];
            return (
              <div key={tier} className={`rounded-[10px] border ${colors.border} ${colors.bg} p-3 min-h-[300px]`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    Tier {tier}
                  </span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {tierSystems.length}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted px-1 mb-2">
                  {TIER_LABELS[tier]}
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {tierSystems.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="bg-white rounded-lg border border-surface-border p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <div className="text-xs font-medium text-text-primary mb-1">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.department && (
                          <span className="text-[10px] text-text-muted">{s.department}</span>
                        )}
                        {s.sensitivity && (
                          <Badge color={sensitivityColor(s.sensitivity)}>
                            {s.sensitivity}
                          </Badge>
                        )}
                        <Badge color={s.personal_data ? "green" : "gray"}>
                          {s.personal_data ? "PD" : "No PD"}
                        </Badge>
                      </div>
                      {s.vendor && (
                        <div className="text-[10px] text-text-light mt-1">{s.vendor}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
      <div className="bg-white border border-surface-border rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50/80">
                {([
                  { key: "name" as SortKey, label: "System Name" },
                  { key: "department" as SortKey, label: "Department" },
                  { key: "owner" as SortKey, label: "Owner" },
                  { key: "tier" as SortKey, label: "Tier" },
                  { key: "sensitivity" as SortKey, label: "Sensitivity" },
                  { key: "personal_data" as SortKey, label: "Personal Data" },
                  { key: "data_subjects" as SortKey, label: "Data Subjects" },
                ]).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-3.5 py-2.5 text-left font-semibold text-text-muted text-[11px] uppercase tracking-wider border-b border-surface-border cursor-pointer hover:text-brand select-none"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && manualSort && (
                        sortDir === "asc"
                          ? <ArrowUp size={10} className="text-brand" />
                          : <ArrowDown size={10} className="text-brand" />
                      )}
                    </span>
                  </th>
                ))}
                <th
                  onClick={() => toggleSort("dpa_status")}
                  className="px-3.5 py-2.5 text-left font-semibold text-text-muted text-[11px] uppercase tracking-wider border-b border-surface-border cursor-pointer hover:text-brand select-none"
                >
                  <Tooltip content="Data Processing Agreement — whether a DPA is in place with the vendor/processor for this system.">
                    <span className="flex items-center gap-1 cursor-help">
                      DPA Status
                      {sortKey === "dpa_status" && manualSort && (
                        sortDir === "asc"
                          ? <ArrowUp size={10} className="text-brand" />
                          : <ArrowDown size={10} className="text-brand" />
                      )}
                    </span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer hover:bg-brand-light/50 transition-colors"
                >
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light font-medium text-brand">
                    {s.name}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-muted">
                    {s.department || "\u2014"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-primary">
                    {s.owner || "\u2014"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light">
                    <TierBadge tier={s.tier} />
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light">
                    <Badge color={sensitivityColor(s.sensitivity)}>
                      {s.sensitivity || "\u2014"}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light">
                    <Badge color={s.personal_data ? "green" : "gray"}>
                      {s.personal_data ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-muted text-xs">
                    {s.data_subjects || "\u2014"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-surface-border-light">
                    <Badge color={dpaColor(s.dpa_status)}>{s.dpa_status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Detail Side Panel */}
      {selected && (
        <div className="fixed top-0 right-0 w-[420px] h-screen bg-white border-l border-surface-border shadow-xl z-50 overflow-auto p-7">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-bold text-text-primary">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="bg-brand-light rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-brand mb-2">System Classification</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Composite Tier", `Tier ${selected.tier}`],
                ["Operational Tier", selected.operational_tier ? `Tier ${selected.operational_tier}` : "Not assessed"],
                ["Data Sensitivity", selected.data_sensitivity_tier ? `Tier ${selected.data_sensitivity_tier}` : "Not assessed"],
                ["DPA Status", selected.dpa_status],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-text-muted">{k}</div>
                  <div className="text-[13px] font-medium text-text-primary">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-text-muted mb-3">System Details</div>
          {[
            ["Department", selected.department || "\u2014"],
            ["Owner", selected.owner || "\u2014"],
            ["Vendor", selected.vendor || "\u2014"],
            ["Third Party", selected.is_third_party ? "Yes" : "No"],
            ["Personal Data", selected.personal_data ? "Yes" : "No"],
            ["Sensitivity", selected.sensitivity || "\u2014"],
            ["Data Subjects", selected.data_subjects || "\u2014"],
            ["Data Types", selected.data_types || "\u2014"],
            ["Special Categories", selected.special_categories || "\u2014"],
            ["Storage Location", selected.storage_location || "\u2014"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-surface-border-light">
              <span className="text-[13px] text-text-muted">{k}</span>
              <span className="text-[13px] font-medium text-text-primary text-right max-w-[200px]">{v}</span>
            </div>
          ))}

          {selected.notes && (
            <div className="mt-3">
              <div className="text-[11px] text-text-muted mb-1">Notes</div>
              <div className="text-[13px] text-text-primary bg-gray-50 rounded p-2">{selected.notes}</div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button small variant="secondary" onClick={() => setEditSystem(selected)}>
              Edit System
            </Button>
            <Button small variant="danger" onClick={() => handleDelete(selected)}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Add System Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add System">
        <form action={handleCreate}>
          {systemFormFields()}
          <div className="flex gap-2 mt-6 justify-end">
            <Button type="button" variant="secondary" small onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" small>Create System</Button>
          </div>
        </form>
      </Modal>

      {/* Edit System Modal */}
      <Modal open={!!editSystem} onClose={() => setEditSystem(null)} title="Edit System" wide>
        {editSystem && (
          <form action={handleUpdate}>
            {systemFormFields(editSystem)}
            <div className="flex gap-2 mt-6 justify-between">
              <Button type="button" variant="danger" small onClick={() => handleDelete(editSystem)}>
                Delete System
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" small onClick={() => setEditSystem(null)}>Cancel</Button>
                <Button type="submit" small>Save Changes</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Systems"
        expectedColumns={IMPORT_COLUMNS}
        onImport={handleImport}
      />
    </div>
  );
}
