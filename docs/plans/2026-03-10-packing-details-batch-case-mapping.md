# Packing Details Batch Selection + Case Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ให้ปุ่ม `Download Packing Details` รองรับการเลือก `No.` แบบบางช่วงหรือทั้งหมด และสร้างเอกสาร `Packing Detail` แบบ `1 No. = 1 ใบ` พร้อมแมตช์ `Case no.` ใหม่ (เริ่มจากเลขที่ผู้ใช้กำหนด) และฝัง QR Code จาก `Pallet no.`

**Architecture:** เพิ่มชั้น preparation data ก่อน export: แปลง `planResult` เป็นรายการ `DetailSheetEntry[]` (flatten + filter + remap case numbers). เพิ่ม UI dialog สำหรับเลือกช่วง `No.` และ `startCaseNo`. ปรับ `pdfTemplateGenerator` เป็นแบบ page-per-entry โดยใช้ field coordinate map ที่ fixed ตาม template เดิม พร้อมวาดวงรอบตัวเลือก `Ship by` และฝัง QR จาก `Pallet no.`

**Tech Stack:** Next.js 16, React 19, TypeScript, pdf-lib, (new) qrcode

---

### Task 1: Define Export Data Contract and Selection Parser

**Files:**
- Create: `src/lib/packing-details/export.types.ts`
- Create: `src/lib/packing-details/export.helpers.ts`
- Modify: `src/lib/planning/adjustments.types.ts` (ถ้าต้องใช้ type ร่วม)

**Step 1: Write the failing test**

Create test scenarios for:
- parse range string: `"1-4,7-12,15"` -> `[1,2,3,4,7,8,9,10,11,12,15]`
- reject invalid tokens: `"4-2"`, `"a"`, `"1,,2"`
- flatten `planResult` แล้วคงลำดับ `No.` เดียวกับหน้า Review
- remap `Case no.` เริ่มที่ `4427` แล้วเพิ่มทีละ 1

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL/undefined references (helper/test scaffold ยังไม่มี)

**Step 3: Write minimal implementation**

Implement:
- `parseNoSelection(input: string): { selectedNos: number[]; errors: string[] }`
- `buildSheetEntries(planResult, options): DetailSheetEntry[]`
- `options`:
  - `mode: "all" | "range"`
  - `rangeInput?: string`
  - `startCaseNo: number`
  - `shipBy?: "Air" | "Sea" | "Courier"`
  - `palletNoPrefix?: string` (optional)

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: PASS for new helper/types

**Step 5: Commit**

```bash
git add src/lib/packing-details/export.types.ts src/lib/packing-details/export.helpers.ts src/lib/planning/adjustments.types.ts
git commit -m "feat: add packing details export contract and no-range parser"
```

### Task 2: Add Export Dialog UI on Planning Save Step

**Files:**
- Create: `src/components/projects/packaging/planning/PackingDetailsExportDialog.tsx`
- Modify: `src/app/projects/packaging/planning/page.tsx`

**Step 1: Write the failing test**

UI interaction scenarios:
- click `Download Packing Details` -> dialog opens
- mode `All` vs `Custom Range`
- input range `"1-4,7-12,15"` validation message
- input `Start Case no.` required and numeric

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL (component not found / props not defined)

**Step 3: Write minimal implementation**

Dialog fields:
- `Selection mode`: `All No.` / `Custom No.`
- `No. Range` text input (enabled only in custom mode)
- `Start Case no.` number input (default เช่น `4427`)
- `Ship by` radio/select (Air/Sea/Courier)
- `Pallet no. strategy`:
  - default: ใช้ `mappedCaseNo` เป็น `Pallet no.`
  - optional prefix (เช่น `PLT-4427`)

Action buttons:
- `Preview Count` (optional inline summary)
- `Generate PDF`

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/projects/packaging/planning/PackingDetailsExportDialog.tsx src/app/projects/packaging/planning/page.tsx
git commit -m "feat: add packing details export dialog with no selection and case mapping options"
```

### Task 3: Implement No. Selection + Case Mapping Pipeline

**Files:**
- Modify: `src/app/projects/packaging/planning/page.tsx`
- Modify: `src/lib/packing-details/export.helpers.ts`

**Step 1: Write the failing test**

Case mapping scenarios:
- selected `1-4,7-12,15` + `startCaseNo=4427` -> ได้ 11 ใบ และ `mappedCaseNo` = `4427..4437`
- `All No.` mode -> ครบทุก case
- custom range เกินจำนวนจริง -> แจ้ง error ชัดเจน

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL while wiring state and return types

**Step 3: Write minimal implementation**

Processing rules:
- flatten ทุก `PO/case` เป็น `No.` ต่อเนื่องเดียว (1..N)
- filter ตาม selection
- remap `caseNo` ใหม่จาก `startCaseNo`
- 1 selected `No.` สร้าง 1 `DetailSheetEntry`
- เก็บ metadata ต่อใบ:
  - `displayNo` (No. เดิมจาก plan)
  - `mappedCaseNo` (Case no. ใหม่)
  - `po`, `originalCaseNo`, `type`, `dims`, `items`

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/packaging/planning/page.tsx src/lib/packing-details/export.helpers.ts
git commit -m "feat: map selected plan numbers to sequential case numbers for packing details export"
```

### Task 4: Rebuild Packing Details PDF Generator (One Sheet Per Entry)

**Files:**
- Modify: `src/lib/utils/pdfTemplateGenerator.ts`
- Create: `src/lib/packing-details/templateFields.ts`

