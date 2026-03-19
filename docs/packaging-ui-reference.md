# Packaging UI Reference (V1)

เอกสารนี้สรุป pattern สำคัญของหน้า Packaging เพื่อใช้อ้างอิงเวลาสร้างหน้าใหม่ให้โทนเดียวกัน

## 1) Theme Tokens (ใช้งานจริง)
- Primary background: `#F6EDDE`
- Surface card/table: `#EEF2F6`
- Header row: `#D4AA7D`
- Primary text: `#272727`
- Secondary text: `#7E5C4A`
- Accent green: `#9ACD32`
- Accent cream: `#EFD09E`
- Raisin black (interactive dark): `#272635`

## 2) Standard Table Pattern
ตัวอย่างใช้งาน: `src/app/projects/packaging/package-configuration/page.tsx`

- Container
  - `overflow-hidden rounded-[1.7rem] border border-white/80 bg-[#EEF2F6]/95`
  - เงา: `shadow-[10px_10px_24px_rgba(166,180,200,0.3),-10px_-10px_24px_rgba(255,255,255,0.92)]`
- Table base
  - ใช้ `table-fixed` เพื่อคุมคอลัมน์ให้นิ่ง
  - หลีกเลี่ยง `overflow-x-auto` ถ้าต้องการไม่เลื่อนซ้ายขวา
- Header
  - `bg-[#D4AA7D] text-xs font-black uppercase tracking-wider text-[#272727]`
- Body row hover
  - `hover:bg-[#272635]`
  - ข้อความหลักในแถวเปลี่ยนเป็น `#EFD09E`
- Badge ที่อยู่ใน row
  - ต้องมี `group-hover` สีที่ contrast ชัดเจน (โดยเฉพาะ `Allowed Types`)

## 3) Current Column Width Spec (Package Configuration)
- `Package Name / Outer`: `22%`
- `Category`: `10%`
- `Dimensions (Inner)`: `18%`
- `M3 Capacity`: `12%`
- `Allowed Types`: `14%`
- `Assigned Customers`: `24%`

หมายเหตุ
- กำหนดผ่าน `<colgroup>` เพื่อให้ปรับง่ายและไม่กระทบ data cell ทีละคอลัมน์

## 4) Header + Action Pattern
- ชื่อ section กับปุ่ม action อยู่บรรทัดเดียวกัน (`justify-between`)
- ฝั่งซ้าย: icon + title (เช่น `Defined Packages`)
- ฝั่งขวา: primary action (เช่น `New Package`)

## 5) Modal Pattern (Create/Edit/Delete)
- Backdrop
  - `fixed inset-0 ... bg-[#272727]/45 backdrop-blur-sm`
  - คลิกพื้นที่ว่างปิดได้ (`onClick` backdrop + `stopPropagation` panel)
- Panel
  - `rounded-[1.6~1.8rem] border border-white/80 bg-[#EEF2F6]/95`
  - shadow โทนอ่อนแบบเดียวกับหน้าหลัก
- Form layout
  - จัดเป็น grid เพื่อลดการ scroll
  - เป้าหมายคือ “ไม่ต้องเลื่อนขึ้นลง” ใน viewport มาตรฐาน desktop
- Confirm Delete
  - ห้ามใช้ `window.confirm`
  - ใช้ themed modal เดียวกับระบบ พร้อมปุ่ม `Cancel` / `Delete`

## 6) Data Cell Rules
- `Assigned Customers`
  - ใช้ badge แนวนอนแบบ `flex flex-wrap`
  - เมื่อยาวให้ขึ้นบรรทัดใหม่อัตโนมัติ
- `Allowed Types`
  - ต้องกำหนดสี hover แยกแต่ละ type ให้เห็นได้ในพื้นหลังเข้ม

## 7) Pack Planning V1 Interaction Rules (สรุปใช้อ้างอิง)
ตัวอย่างใช้งาน: `src/app/projects/packaging/planning/page.tsx`

- Normal mode
  - ซ่อนคอลัมน์ `Sel` และ `Actions`
- Edit mode
  - แสดง `Sel` และ `Actions`
  - มีความกว้างคอลัมน์เฉพาะโหมด edit ผ่าน `colgroup`
- Validation
  - แสดง `Validation Details` รวม `Errors`, `Warnings`, `Unsaved adjustments`
  - ถ้ามี error ต้อง block ปุ่ม `Proceed to Save`

## 8) Quick Implementation Checklist
ก่อนปิดงานหน้าใหม่ ให้เช็ก:
- ใช้ชุดสีหลักตาม Theme Tokens
- ตารางใช้ `table-fixed` + `colgroup`
- Row hover เป็น raisin black และข้อความยังอ่านได้
- Badge/Tag ทุกจุดมี hover contrast ที่ชัด
- Modal ปิดได้ด้วยการคลิกพื้นที่ว่าง
- ไม่มี horizontal scroll ที่ไม่จำเป็น
- ปุ่มสำคัญอยู่ตำแหน่งคงที่และชื่อสอดคล้อง action
