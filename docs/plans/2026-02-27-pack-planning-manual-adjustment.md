# Pack Planning Manual Adjustment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ให้หน้า Pack Planning แก้ไขผลลัพธ์หลังคำนวณได้แบบควบคุมได้ มี audit trail และไม่ทำให้ยอดรวมเพี้ยน

**Architecture:** เก็บผลคำนวณดิบ (base result) แยกจากผลที่ผู้ใช้แก้ไข (effective result) ผ่านชั้น Adjustment Operations (reducer-driven). ทุกการแก้ไขถูกบันทึกเป็น operation พร้อม metadata และผ่าน validation ก่อน save/export. การแสดงผล, summary, PDF และการบันทึกจะอิง effective result โดยยังเก็บ base result สำหรับ traceability.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Firestore

---

### Task 1: Define Adjustment Domain Model

**Files:**
- Create: `src/lib/planning/adjustments.types.ts`
- Create: `src/lib/planning/adjustments.helpers.ts`
- Modify: `src/lib/services/packing-logic/packing.types.ts`

**Step 1: Write the failing test**

Create test cases for:
- operation schema validity (`update_case_note`, `update_item_qty`, `move_item`, `split_case`, `merge_cases`, `delete_case`, `add_case`)
- id generation uniqueness for adjustment records

**Step 2: Run test to verify it fails**

Run: `npm run test -- adjustments.types`
Expected: FAIL because test runner/types not ready

**Step 3: Write minimal implementation**

Define types:
- `PlanAdjustmentOp`
- `PlanAdjustmentRecord`
- `EditableCase` and `EditablePOCase`
- `AdjustmentContext` (customer, plan id, actor, timestamp)

Add helper:
- `createAdjustmentRecord(op, actor)`
- `clonePlanResult(planResult)`

**Step 4: Run test to verify it passes**

Run: `npm run test -- adjustments.types`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/planning/adjustments.types.ts src/lib/planning/adjustments.helpers.ts src/lib/services/packing-logic/packing.types.ts
git commit -m "feat: add planning adjustment domain types"
```

### Task 2: Build Adjustment Reducer (Pure Logic)

**Files:**
- Create: `src/lib/planning/adjustments.reducer.ts`
- Create: `src/lib/planning/adjustments.selectors.ts`

**Step 1: Write the failing test**

Cover reducer behavior:
- qty edit updates only target item
- split/merge keeps total qty unchanged
- delete case moves qty to pending/recovery case (or blocks delete if qty remains)
- case numbering re-sequences deterministically

**Step 2: Run test to verify it fails**

Run: `npm run test -- adjustments.reducer`
Expected: FAIL (reducer not implemented)

**Step 3: Write minimal implementation**

Implement:
- `applyAdjustment(base, op): effective`
- `applyAdjustments(base, ops): effective`
- selectors for recalculating PO totals and summary counters

Rules:
- ห้าม qty ติดลบ
- ห้ามสร้างเคสว่าง (0 item)
- รักษา deterministic order (`po`, `caseNo`)

**Step 4: Run test to verify it passes**

Run: `npm run test -- adjustments.reducer`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/planning/adjustments.reducer.ts src/lib/planning/adjustments.selectors.ts
git commit -m "feat: add pure reducer for pack planning manual adjustments"
```

### Task 3: Add Integrity Validation Layer

**Files:**
- Create: `src/lib/planning/adjustments.validation.ts`
- Modify: `src/app/projects/packaging/planning/page.tsx`

**Step 1: Write the failing test**

Validation scenarios:
- sum by `PO+SKU` after adjustments must equal parsed raw input
- duplicate `caseNo` detection
- invalid type/dims format warning

**Step 2: Run test to verify it fails**

Run: `npm run test -- adjustments.validation`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- `buildExpectedQtyMap(rawData)`
- `validateAdjustedResult(effective, expectedQtyMap)` returns `errors` and `warnings`

UI behavior:
- block `Save Plan` and `Export PDF` on `errors.length > 0`
- show warning badge for non-blocking issues

**Step 4: Run test to verify it passes**

