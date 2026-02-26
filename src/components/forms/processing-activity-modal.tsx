"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import type { ProcessingActivity, CoreActivity } from "@/lib/types";
import { X } from "lucide-react";
import {
  LEGAL_BASES,
  SPECIAL_CATEGORIES,
  TRANSFER_MECHANISMS,
  CONTROLLER_PROCESSOR_ROLES,
  DATA_SUBJECT_CATEGORIES,
  DATA_TYPES_BY_SUBJECT,
  TRANSFER_COUNTRIES,
  FUNCTIONS,
} from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
  activity?: ProcessingActivity | null;
  coreActivities?: CoreActivity[];
  systems?: { id: string; name: string }[];
  entities?: { id: string; name: string; country: string }[];
  selectedSystemIds?: string[];
  selectedEntityIds?: string[];
  onSave: (formData: FormData) => Promise<void>;
  onDelete?: () => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand";
const labelCls = "block text-sm font-medium text-text-primary mb-1";
const sectionCls = "text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider";

function toArray(val: string[] | string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export function ProcessingActivityModal({
  open,
  onClose,
  activity,
  coreActivities,
  systems,
  entities,
  selectedSystemIds,
  selectedEntityIds,
  onSave,
  onDelete,
}: Props) {
  const [transfer, setTransfer] = useState(activity?.transfer ?? false);
  const [retentionPeriod, setRetentionPeriod] = useState(activity?.retention_period || "");
  const [recipients, setRecipients] = useState(activity?.recipients || "");
  const [sourceOfData, setSourceOfData] = useState(activity?.source_of_data || "");
  const [dataTypes, setDataTypes] = useState(activity?.data_types || "");

  const [dataSubjects, setDataSubjects] = useState<string[]>(toArray(activity?.data_subjects));
  const [specialCategories, setSpecialCategories] = useState<string[]>(toArray(activity?.special_categories));
  const [legalBasis, setLegalBasis] = useState<string[]>(toArray(activity?.legal_basis));
  const [transferCountries, setTransferCountries] = useState<string[]>(toArray(activity?.transfer_countries));

  const showLegitimateInterest = legalBasis.includes("Legitimate Interest");
  const [selectedSystems, setSelectedSystems] = useState<string[]>(selectedSystemIds || []);
  const [selectedEntities, setSelectedEntities] = useState<string[]>(selectedEntityIds || []);

  const isEdit = !!activity;

  const suggestedDataTypes = useMemo(() => {
    const types = new Set<string>();
    for (const subj of dataSubjects) {
      const subjectTypes = DATA_TYPES_BY_SUBJECT[subj];
      if (subjectTypes) {
        subjectTypes.forEach((t) => types.add(t));
      }
    }
    return [...types].sort();
  }, [dataSubjects]);

  const transferCountryOptions = useMemo(() => {
    const opts: string[] = [];
    for (const c of TRANSFER_COUNTRIES) {
      if ("subRegions" in c) {
        for (const sr of c.subRegions) {
          opts.push(`${c.name} - ${sr}`);
        }
      } else {
        opts.push(c.name);
      }
    }
    return opts;
  }, []);

  async function handleSubmit(formData: FormData) {
    await onSave(formData);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Processing Activity" : "Add Processing Activity"}
      wide
    >
      <form action={handleSubmit}>
        {/* Core Info */}
        <div className="mb-4">
          <div className={sectionCls}>Core Details</div>
          <div className="space-y-3">
            {!isEdit && coreActivities && (
              <div>
                <label className={labelCls}>Core Activity</label>
                <select name="core_activity_id" className={inputCls}>
                  <option value="">-- None (standalone) --</option>
                  {coreActivities.map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.function} -- {ca.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Processing Activity *</label>
              <input name="activity" required defaultValue={activity?.activity} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Function *</label>
                <select name="function" defaultValue={activity?.function || ""} className={inputCls} required>
                  <option value="">Select...</option>
                  {FUNCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Purpose</label>
                <input name="purpose" defaultValue={activity?.purpose || ""} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea name="description" rows={2} defaultValue={activity?.description || ""} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Linked Systems */}
        {systems && systems.length > 0 && (
          <div className="mb-4 border-t border-surface-border-light pt-4">
            <div className={sectionCls}>Linked Systems</div>
            <div className="space-y-2">
              {selectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSystems.map((sId) => {
                    const sys = systems.find((s) => s.id === sId);
                    return sys ? (
                      <span key={sId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-light text-brand text-xs rounded-full border border-brand/20">
                        {sys.name}
                        <button type="button" onClick={() => setSelectedSystems((prev) => prev.filter((id) => id !== sId))} className="cursor-pointer">
                          <X size={10} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <select
                className={inputCls}
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedSystems.includes(e.target.value)) {
                    setSelectedSystems((prev) => [...prev, e.target.value]);
                  }
                }}
              >
                <option value="">Add a system...</option>
                {systems.filter((s) => !selectedSystems.includes(s.id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedSystems.map((sId) => (
                <input key={sId} type="hidden" name="system_ids" value={sId} />
              ))}
            </div>
          </div>
        )}

        {/* Entities */}
        {entities && entities.length > 0 && (
          <div className="mb-4 border-t border-surface-border-light pt-4">
            <div className={sectionCls}>Legal Entities</div>
            <div className="space-y-2">
              {selectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEntities.map((eId) => {
                    const ent = entities.find((e) => e.id === eId);
                    return ent ? (
                      <span key={eId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                        {ent.name} ({ent.country})
                        <button type="button" onClick={() => setSelectedEntities((prev) => prev.filter((id) => id !== eId))} className="cursor-pointer">
                          <X size={10} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <select
                className={inputCls}
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedEntities.includes(e.target.value)) {
                    setSelectedEntities((prev) => [...prev, e.target.value]);
                  }
                }}
              >
                <option value="">Add an entity...</option>
                {entities.filter((e) => !selectedEntities.includes(e.id)).map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.country})</option>
                ))}
              </select>
              {selectedEntities.map((eId) => (
                <input key={eId} type="hidden" name="entity_ids" value={eId} />
              ))}
            </div>
          </div>
        )}

        {/* Data */}
        <div className="mb-4 border-t border-surface-border-light pt-4">
          <div className={sectionCls}>Data</div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Data Subjects</label>
              <MultiSelect
                name="data_subjects"
                options={[...DATA_SUBJECT_CATEGORIES]}
                value={dataSubjects}
                onChange={setDataSubjects}
                placeholder="Add data subjects..."
                allowCustom
                customPlaceholder="Add custom subject category..."
              />
            </div>
            <div>
              <label className={labelCls}>Data Types / Personal Data</label>
              {suggestedDataTypes.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-text-light mb-1">Suggested based on selected subjects (click to add):</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedDataTypes.map((dt) => {
                      const isIncluded = dataTypes.toLowerCase().includes(dt.toLowerCase());
                      return (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => {
                            if (!isIncluded) {
                              setDataTypes((prev) => prev ? `${prev}, ${dt}` : dt);
                            }
                          }}
                          className={`px-2 py-0.5 text-[10px] rounded-full border cursor-pointer transition-colors ${
                            isIncluded
                              ? "bg-brand-light text-brand border-brand/20"
                              : "bg-gray-50 text-text-muted border-gray-200 hover:bg-brand-light hover:text-brand hover:border-brand/20"
                          }`}
                        >
                          {dt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <textarea
                name="data_types"
                rows={2}
                value={dataTypes}
                onChange={(e) => setDataTypes(e.target.value)}
                placeholder="e.g. Name, Email, NI Number"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Special Categories</label>
              <MultiSelect
                name="special_categories"
                options={[...SPECIAL_CATEGORIES].filter((c) => c !== "None")}
                value={specialCategories}
                onChange={setSpecialCategories}
                placeholder="Add special categories..."
              />
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="mb-4 border-t border-surface-border-light pt-4">
          <div className={sectionCls}>Legal Basis</div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Legal Basis</label>
              <MultiSelect
                name="legal_basis"
                options={[...LEGAL_BASES]}
                value={legalBasis}
                onChange={setLegalBasis}
                placeholder="Add legal basis..."
              />
            </div>
            {showLegitimateInterest && (
              <div>
                <label className={labelCls}>Legitimate Interest Detail</label>
                <textarea name="legitimate_interest_detail" rows={2} defaultValue={activity?.legitimate_interest_detail || ""} className={inputCls} />
              </div>
            )}
            <div>
              <label className={labelCls}>Retention Period</label>
              <input name="retention_period" value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="e.g. 6 years from end of employment" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Sharing & Transfer */}
        <div className="mb-4 border-t border-surface-border-light pt-4">
          <div className={sectionCls}>Sharing & Transfer</div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Recipients</label>
              <input name="recipients" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="e.g. HMRC, Payroll provider" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>International Transfer?</label>
              <select
                name="transfer"
                value={transfer ? "true" : "false"}
                onChange={(e) => setTransfer(e.target.value === "true")}
                className={inputCls}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            {transfer && (
              <>
                <div>
                  <label className={labelCls}>Transfer Countries</label>
                  <MultiSelect
                    name="transfer_countries"
                    options={transferCountryOptions}
                    value={transferCountries}
                    onChange={setTransferCountries}
                    placeholder="Add transfer countries..."
                    allowCustom
                    customPlaceholder="Add custom country..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Transfer Mechanism</label>
                  <select name="transfer_mechanism" defaultValue={activity?.transfer_mechanism || ""} className={inputCls}>
                    <option value="">Select...</option>
                    {TRANSFER_MECHANISMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role & Source */}
        <div className="mb-4 border-t border-surface-border-light pt-4">
          <div className={sectionCls}>Controller / Processor</div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Role</label>
                <select name="controller_or_processor" defaultValue={activity?.controller_or_processor || "Controller"} className={inputCls}>
                  {CONTROLLER_PROCESSOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Source of Data</label>
                <input name="source_of_data" value={sourceOfData} onChange={(e) => setSourceOfData(e.target.value)} placeholder="e.g. Data subject directly" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Automated Decision Making?</label>
              <select name="automated_decision_making" defaultValue={activity?.automated_decision_making ? "true" : "false"} className={inputCls}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4 border-t border-surface-border-light pt-4">
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" rows={2} defaultValue={activity?.notes || ""} className={inputCls} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between border-t border-surface-border-light pt-4">
          {isEdit && onDelete ? (
            <Button type="button" variant="danger" small onClick={onDelete}>
              Delete Activity
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" small onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" small>
              {isEdit ? "Save Changes" : "Create Activity"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
