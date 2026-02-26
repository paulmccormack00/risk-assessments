"use client";

import { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";
import { X, Plus, ChevronDown, Search } from "lucide-react";

interface MultiSelectProps {
  name: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function MultiSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "Select...",
  allowCustom = false,
  customPlaceholder = "Add custom...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();

  // Filter available options by search and exclude already selected
  const available = useMemo(() => {
    const unselected = options.filter((o) => !value.includes(o));
    if (!search.trim()) return unselected;
    const lower = search.toLowerCase();
    return unselected.filter((o) => o.toLowerCase().includes(lower));
  }, [options, value, search]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setHighlightedIndex(-1);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Focus custom input when shown
  useEffect(() => {
    if (showCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustom]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-option]");
      const item = items[highlightedIndex] as HTMLElement | undefined;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const addItem = useCallback(
    (item: string) => {
      if (item && !value.includes(item)) {
        onChange([...value, item]);
      }
    },
    [value, onChange]
  );

  function removeItem(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function clearAll() {
    onChange([]);
  }

  function toggleItem(item: string) {
    if (value.includes(item)) {
      removeItem(item);
    } else {
      addItem(item);
    }
  }

  function handleCustomAdd() {
    const trimmed = customInput.trim();
    if (trimmed) {
      addItem(trimmed);
      setCustomInput("");
      setShowCustom(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < available.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : available.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < available.length) {
          toggleItem(available[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        setHighlightedIndex(-1);
        triggerRef.current?.focus();
        break;
    }
  }

  const selectedCount = value.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Selected pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-light text-brand text-xs rounded-full border border-brand/20"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="cursor-pointer hover:text-red-600 transition-colors"
                aria-label={`Remove ${item}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {value.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted hover:text-red-600 transition-colors cursor-pointer"
              aria-label="Clear all selections"
            >
              <X size={10} />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Trigger + Custom add button */}
      <div className="flex gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) {
              setSearch("");
              setHighlightedIndex(-1);
            }
          }}
          onKeyDown={(e) => {
            if (!open) handleKeyDown(e);
          }}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer transition-colors hover:border-brand/30"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={dropdownId}
          aria-label={placeholder}
        >
          <span className={selectedCount > 0 ? "text-text-primary" : "text-text-light"}>
            {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
          </span>
          <ChevronDown
            size={14}
            className={`text-text-light transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {allowCustom && !showCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="px-2 py-2 rounded-lg border border-surface-border text-text-muted hover:text-brand hover:border-brand/30 transition-colors cursor-pointer"
            title="Add custom value"
            aria-label="Add custom value"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          id={dropdownId}
          className="absolute z-50 mt-1 w-full bg-white border border-surface-border rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col"
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search input */}
          <div className="p-2 border-b border-surface-border shrink-0">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-light pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search options..."
                className="w-full pl-7 pr-2 py-1.5 rounded-md border border-surface-border text-xs bg-surface-bg focus:outline-none focus:ring-1 focus:ring-brand/20 focus:border-brand"
                aria-label="Search options"
              />
            </div>
          </div>

          {/* Options list */}
          <div ref={listRef} className="overflow-auto flex-1 py-1">
            {available.map((opt, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt}
                  type="button"
                  data-option
                  onClick={() => toggleItem(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors cursor-pointer text-left ${
                    isHighlighted
                      ? "bg-brand-light text-brand"
                      : "hover:bg-gray-50 text-text-primary"
                  }`}
                  role="option"
                  aria-selected={value.includes(opt)}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      value.includes(opt)
                        ? "bg-brand border-brand"
                        : "border-surface-border"
                    }`}
                  >
                    {value.includes(opt) && (
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M1.5 4L3 5.5L6.5 2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}
            {available.length === 0 && (
              <div className="text-center py-4 text-[11px] text-text-light">
                {search.trim()
                  ? "No matching options"
                  : "All options selected"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom input row */}
      {allowCustom && showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            ref={customInputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomAdd();
              }
              if (e.key === "Escape") {
                setShowCustom(false);
                setCustomInput("");
              }
            }}
            placeholder={customPlaceholder}
            className="flex-1 px-3 py-2 rounded-lg border border-surface-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <button
            type="button"
            onClick={handleCustomAdd}
            className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              setCustomInput("");
            }}
            className="px-2 py-2 rounded-lg border border-surface-border text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Cancel custom input"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden inputs for FormData submission */}
      {value.map((item) => (
        <input key={item} type="hidden" name={name} value={item} />
      ))}
    </div>
  );
}