Run: `npm run test -- adjustments.validation`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/planning/adjustments.validation.ts src/app/projects/packaging/planning/page.tsx
git commit -m "feat: add qty integrity validation for manual adjustments"
```

### Task 4: Implement Edit Mode in Pack Planning UI

**Files:**
- Modify: `src/app/projects/packaging/planning/page.tsx`
- Create: `src/components/projects/packaging/planning/AdjustmentToolbar.tsx`
- Create: `src/components/projects/packaging/planning/AdjustmentHistoryPanel.tsx`
- Create: `src/components/projects/packaging/planning/EditableCaseRow.tsx`

**Step 1: Write the failing test**

UI interaction scenarios:
- toggle Edit Mode
- inline edit qty/note/type
- undo/redo operation stack
- cancel edits restores base result

**Step 2: Run test to verify it fails**

Run: `npm run test -- pack-planning-edit-mode`
Expected: FAIL

**Step 3: Write minimal implementation**

Add state:
- `basePlanResult`
- `adjustmentRecords`
- `effectivePlanResult` (derived)
- `isEditMode`, `canUndo`, `canRedo`

Add actions:
- edit qty per item
- edit note/dim/type per case
- split selected case
- merge selected cases in same PO

Add UI controls:
- `Enter Edit Mode`
- `Undo`, `Redo`, `Discard Changes`
- `Validation status`

**Step 4: Run test to verify it passes**

Run: `npm run test -- pack-planning-edit-mode`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/packaging/planning/page.tsx src/components/projects/packaging/planning/AdjustmentToolbar.tsx src/components/projects/packaging/planning/AdjustmentHistoryPanel.tsx src/components/projects/packaging/planning/EditableCaseRow.tsx
git commit -m "feat: add editable result mode to pack planning page"
```

### Task 5: Persist Base + Adjusted + Audit Trail

**Files:**
- Modify: `src/lib/firebase/services/packaging.service.ts`
- Modify: `src/app/projects/packaging/planning/page.tsx`

**Step 1: Write the failing test**

Persistence cases:
- save payload includes `baseData`, `effectiveData`, `adjustments`
- load old plans (legacy `data`) still renders correctly
- load new plans restores edit history

**Step 2: Run test to verify it fails**

Run: `npm run test -- packaging-plan-persistence`
Expected: FAIL

**Step 3: Write minimal implementation**

Update save contract:
- `data` (legacy fallback)
- `baseData` (JSON)
- `effectiveData` (JSON)
- `adjustments` (array)
- `hasManualAdjustment` (boolean)
- `adjustmentCount` (number)

On save activity log:
- include detail `Adjusted: true/false` and count

Backward compatibility:
- if `effectiveData` missing, use `data`

**Step 4: Run test to verify it passes**

Run: `npm run test -- packaging-plan-persistence`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/firebase/services/packaging.service.ts src/app/projects/packaging/planning/page.tsx
git commit -m "feat: persist manual adjustment audit trail for packing plans"
```

### Task 6: Export and Save Guardrails

**Files:**
- Modify: `src/app/projects/packaging/planning/page.tsx`
- Modify: `src/lib/utils/pdfMakeGenerator.ts`

**Step 1: Write the failing test**

Scenarios:
- export uses effective result when manual edits exist
- PDF includes adjustment marker when `hasManualAdjustment` true
- export/save blocked when validation errors exist

**Step 2: Run test to verify it fails**

Run: `npm run test -- pack-planning-export`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- export data source = `effectivePlanResult`
- add PDF badge text `MANUALLY ADJUSTED` + count
- disable export/save buttons when blocking errors

**Step 4: Run test to verify it passes**

Run: `npm run test -- pack-planning-export`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/packaging/planning/page.tsx src/lib/utils/pdfMakeGenerator.ts
git commit -m "feat: enforce validation guardrails for export/save"
```

### Task 7: Regression + Manual QA Checklist

**Files:**
- Create: `docs/plans/pack-planning-adjustment-qa-checklist.md`

**Step 1: Write the failing test**

Define regression checklist with clear pass/fail evidence fields.

**Step 2: Run test to verify it fails**

Run: Manual QA dry run (expect fails before implementation)

**Step 3: Write minimal implementation**

Checklist cases:
- duplicate PO/SKU input
- unknown spec + warp cases
- split then merge same case chain
- reload saved adjusted plan
- export adjusted plan and verify totals

**Step 4: Run test to verify it passes**

Run:
- `npm run lint`
- execute checklist end-to-end on staging data

Expected: Lint pass + all checklist items pass

**Step 5: Commit**

```bash
git add docs/plans/pack-planning-adjustment-qa-checklist.md
git commit -m "docs: add QA checklist for pack planning manual adjustments"
```

## Notes / Scope Guard

- YAGNI: เริ่มจาก edit ที่จำเป็นก่อน (qty, note, split/merge) ยังไม่ทำ drag-and-drop ทั้งตารางในรอบแรก
- DRY: summary และ validation ต้อง derive จาก selector ชุดเดียว ห้ามคำนวณซ้ำหลายจุดในหน้า
- Safety: ห้าม overwrite ผลคำนวณดิบโดยตรง ให้เก็บ base เสมอ
- Rollout: เปิดด้วย feature flag (`PACK_PLANNING_MANUAL_EDIT=true`) ก่อนเปิดทั้งระบบ