**Step 1: Write the failing test**

Generator scenarios:
- input 3 entries -> output PDF มี 3 หน้า
- text fields วางเฉพาะพื้นที่กรอก ไม่ทับ label
- shipBy = `Sea` -> มีวงรอบ `Sea`

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL (new signature not applied, fields map missing)

**Step 3: Write minimal implementation**

Refactor `generatePackingDetailsPDF`:
- รับ input ใหม่: `entries: DetailSheetEntry[]`, `customerName`, options
- clone template page ต่อ entry
- draw text ตาม `templateFields.ts` (`x,y,width,height` ที่ปรับแล้ว)
- render rows ของ item/qty ตาม capacity ตาราง
- วาดวงรอบ radio word:
  - `Air`, `Sea`, `Courier` ตาม `shipBy`
- รองรับ `type` mark (`Pallet/Box/Wrap`) ถ้าข้อมูลมี

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/pdfTemplateGenerator.ts src/lib/packing-details/templateFields.ts
git commit -m "feat: generate packing details as page-per-selected-number using fixed template coordinates"
```

### Task 5: Add QR Code Generation from Pallet No.

**Files:**
- Modify: `package.json`
- Modify: `src/lib/utils/pdfTemplateGenerator.ts`
- Modify: `src/lib/packing-details/export.helpers.ts`

**Step 1: Write the failing test**

QR scenarios:
- มี `palletNo` -> ฝัง QR ลงช่อง QR ของใบ
- ไม่มี `palletNo` -> ไม่ฝังและไม่ throw
- QR content ตรงกับ `palletNo`

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL (module `qrcode` missing)

**Step 3: Write minimal implementation**

Implementation:
- add dependency: `qrcode`
- generate data URL / PNG bytes จาก `palletNo`
- embed image ด้วย `pdf-lib` (PNG)
- draw ลง field `qr_area` พร้อม quiet-zone margin

Fallback:
- ถ้า QR generate fail ให้ continue export พร้อม warning log

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json src/lib/utils/pdfTemplateGenerator.ts src/lib/packing-details/export.helpers.ts
git commit -m "feat: embed pallet qr code in packing detail template"
```

### Task 6: Integrate and Guardrails in Page Flow

**Files:**
- Modify: `src/app/projects/packaging/planning/page.tsx`

**Step 1: Write the failing test**

Flow scenarios:
- validation errors ของ plan -> ปุ่ม export disabled เหมือนเดิม
- custom range invalid -> block generate
- selected count = 0 -> block generate

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: FAIL until final wiring complete

**Step 3: Write minimal implementation**

Integrate:
- เปลี่ยน `handleExportPackingDetails` เป็นเปิด dialog
- dialog submit -> build entries -> call `generatePackingDetailsPDF`
- แจ้งสรุปก่อนดาวน์โหลด:
  - selected No. count
  - mapped Case no. start/end

Error messaging:
- ใช้ข้อความที่ action ได้ เช่น `Range includes No. 73 but plan has only 60`

**Step 4: Run test to verify it passes**

Run:
- `npm run lint`
- `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/projects/packaging/planning/page.tsx
git commit -m "feat: wire packing details export dialog to generator with validation guardrails"
```

### Task 7: Manual Verification Checklist (Real Use Case)

**Files:**
- Modify: `docs/plans/2026-03-10-packing-details-batch-case-mapping.md` (append verification log)

**Step 1: Prepare scenario**

Input:
- select No.: `1-4,7-12,15`
- `startCaseNo`: `4427`
- shipBy: `Sea`

Expected:
- total sheets: `11`
- first mapped case: `4427`
- last mapped case: `4437`
- ทุกหน้ามีวงรอบ `Sea`
- ทุกหน้ามี QR จาก pallet no. ของหน้านั้น

**Step 2: Run manual checks**

Run app locally:
```bash
npm run dev
```
Open planning page, generate plan, export with above options, inspect PDF pages.

**Step 3: Record findings**

Add pass/fail notes and any coordinate adjustments needed.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-10-packing-details-batch-case-mapping.md
git commit -m "docs: add manual verification checklist for packing details batch export"
```

---

## Functional Detail (for implementation)

1. `No.` definition:
- `No.` คือ running index หลัง flatten ทุก case จาก `planResult` ตามลำดับที่แสดงใน Review table.

2. Selection grammar:
- single: `15`
- range: `7-12`
- combine: `1-4,7-12,15`
- spaces ignored
- duplicate auto-dedup + sort asc

3. Mapping behavior:
- selected `No.` list length = จำนวนเอกสาร
- remap case number:
  - `mappedCaseNo(i) = startCaseNo + i` (i เริ่ม 0)
- ตัวอย่าง:
  - selected: `1-4,7-12,15` (11 รายการ)
  - start: `4427`
  - mapped: `4427..4437`

4. Pallet/QR behavior:
- default palletNo ต่อใบ = string ของ `mappedCaseNo`
- QR content = palletNo ตรงๆ
- ถ้าผู้ใช้ใส่ prefix (`PLT-`) -> palletNo = `PLT-4427`

5. Output naming:
- `PackingDetails_<Customer>_<YYYY-MM-DD>_<count>pages.pdf`

6. Non-goals (รอบนี้):
- ยังไม่ทำ drag-and-drop reorder ของ `No.`
- ยังไม่ทำ mapping แบบ manual รายแถว (`No. -> Case no.` ทีละบรรทัด)

