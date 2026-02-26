"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  expectedColumns: string[];
  onImport: (rows: Record<string, string>[]) => Promise<{ error?: string; count?: number }>;
}

export function ImportModal({
  open,
  onClose,
  title,
  expectedColumns,
  onImport,
}: ImportModalProps) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ error?: string; count?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setHeaders([]);
    setFileName("");
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function parseFile(file: File) {
    reset();
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "tsv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          if (data.length > 0) {
            setHeaders(Object.keys(data[0]));
            setRows(data);
          }
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setRows(data);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const res = await onImport(rows);
      setResult(res);
      if (!res.error) {
        setTimeout(() => handleClose(), 1500);
      }
    } catch {
      setResult({ error: "Import failed. Please try again." });
    } finally {
      setImporting(false);
    }
  }

  const missingColumns = expectedColumns.filter(
    (ec) => !headers.some((h) => h.toLowerCase().trim() === ec.toLowerCase().trim())
  );

  return (
    <Modal open={open} onClose={handleClose} title={title} wide>
      <div className="space-y-4">
        {rows.length === 0 && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center cursor-pointer hover:border-brand/40 hover:bg-brand-light/20 transition-colors"
            >
              <Upload size={24} className="mx-auto text-text-light mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-text-muted">
                Supports CSV, XLSX, and XLS files
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseFile(file);
              }}
            />
            <div className="mt-4">
              <p className="text-xs font-semibold text-text-muted mb-2">Expected columns:</p>
              <div className="flex flex-wrap gap-1">
                {expectedColumns.map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 bg-gray-100 text-text-muted text-[10px] rounded-full border border-gray-200"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-brand" />
                <span className="text-sm font-medium text-text-primary">{fileName}</span>
                <span className="text-xs text-text-muted">{rows.length} rows</span>
              </div>
              <button onClick={reset} className="text-xs text-brand hover:underline cursor-pointer">
                Choose different file
              </button>
            </div>

            {missingColumns.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <strong>Missing columns:</strong> {missingColumns.join(", ")}. These fields will be left empty.
                </div>
              </div>
            )}

            <div className="border border-surface-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[250px]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50/80">
                      {headers.slice(0, 8).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-text-muted whitespace-nowrap border-b border-surface-border">
                          {h}
                        </th>
                      ))}
                      {headers.length > 8 && (
                        <th className="px-2 py-1.5 text-left font-semibold text-text-light border-b border-surface-border">
                          +{headers.length - 8} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.slice(0, 8).map((h) => (
                          <td key={h} className="px-2 py-1.5 text-text-muted border-b border-surface-border-light whitespace-nowrap max-w-[150px] truncate">
                            {row[h] || "\u2014"}
                          </td>
                        ))}
                        {headers.length > 8 && (
                          <td className="px-2 py-1.5 text-text-light border-b border-surface-border-light">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-text-light text-center border-t border-surface-border">
                  Showing 5 of {rows.length} rows
                </div>
              )}
            </div>

            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mt-3 ${
                result.error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
              }`}>
                {result.error ? (
                  <AlertCircle size={14} className="text-red-600 shrink-0" />
                ) : (
                  <Check size={14} className="text-green-600 shrink-0" />
                )}
                <span className={`text-xs ${result.error ? "text-red-800" : "text-green-800"}`}>
                  {result.error || `Successfully imported ${result.count} records.`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" small onClick={handleClose}>
            Cancel
          </Button>
          {rows.length > 0 && (
            <Button small onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${rows.length} Records`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
