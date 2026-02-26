"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/ui/tier-badge";
import { Modal } from "@/components/ui/modal";
import type { Entity } from "@/lib/types";
import { Upload, Plus, X, Search, Network, ChevronRight, ChevronDown, Crown } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { createEntity, updateEntity, deleteEntity, setAsUltimateParent, importEntities } from "./actions";
import { useRouter } from "next/navigation";
import {
  ENTITY_STATUSES,
  DPO_REQUIREMENTS,
  PRIORITIES,
  CONTROLLER_REGISTRATION_STATUSES,
  TIER_CONFIG,
} from "@/lib/constants";
import { ImportModal } from "@/components/forms/import-modal";

interface Props {
  entities: Entity[];
}

interface TreeNode {
  entity: Entity;
  children: TreeNode[];
}

const ENTITY_IMPORT_COLUMNS = [
  "Entity Name", "Country", "Reg No", "Division", "Status", "Employees",
  "DPO Requirement", "Priority", "Tier", "DPO Appointed", "DPO Name",
  "DPO Email", "Registration Status", "Registration Ref",
  "Parent Company", "Ultimate Holding Company",
];

const inputCls =
  "w-full px-3 py-2 rounded-md border border-surface-border text-sm bg-surface-bg focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelCls = "block text-sm font-medium text-text-primary mb-1";

// ─── Tree Node Component ───────────────────────────────────────

