import type { PlanAdjustmentRecord } from "@/lib/planning/adjustments.types";

interface AdjustmentHistoryPanelProps {
  records: PlanAdjustmentRecord[];
  errors: string[];
  warnings: string[];
}

export function AdjustmentHistoryPanel({ records, errors, warnings }: AdjustmentHistoryPanelProps) {
  return (
    <div className="rounded-2xl border border-[#D4AA7D]/35 bg-[#EEF2F6]/80 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#272727]">Validation</h4>
        {errors.length === 0 && warnings.length === 0 ? (
          <p className="mt-2 text-xs text-[#5a7a1a] font-bold">No blocking issue found.</p>
        ) : (
          <div className="mt-2 space-y-1 text-xs">
            {errors.map((message, idx) => (
              <p key={`e-${idx}`} className="text-rose-700">- {message}</p>
            ))}
            {warnings.map((message, idx) => (
              <p key={`w-${idx}`} className="text-amber-700">- {message}</p>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#272727]">Adjustment Timeline</h4>
        <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
          {records.length === 0 ? (
            <p className="text-xs text-[#7E5C4A]">No manual adjustment yet.</p>
          ) : (
            [...records].reverse().map((record) => (
              <div key={record.id} className="rounded-xl border border-[#D4AA7D]/30 bg-[#F8EEDB]/65 px-3 py-2">
                <p className="text-xs font-bold text-[#272727]">{record.label}</p>
                <p className="text-[11px] text-[#7E5C4A]">{new Date(record.at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
