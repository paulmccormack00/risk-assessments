"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { MODULE_DEFINITIONS, type ModuleId } from "@/lib/constants";
import { toggleModule } from "./actions";

interface ModuleSetting {
  id: string;
  module: string;
  is_enabled: boolean;
  updated_at: string;
}

interface Props {
  isAdmin: boolean;
  modules: ModuleSetting[];
}

export function SettingsClient({ isAdmin, modules }: Props) {
  const router = useRouter();
  const [localModules, setLocalModules] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const m of modules) map[m.module] = m.is_enabled;
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function handleToggle(moduleId: ModuleId) {
    if (!isAdmin) return;
    const newVal = !localModules[moduleId];
    setSaving(moduleId);
    setLocalModules((prev) => ({ ...prev, [moduleId]: newVal }));

    const result = await toggleModule(moduleId, newVal);
    setSaving(null);

    if (result.error) {
      // Revert on error
      setLocalModules((prev) => ({ ...prev, [moduleId]: !newVal }));
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-text-muted" />
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Module Activation</h2>
        <p className="text-sm text-text-muted mb-6">
          Toggle which modules appear in the sidebar navigation.
          {!isAdmin && " Only admins can change these settings."}
        </p>

        <div className="space-y-3">
          {(Object.keys(MODULE_DEFINITIONS) as ModuleId[]).map((moduleId) => {
            const def = MODULE_DEFINITIONS[moduleId];
            const enabled = localModules[moduleId] ?? true;
            const isSaving = saving === moduleId;

            return (
              <div
                key={moduleId}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-border/80 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-text-primary">{def.label}</div>
                  <div className="text-xs text-text-muted mt-0.5">{def.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={!isAdmin || isSaving}
                  onClick={() => handleToggle(moduleId)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${enabled ? "bg-primary" : "bg-gray-300"}
                    ${!isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    ${isSaving ? "opacity-70" : ""}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                      ${enabled ? "translate-x-6" : "translate-x-1"}
                    `}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
