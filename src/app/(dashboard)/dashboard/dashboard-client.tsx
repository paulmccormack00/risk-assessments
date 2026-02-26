"use client";

import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ASSESSMENT_STATUSES } from "@/lib/constants";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Props {
  stats: {
    entities: number;
    systems: number;
    processingActivities: number;
    assessments: number;
  };
  assessments: {
    id: string;
    title: string;
    status: string;
    risk_score: number | null;
    risk_classification: string | null;
    created_at: string;
    completed_at: string | null;
  }[];
  actionItems: {
    id: string;
    title: string;
    priority: string;
    status: string;
    due_date: string | null;
    created_at: string;
  }[];
  recentAudit: {
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  in_progress: "#D97706",
  completed: "#059669",
  validated: "#2563EB",
};

const PRIORITY_COLORS: Record<string, "red" | "amber" | "blue" | "gray"> = {
  critical: "red",
  high: "red",
  medium: "amber",
  low: "gray",
};

export function DashboardClient({ stats, assessments, actionItems, recentAudit }: Props) {
  // Assessment status breakdown
  const statusCounts = assessments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: ASSESSMENT_STATUSES[status as keyof typeof ASSESSMENT_STATUSES]?.label || status,
    value: count,
    color: STATUS_COLORS[status] || "#94a3b8",
  }));

  // Action items breakdown
  const actionStatusCounts = actionItems.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const barData = [
    { name: "Pending", value: actionStatusCounts["pending"] || 0, fill: "#D97706" },
    { name: "In Progress", value: actionStatusCounts["in_progress"] || 0, fill: "#2563EB" },
    { name: "Completed", value: actionStatusCounts["completed"] || 0, fill: "#059669" },
  ];

  const pendingActions = actionItems.filter((a) => a.status !== "completed");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold text-text-primary">Dashboard</h2>
        <p className="text-[13px] text-text-muted mt-1">Risk assessment overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Entities" value={stats.entities} href="/entities" color="text-brand" />
        <StatCard label="Systems" value={stats.systems} href="/systems" color="text-accent" />
        <StatCard label="Processing Activities" value={stats.processingActivities} href="/mapping" color="text-purple-600" />
        <StatCard label="Assessments" value={stats.assessments} href="/assessments" color="text-status-blue" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Assessment Status Chart */}
        <div className="bg-white border border-surface-border rounded-[10px] p-5">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Assessment Status</div>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} strokeWidth={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-text-muted">{entry.name}</span>
                    <span className="text-xs font-semibold text-text-primary ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-light text-center py-8">No assessments yet</div>
          )}
        </div>

        {/* Action Items Chart */}
        <div className="bg-white border border-surface-border rounded-[10px] p-5">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Action Items</div>
          {actionItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#63666A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#63666A" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-text-light text-center py-8">No action items yet</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Assessments */}
        <div className="bg-white border border-surface-border rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Assessments</div>
            <Link href="/assessments" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {assessments.slice(0, 5).map((a) => {
              const statusConfig = ASSESSMENT_STATUSES[a.status as keyof typeof ASSESSMENT_STATUSES];
              return (
                <Link
                  key={a.id}
                  href={`/assessments/${a.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-brand-light/30 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">{a.title}</div>
                    <div className="text-[10px] text-text-muted">
                      {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge color={statusConfig?.color || "gray"}>
                    {statusConfig?.label || a.status}
                  </Badge>
                </Link>
              );
            })}
            {assessments.length === 0 && (
              <div className="text-sm text-text-light text-center py-4">No assessments yet</div>
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white border border-surface-border rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pending Actions</div>
            <Link href="/actions" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-brand-light/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-text-primary">{a.title}</div>
                  {a.due_date && (
                    <div className="text-[10px] text-text-muted">
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Badge color={PRIORITY_COLORS[a.priority] || "gray"}>{a.priority}</Badge>
              </div>
            ))}
            {pendingActions.length === 0 && (
              <div className="text-sm text-text-light text-center py-4">No pending actions</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentAudit.length > 0 && (
        <div className="mt-5 bg-white border border-surface-border rounded-[10px] p-5">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Recent Activity</div>
          <div className="space-y-1.5">
            {recentAudit.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs text-text-muted py-1.5">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                <span className="capitalize font-medium text-text-primary">{log.action}</span>
                <span>{log.entity_type}</span>
                <span className="ml-auto text-text-light">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
