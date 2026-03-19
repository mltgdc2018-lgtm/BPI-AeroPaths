"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * SelectField Component
 * 
 * Dropdown select ที่เรียง A-Z อัตโนมัติ
 * พร้อม Popover สำหรับ Add/Edit/Delete รายการ
 * 
 * @param value - ค่าที่เลือกอยู่
 * @param options - รายการ options
 * @param onChange - callback เมื่อเลือก option
 * @param onOptionsChange - callback เมื่อ options เปลี่ยน (Add/Edit/Delete)
 * @param label - ชื่อ label
 * @param placeholder - placeholder text
 * @param allowManage - อนุญาตให้ Add/Edit/Delete (default: false)
 */

interface SelectFieldProps {
  value?: string;
  options: string[];
  onChange?: (value: string) => void;
  onOptionsChange?: (options: string[]) => void;
  label?: string;
  placeholder?: string;
  allowManage?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  value = "",
  options,
  onChange,
  onOptionsChange,
  label,
  placeholder = "Select...",
  allowManage = false,
  disabled = false,
  className,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // เรียง A-Z
  const sortedOptions = [...options].sort((a, b) => a.localeCompare(b));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingIndex(null);
        setShowNewInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange?.(option);
    setIsOpen(false);
  };

  const handleAdd = () => {
    if (newItemValue.trim() && !options.includes(newItemValue.trim())) {
      onOptionsChange?.([...options, newItemValue.trim()]);
      setNewItemValue("");
      setShowNewInput(false);
    }
  };

  const handleEdit = (index: number) => {
    if (editValue.trim()) {
      const newOptions = [...options];
      const originalValue = sortedOptions[index];
      const originalIndex = options.indexOf(originalValue);
      newOptions[originalIndex] = editValue.trim();
      onOptionsChange?.(newOptions);
      setEditingIndex(null);
      setEditValue("");
    }
  };

  const handleDelete = (index: number) => {
    const originalValue = sortedOptions[index];
    onOptionsChange?.(options.filter((o) => o !== originalValue));
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-1.5 z-20", className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm transition-all",
          "hover:border-indigo-300 hover:bg-indigo-50/30",
          "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          !value && "text-slate-400"
        )}
      >
        <span className={value ? "text-slate-700" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {/* Options List */}
          {sortedOptions.map((option, index) => (
            <div key={option} className="group flex items-center hover:bg-indigo-50/50">
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-1 p-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleEdit(index)}
                  />
                  <button onClick={() => handleEdit(index)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex-1 px-3 py-2 text-left text-sm text-slate-700",
                      value === option && "bg-indigo-100 text-indigo-700 font-medium"
                    )}
                  >
                    {option}
                  </button>
                  {allowManage && (
                    <div className="hidden group-hover:flex items-center gap-1 pr-2">
                      <button
                        onClick={() => { setEditingIndex(index); setEditValue(option); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Empty State */}
          {sortedOptions.length === 0 && !showNewInput && (
            <div className="px-3 py-4 text-center text-sm text-slate-400">
              No options available
            </div>
          )}

          {/* Add New Item */}
          {allowManage && (
            <div className="border-t border-slate-100">
              {showNewInput ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    type="text"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    placeholder="New item..."
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <button onClick={handleAdd} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowNewInput(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewInput(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50/50"
                >
                  <Plus className="w-4 h-4" /> Add New
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
