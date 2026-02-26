"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare, Plus, Clock, CheckCircle, AlertTriangle,
  Loader2, Trash2, ChevronDown, ChevronUp, X,
  Calendar, ArrowRight,
} from "lucide-react";
import { createActionItem, updateActionStatus, deleteActionItem } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assessment_id: string | null;
  completed_at: string | null;
  created_at: string;
  assessment: { id: string; title: string } | null;
}

interface Props {
  actions: ActionItem[];
}

const STATUS_CONFIG: Record<string, { label: string; badgeColor: "gray" | "blue" | "green" | "amber" }> = {
  pending: { label: "Pending", badgeColor: "gray" },
  in_progress: { label: "In Progress", badgeColor: "blue" },
  completed: { label: "Completed", badgeColor: "green" },
};

const PRIORITY_CONFIG: Record<string, { label: string; badgeColor: "red" | "amber" | "blue" | "gray" }> = {
  critical: { label: "Critical", badgeColor: "red" },
  high: { label: "High", badgeColor: "amber" },
  medium: { label: "Medium", badgeColor: "blue" },
  low: { label: "Low", badgeColor: "gray" },
};

export function ActionsClient({ actions }: Props) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
      return true;
    });
  }, [actions, statusFilter, priorityFilter]);

  const stats = {
    total: actions.length,
    pending: actions.filter((a) => a.status === "pending").length,
    inProgress: actions.filter((a) => a.status === "in_progress").length,
    completed: actions.filter((a) => a.status === "completed").length,
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createActionItem(formData);
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowNew(false);
      router.refresh();
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    const result = await updateActionStatus(id, newStatus);
    setUpdatingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteActionItem(id);
    setDeletingId(null);
    setShowDeleteConfirm(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  function isOverdue(dueDate: string | null, status: string): boolean {
    if (!dueDate || status === "completed") return false;
    return new Date(dueDate) < new Date();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Action Items</h2>
          <p className="text-[13px] text-text-muted mt-1">
            Track remediation tasks and follow-up actions from assessments
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} icon={<Plus size={14} />}>
          New Action Item
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
          { label: "Pending", value: stats.pending, color: "text-gray-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-surface-border rounded-[10px] p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Status:</span>
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Priority:</span>
          {[
            { value: "all", label: "All" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                priorityFilter === f.value
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-text-muted hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-4">New Action Item</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Action item title..."
                  className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 rounded-md border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Priority</label>
                  <select
                    name="priority"
                    defaultValue="medium"
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
                    name="due_date"
                    className="w-full px-3 py-2 rounded-md border border-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" small type="button" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
                <Button small type="submit" disabled={creating}>
                  {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-2">Delete Action Item</h3>
            <p className="text-xs text-text-muted mb-4">
              Are you sure you want to permanently delete this action item? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" small onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                small
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
              >
                {deletingId === showDeleteConfirm ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Items Table */}
      {filteredActions.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-[10px] p-12 text-center">
          <CheckSquare size={32} className="mx-auto text-text-light mb-3" />
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {actions.length === 0 ? "No action items yet" : "No items match these filters"}
          </h3>
          <p className="text-xs text-text-muted mb-4">
            {actions.length === 0
              ? "Action items will appear here when created from assessments or added manually."
              : "Try changing your filter criteria."}
          </p>
          {actions.length === 0 && (
            <Button onClick={() => setShowNew(true)} small>
              Create First Action Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-surface-border rounded-[10px] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_100px_110px_150px_100px_60px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-surface-border">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Title</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Priority</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Status</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Due Date</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Assessment</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Created</div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredActions.map((action) => {
            const isExpanded = expandedId === action.id;
            const priorityCfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
            const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;
            const overdue = isOverdue(action.due_date, action.status);

            return (
              <div key={action.id} className="border-b border-surface-border last:border-b-0">
                {/* Main Row */}
                <div
                  className="grid grid-cols-[1fr_100px_100px_110px_150px_100px_60px] gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                  onClick={() => setExpandedId(isExpanded ? null : action.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronUp size={12} className="text-text-light shrink-0" /> : <ChevronDown size={12} className="text-text-light shrink-0" />}
                    <span className={`text-xs font-medium truncate ${action.status === "completed" ? "line-through text-text-light" : "text-text-primary"}`}>
                      {action.title}
                    </span>
                  </div>
                  <div>
                    <Badge color={priorityCfg.badgeColor}>{priorityCfg.label}</Badge>
                  </div>
                  <div>
                    <Badge color={statusCfg.badgeColor}>{statusCfg.label}</Badge>
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-1">
                    {action.due_date ? (
                      <>
                        {overdue && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                        <span className={overdue ? "text-red-600 font-medium" : ""}>
                          {new Date(action.due_date).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-text-light">--</span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {action.assessment ? (
                      <Link
                        href={`/assessments/${action.assessment.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand hover:text-brand-hover hover:underline"
                      >
                        {action.assessment.title}
                      </Link>
                    ) : (
                      <span className="text-text-light">--</span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-light">
                    {new Date(action.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowDeleteConfirm(action.id)}
                      className="p-1 rounded hover:bg-red-50 text-text-light hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Expanded Row */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-surface-border-light">
                    {action.description && (
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Description</div>
                        <p className="text-xs text-text-primary whitespace-pre-wrap">{action.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">Change status:</span>
                      {action.status !== "pending" && (
                        <Button
                          variant="ghost"
                          small
                          onClick={() => handleStatusChange(action.id, "pending")}
                          disabled={updatingId === action.id}
                        >
                          {updatingId === action.id ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />}
                          Pending
                        </Button>
                      )}
                      {action.status !== "in_progress" && (
                        <Button
                          variant="ghost"
                          small
                          onClick={() => handleStatusChange(action.id, "in_progress")}
                          disabled={updatingId === action.id}
                        >
                          {updatingId === action.id ? <Loader2 size={10} className="animate-spin" /> : <ArrowRight size={10} />}
                          In Progress
                        </Button>
                      )}
                      {action.status !== "completed" && (
                        <Button
                          variant="ghost"
                          small
                          onClick={() => handleStatusChange(action.id, "completed")}
                          disabled={updatingId === action.id}
                        >
                          {updatingId === action.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
