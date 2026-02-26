"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, AlertTriangle, Shield, ShieldCheck } from "lucide-react";
import { updateRiskFactor, updateRiskThresholds, type RiskFactorConfig, type RiskThresholds } from "./risk-scoring-actions";

interface Props {
  isAdmin: boolean;
  factors: RiskFactorConfig[];
  thresholds: RiskThresholds;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-green-600 bg-green-50 border-green-200",
};

export function RiskScoringClient({ isAdmin, factors, thresholds }: Props) {
  const router = useRouter();
  const [localFactors, setLocalFactors] = useState(factors);
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxPossibleScore = localFactors
    .filter((f) => f.is_active)
    .reduce((sum, f) => {
      if (f.condition === "variable") return sum + 25; // max for DP.10
      return sum + f.points;
    }, 0);

  async function handlePointsChange(factor: RiskFactorConfig, points: number) {
    if (!isAdmin) return;
    setSaving(factor.id);
    setError(null);
    setLocalFactors((prev) => prev.map((f) => f.id === factor.id ? { ...f, points } : f));

    const result = await updateRiskFactor(factor.id, { points });
    setSaving(null);
    if (result.error) {
      setError(result.error);
      setLocalFactors((prev) => prev.map((f) => f.id === factor.id ? { ...f, points: factor.points } : f));
    } else {
      router.refresh();
    }
  }

  async function handleToggleActive(factor: RiskFactorConfig) {
    if (!isAdmin) return;
    const newActive = !factor.is_active;
    setSaving(factor.id);
    setError(null);
    setLocalFactors((prev) => prev.map((f) => f.id === factor.id ? { ...f, is_active: newActive } : f));

    const result = await updateRiskFactor(factor.id, { is_active: newActive });
    setSaving(null);
    if (result.error) {
      setError(result.error);
      setLocalFactors((prev) => prev.map((f) => f.id === factor.id ? { ...f, is_active: factor.is_active } : f));
    } else {
      router.refresh();
    }
  }

  async function handleThresholdSave() {
    if (!isAdmin) return;
    if (localThresholds.high_threshold <= localThresholds.medium_threshold) {
      setError("High threshold must be greater than medium threshold");
      return;
    }
    setSaving("thresholds");
    setError(null);
    const result = await updateRiskThresholds(
      localThresholds.id,
      localThresholds.high_threshold,
      localThresholds.medium_threshold
    );
    setSaving(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-text-muted" />
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Risk Scoring Criteria</h2>
          <p className="text-xs text-text-muted">
            Configure risk factor weights and classification thresholds for assessments.
            {!isAdmin && " Only admins can change these settings."}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">&times;</button>
        </div>
      )}

      {/* Classification Thresholds */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Classification Thresholds</h3>
        <p className="text-xs text-text-muted mb-4">
          Total risk score ranges from 0 to {maxPossibleScore}. Set the boundaries for HIGH, MEDIUM, and LOW classifications.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={12} className="text-red-600" />
              <span className="text-xs font-semibold text-red-700">HIGH RISK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-600">Score &ge;</span>
              <input
                type="number"
                value={localThresholds.high_threshold}
                onChange={(e) => setLocalThresholds({ ...localThresholds, high_threshold: parseInt(e.target.value) || 0 })}
                disabled={!isAdmin}
                className="w-16 px-2 py-1 rounded border border-red-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-300 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={12} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">MEDIUM RISK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-600">Score &ge;</span>
              <input
                type="number"
                value={localThresholds.medium_threshold}
                onChange={(e) => setLocalThresholds({ ...localThresholds, medium_threshold: parseInt(e.target.value) || 0 })}
                disabled={!isAdmin}
                className="w-16 px-2 py-1 rounded border border-amber-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-green-200 bg-green-50">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={12} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">LOW RISK</span>
            </div>
            <div className="text-[10px] text-green-600 mt-2">
              Score &lt; {localThresholds.medium_threshold}
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleThresholdSave}
            disabled={saving === "thresholds"}
            className="px-3 py-1.5 bg-brand text-white rounded-md text-xs font-medium hover:bg-brand-hover disabled:opacity-50 cursor-pointer"
          >
            {saving === "thresholds" ? "Saving..." : "Save Thresholds"}
          </button>
        )}
      </div>

      {/* Risk Factors */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Risk Factors</h3>
        <p className="text-xs text-text-muted mb-4">
          Each factor contributes points to the total risk score when its condition is met during an assessment.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Active</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Question</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Factor</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Points</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Severity</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Condition</th>
                <th className="text-left py-2 px-2 font-semibold text-text-muted">Reason</th>
              </tr>
            </thead>
            <tbody>
              {localFactors.map((factor) => (
                <tr
                  key={factor.id}
                  className={`border-b border-border/50 ${!factor.is_active ? "opacity-50" : ""}`}
                >
                  <td className="py-2.5 px-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={factor.is_active}
                      disabled={!isAdmin || saving === factor.id}
                      onClick={() => handleToggleActive(factor)}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        factor.is_active ? "bg-brand" : "bg-gray-300"
                      } ${!isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm ${
                        factor.is_active ? "translate-x-3.5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>
                  <td className="py-2.5 px-2 font-mono text-text-muted">{factor.factor_id}</td>
                  <td className="py-2.5 px-2 font-medium text-text-primary">{factor.label}</td>
                  <td className="py-2.5 px-2">
                    {factor.condition === "variable" ? (
                      <span className="text-text-muted italic">Variable</span>
                    ) : (
                      <input
                        type="number"
                        value={factor.points}
                        onChange={(e) => {
                          const pts = parseInt(e.target.value) || 0;
                          setLocalFactors((prev) => prev.map((f) => f.id === factor.id ? { ...f, points: pts } : f));
                        }}
                        onBlur={(e) => {
                          const pts = parseInt(e.target.value) || 0;
                          if (pts !== factor.points) handlePointsChange(factor, pts);
                        }}
                        disabled={!isAdmin}
                        className="w-14 px-2 py-1 rounded border border-surface-border text-center focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:bg-gray-50"
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${SEVERITY_COLORS[factor.severity] || ""}`}>
                      {factor.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-text-muted font-mono text-[10px]">{factor.condition}</td>
                  <td className="py-2.5 px-2 text-text-muted max-w-48 truncate" title={factor.reason}>{factor.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-[10px] text-text-muted">
          <strong>Max possible score:</strong> {maxPossibleScore} points (with DP.10 = High at 25pts).
          A score of {localThresholds.high_threshold}+ = HIGH, {localThresholds.medium_threshold}-{localThresholds.high_threshold - 1} = MEDIUM, below {localThresholds.medium_threshold} = LOW.
        </div>
      </div>
    </div>
  );
}
