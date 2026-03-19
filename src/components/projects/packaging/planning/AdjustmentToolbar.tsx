import { Edit3, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";

interface AdjustmentToolbarProps {
  isEditMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
}

export function AdjustmentToolbar({
  isEditMode,
  canUndo,
  canRedo,
  hasUnsavedChanges,
  onEnterEditMode,
  onExitEditMode,
  onUndo,
  onRedo,
  onDiscard,
}: AdjustmentToolbarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {isEditMode ? (
        <>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-2 rounded-full border border-[#D4AA7D]/60 bg-[#F8E3C0] px-4 py-2 text-xs font-bold text-[#6B4D3A] shadow-[0_8px_18px_rgba(39,38,53,0.2)] backdrop-blur-sm hover:bg-[#F3D7AF] disabled:opacity-45"
          >
            <Undo2 className="h-4 w-4 shrink-0 text-[#5a7a1a]" />
            <span>Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="inline-flex items-center gap-2 rounded-full border border-[#D4AA7D]/60 bg-[#F8E3C0] px-4 py-2 text-xs font-bold text-[#6B4D3A] shadow-[0_8px_18px_rgba(39,38,53,0.2)] backdrop-blur-sm hover:bg-[#F3D7AF] disabled:opacity-45"
          >
            <RotateCcw className="h-4 w-4 shrink-0 text-[#5a7a1a]" />
            <span>Redo</span>
          </button>
          <button
            onClick={onDiscard}
            disabled={!hasUnsavedChanges}
            className="group inline-flex items-center gap-2 rounded-full border border-[#D9AE7E] bg-[#FCEAD1] px-4 py-2 text-xs font-bold text-[#9A4F2A] shadow-[0_8px_18px_rgba(39,38,53,0.2)] hover:border-rose-500 hover:bg-[#F6DEC0] hover:text-rose-700 disabled:opacity-45"
          >
            <Trash2 className="h-4 w-4 shrink-0 text-[#5a7a1a] group-hover:text-rose-700" />
            <span>Discard</span>
          </button>
        </>
      ) : null}

      <button
        onClick={isEditMode ? onExitEditMode : onEnterEditMode}
        className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold shadow-[0_10px_24px_rgba(39,38,53,0.35)] ${
          isEditMode
            ? "border-[#D4AA7D]/70 bg-[#F3D7AF] text-[#5A3F2C] hover:border-[#EFD09E] hover:bg-[#272727] hover:text-[#EFD09E]"
            : "border-[#D4AA7D]/70 bg-[#F8E3C0] text-[#5A3F2C] hover:border-[#EFD09E] hover:bg-[#272727] hover:text-[#EFD09E]"
        }`}
      >
        {isEditMode ? (
          <Save className="h-4 w-4 shrink-0 text-[#5a7a1a]" />
        ) : (
          <Edit3 className="h-4 w-4 shrink-0 text-[#5a7a1a]" />
        )}
        <span>{isEditMode ? "Save & Exit Edit" : "Enter Edit"}</span>
      </button>
    </div>
  );
}