function TreeNodeCard({
  node,
  entities,
  statusColor,
  onSelect,
}: {
  node: TreeNode;
  entities: Entity[];
  statusColor: (s: string) => "green" | "gray" | "amber";
  onSelect: (e: Entity) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li className="relative">
      <div className="flex items-start">
        {/* Expand/collapse toggle */}
        <div className="w-5 shrink-0 flex items-center justify-center pt-3">
          {hasChildren ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-text-muted hover:text-text-primary cursor-pointer"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <span className="block w-1.5 h-1.5 rounded-full bg-surface-border" />
          )}
        </div>
        {/* Node card */}
        <button
          type="button"
          onClick={() => onSelect(node.entity)}
          className="flex-1 text-left bg-white border border-surface-border rounded-lg p-3 hover:border-brand/40 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{node.entity.name}</span>
            <Badge color={statusColor(node.entity.status)}>{node.entity.status}</Badge>
            <TierBadge tier={node.entity.tier} />
          </div>
          <div className="text-xs text-text-muted mt-1">{node.entity.country}</div>
        </button>
      </div>
      {/* Children */}
      {hasChildren && !collapsed && (
        <ul className="ml-5 pl-4 border-l-2 border-surface-border mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNodeCard
              key={child.entity.id}
              node={child}
              entities={entities}
              statusColor={statusColor}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function EntitiesClient({ entities }: Props) {
  const [selected, setSelected] = useState<Entity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [structureView, setStructureView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const router = useRouter();

  // Filter state
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  // Ordered entities
  const [orderedEntities, setOrderedEntities] = useState(entities);

  // Keep ordered list in sync when entities prop changes
  useEffect(() => {
    setOrderedEntities(entities);
  }, [entities]);

  // Helper: look up entity name by id
  const entityNameById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return null;
      return entities.find((e) => e.id === id)?.name ?? null;
    },
    [entities]
  );

  // Unique countries for filter
  const allCountries = useMemo(
    () => [...new Set(entities.map((e) => e.country).filter(Boolean))].sort(),
    [entities]
  );

  // Apply filters
  const hasActiveFilters = filterSearch || filterStatus || filterTier || filterCountry;

  const filteredEntities = orderedEntities.filter((e) => {
    if (filterSearch && !e.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterTier && e.tier !== parseInt(filterTier)) return false;
    if (filterCountry && e.country !== filterCountry) return false;
    return true;
  });

  // Build tree from parent_entity_id relationships
  const treeRoots = useMemo(() => {
    const filteredIds = new Set(filteredEntities.map((e) => e.id));
    const nodeMap = new Map<string, TreeNode>();

    // Create a node for every filtered entity
    for (const e of filteredEntities) {
      nodeMap.set(e.id, { entity: e, children: [] });
    }

    const roots: TreeNode[] = [];

    for (const e of filteredEntities) {
      const node = nodeMap.get(e.id)!;
      if (e.parent_entity_id && filteredIds.has(e.parent_entity_id)) {
        nodeMap.get(e.parent_entity_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [filteredEntities]);

  const dpoColor = (dpo: string) =>
    dpo === "Mandatory" ? "red" : dpo === "Conditional" ? "amber" : "gray";
  const priorityColor = (p: string) =>
    p === "High" || p === "Critical" ? "red" : p === "Medium" ? "amber" : "gray";
  const statusColor = (s: string) =>
    s === "Active" ? "green" : s === "Dormant" ? "gray" : "amber";

  async function handleCreate(formData: FormData) {
    await createEntity(formData);
    setShowForm(false);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    if (!editEntity) return;
    await updateEntity(editEntity.id, formData);
    setEditEntity(null);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete(entity: Entity) {
    if (!confirm(`Delete entity "${entity.name}"? This cannot be undone.`)) return;
    await deleteEntity(entity.id);
    setEditEntity(null);
    setSelected(null);
    router.refresh();
  }

  async function handleSetUltimateParent(entity: Entity) {
    if (!confirm(`Set "${entity.name}" as the ultimate parent company for all entities?`)) return;
    await setAsUltimateParent(entity.id);
    setSelected(null);
    router.refresh();
  }

  async function handleImport(rows: Record<string, string>[]): Promise<{ error?: string; count?: number }> {
    try {
      const result = await importEntities(rows);
      router.refresh();
      return { count: result.count };
    } catch {
      return { error: "Import failed. Please try again." };
    }
  }

  const entityFormFields = (defaults?: Entity) => (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Entity Name *</label>
        <input name="name" required defaultValue={defaults?.name} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Country *</label>
          <input name="country" required defaultValue={defaults?.country} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Reg No</label>
          <input name="company_reg_no" defaultValue={defaults?.company_reg_no || ""} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={defaults?.status || "Active"} className={inputCls}>
            {ENTITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Employees</label>
          <input name="employees" type="number" defaultValue={defaults?.employees || 0} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>DPO Requirement</label>
          <select name="dpo_requirement" defaultValue={defaults?.dpo_requirement || "Not Assessed"} className={inputCls}>
            {DPO_REQUIREMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select name="priority" defaultValue={defaults?.priority || "Medium"} className={inputCls}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tier</label>
          <select name="tier" defaultValue={defaults?.tier || 3} className={inputCls}>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Division</label>
          <input name="division" defaultValue={defaults?.division || ""} className={inputCls} />
        </div>
      </div>

      {/* Corporate structure fields */}
      <div className="border-t border-surface-border-light pt-3 mt-4">
        <div className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">Corporate Structure</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Parent Company</label>
          <select
            name="parent_entity_id"
            defaultValue={defaults?.parent_entity_id || ""}
            className={inputCls}
          >
            <option value="">-- None --</option>
            {entities
              .filter((e) => !defaults || e.id !== defaults.id)
              .map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Ultimate Holding Co.</label>
          <select
            name="ultimate_parent_id"
            defaultValue={defaults?.ultimate_parent_id || ""}
            className={inputCls}
          >
            <option value="">-- None --</option>
            {entities
              .filter((e) => !defaults || e.id !== defaults.id)
              .map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
          </select>
        </div>
      </div>

      {/* DPO fields — only in edit mode */}
      {defaults && (
        <>
          <div className="border-t border-surface-border-light pt-3 mt-4">
            <div className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">DPO Details</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>DPO Appointed?</label>
              <select name="dpo_appointed" defaultValue={defaults.dpo_appointed ? "true" : "false"} className={inputCls}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Registration Status</label>
              <select name="controller_registration_status" defaultValue={defaults.controller_registration_status || ""} className={inputCls}>
                <option value="">--</option>
                {CONTROLLER_REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>DPO Name</label>
              <input name="dpo_name" defaultValue={defaults.dpo_name || ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>DPO Email</label>
              <input name="dpo_email" type="email" defaultValue={defaults.dpo_email || ""} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Registration Ref</label>
            <input name="controller_registration_ref" defaultValue={defaults.controller_registration_ref || ""} className={inputCls} />
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
        <h2 className="text-[22px] font-bold text-text-primary">Entity Matrix</h2>
        <div className="flex gap-2">
          <Button
            variant={structureView ? "primary" : "secondary"}
            icon={<Network size={14} />}
            small
            onClick={() => setStructureView(!structureView)}
          >
            Structure View
          </Button>
          <Button variant="secondary" icon={<Upload size={14} />} small onClick={() => setShowImport(true)}>
            Import
          </Button>
          <Button icon={<Plus size={14} />} small onClick={() => setShowForm(true)}>
            Add Entity
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text"
            placeholder="Search entities..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Statuses</option>
          {ENTITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
          <option value="4">Tier 4</option>
        </select>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">All Countries</option>
          {allCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => { setFilterSearch(""); setFilterStatus(""); setFilterTier(""); setFilterCountry(""); }}
            className="text-xs text-brand hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Structure View */}
      {structureView ? (
        <div className="bg-white border border-surface-border rounded-[10px] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Network size={16} className="text-brand" />
            <span className="text-sm font-semibold text-text-primary">Corporate Structure</span>
            <span className="text-xs text-text-muted ml-2">
              {filteredEntities.length} {filteredEntities.length === 1 ? "entity" : "entities"}
            </span>
          </div>
          {treeRoots.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-8">No entities to display.</div>
          ) : (
            <ul className="space-y-1">
              {treeRoots.map((root) => (
                <TreeNodeCard
                  key={root.entity.id}
                  node={root}
                  entities={entities}
                  statusColor={statusColor}
                  onSelect={setSelected}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* Table */
        <div className="bg-white border border-surface-border rounded-[10px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50/80">
                  {["Entity Name", "Country", "Division", "Parent Company", "Ultimate Holding Co.", "Status", "Employees", "DPO Req.", "Priority"].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 text-left font-semibold text-text-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                      {h}
                    </th>
                  ))}
                  <th className="px-3.5 py-2.5 text-left font-semibold text-text-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                    <Tooltip content={`${TIER_CONFIG[1].label}: ${TIER_CONFIG[1].description} | ${TIER_CONFIG[2].label}: ${TIER_CONFIG[2].description} | ${TIER_CONFIG[3].label}: ${TIER_CONFIG[3].description} | ${TIER_CONFIG[4].label}: ${TIER_CONFIG[4].description}`}>
                      <span className="flex items-center gap-1 cursor-help">
                        Tier
                      </span>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="cursor-pointer hover:bg-brand-light/50 transition-colors"
                  >
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light font-medium text-brand">{e.name}</td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-primary">{e.country}</td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-muted">{e.division}</td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-muted">
                      {entityNameById(e.parent_entity_id) || <span className="text-text-light">--</span>}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-muted">
                      {entityNameById(e.ultimate_parent_id) || <span className="text-text-light">--</span>}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light"><Badge color={statusColor(e.status)}>{e.status}</Badge></td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light text-text-primary">{e.employees.toLocaleString()}</td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light"><Badge color={dpoColor(e.dpo_requirement)}>{e.dpo_requirement}</Badge></td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light"><Badge color={priorityColor(e.priority)}>{e.priority}</Badge></td>
                    <td className="px-3.5 py-2.5 border-b border-surface-border-light"><TierBadge tier={e.tier} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entity Detail Side Panel */}
      {selected && (
        <div className="fixed top-0 right-0 w-[420px] h-screen bg-white border-l border-surface-border shadow-xl z-50 overflow-auto p-7">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-bold text-text-primary">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="bg-brand-light rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-brand mb-2">DPO Assessment</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Jurisdiction", selected.country],
                ["DPO Requirement", selected.dpo_requirement],
                ["DPO Appointed", selected.dpo_appointed ? "Yes" : "No"],
                ["Registration", selected.controller_registration_status || "Not assessed"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-text-muted">{k}</div>
                  <div className="text-[13px] font-medium text-text-primary">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-text-muted mb-3">Entity Details</div>
          {[
            ["Company/Reg No", selected.company_reg_no || "\u2014"],
            ["Division", selected.division || "\u2014"],
            ["Parent Company", entityNameById(selected.parent_entity_id) || "\u2014"],
            ["Ultimate Holding Co.", entityNameById(selected.ultimate_parent_id) || "\u2014"],
            ["Employee Count", selected.employees.toLocaleString()],
            ["Entity Status", selected.status],
            ["Priority", selected.priority],
            ["Tier", `Tier ${selected.tier}`],
            ["DPO Name", selected.dpo_name || "\u2014"],
            ["DPO Email", selected.dpo_email || "\u2014"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-surface-border-light">
              <span className="text-[13px] text-text-muted">{k}</span>
              <span className="text-[13px] font-medium text-text-primary">{v}</span>
            </div>
          ))}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button small variant="secondary" onClick={() => { setEditEntity(selected); }}>
              Edit Entity
            </Button>
            <Button small variant="secondary" icon={<Crown size={12} />} onClick={() => handleSetUltimateParent(selected)}>
              Set as Ultimate Parent
            </Button>
          </div>
        </div>
      )}

      {/* Add Entity Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Entity">
        <form action={handleCreate}>
          {entityFormFields()}
          <div className="flex gap-2 mt-6 justify-end">
            <Button type="button" variant="secondary" small onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" small>Create Entity</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Entity Modal */}
      <Modal open={!!editEntity} onClose={() => setEditEntity(null)} title="Edit Entity" wide>
        {editEntity && (
          <form action={handleUpdate}>
            {entityFormFields(editEntity)}
            <div className="flex gap-2 mt-6 justify-between">
              <Button type="button" variant="danger" small onClick={() => handleDelete(editEntity)}>
                Delete Entity
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" small onClick={() => setEditEntity(null)}>Cancel</Button>
                <Button type="submit" small>Save Changes</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Import Entities Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Entities"
        expectedColumns={ENTITY_IMPORT_COLUMNS}
        onImport={handleImport}
      />
    </div>
  );
}
