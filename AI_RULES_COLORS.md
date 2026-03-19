# 🎨 สีหลักของระบบ BPI AeroPath
# BPI AeroPath Color Palette

## ชุดสีหลัก (Main Color Palette)

### 1. Raisin Black 🖤
- **Background:** `#272727`
- **Font:** `#efd09e`
- **Usage:** หัวข้อหลัก, ปุ่ม hover/focus, ข้อความสำคัญ

### 2. Buff 🟤
- **Background:** `#7e5c4a`
- **Font:** `#efd09e`
- **Usage:** ปุ่มหลัก, ข้อความรอง, องค์ประกอบที่ต้องการความโดดเด่น

### 3. Sunset 🌅
- **Background:** `#d4aa7d`
- **Font:** `#272727`
- **Usage:** ปุ่มรอง, ไฮไลท์, สถานะพิเศษ

### 4. Creamy 🟡
- **Background:** `#efd09e`
- **Font:** `#272727`
- **Usage:** พื้นหลังเน้น, ข้อความบนพื้นหลังเข้ม

## สีเสริม (Supporting Colors)

### Page Background 📄
- **Background:** `#f6edde`
- **Usage:** พื้นหลังหน้าเพจทั่วไป

### Icon & Focus 🎯
- **Background:** `#9acd32`
- **Usage:** ไอคอน, โฟกัส, ลิงก์ที่เลือก, องค์ประกอบที่ต้องการดึงความสนใจ

## การใช้งานในโค้ด

### 1. TypeScript Configuration
```typescript
import { COLORS, UI_COLORS } from '@/config/colors';

// ใช้สีหลัก
const primaryBg = COLORS.BUFF.bg;
const primaryFont = COLORS.BUFF.font;

// ใช้สี UI
const buttonNormal = UI_COLORS.PRIMARY_BUTTON.normal;
```

### 2. Tailwind CSS Classes
```tsx
// สีหลัก
<div className="bg-buff text-creamy">
<div className="bg-raisin-black text-creamy">
<div className="bg-sunset text-raisin-black">
<div className="bg-creamy text-raisin-black">

// สีเสริม
<div className="bg-page-bg">
<div className="text-icon-focus">

// สีข้อความ
<p className="text-primary">
<p className="text-secondary">
<p className="text-accent">
<p className="text-muted">
```

### 3. CSS Variables
```css
.my-component {
  background-color: var(--buff);
  color: var(--creamy);
  border-color: var(--icon-focus);
}
```

## กฎการใช้สี (Color Usage Rules)

### ✅ การใช้ที่ถูกต้อง
- **Primary Button:** ใช้ `BUFF` (ปกติ) → `RAISIN_BLACK` (hover/focus)
- **Secondary Button:** ใช้ขอบ `BUFF` (ปกติ) → `SUNSET` (hover/focus)
- **Headings:** ใช้ `RAISIN_BLACK`
- **Body Text:** ใช้ `RAISIN_BLACK` หรือ `BUFF`
- **Links:** ใช้ `ICON_FOCUS`
- **Success:** ใช้ `#22c55e`
- **Warning:** ใช้ `#f59e0b`
- **Error:** ใช้ `#ef4444`

### ❌ การใช้ที่ควรหลีกเลี่ยง
- อย่าใช้ `CREAMY` บนพื้นหลัง `PAGE_BG` (ความคอนทราสต์ต่ำ)
- อย่าใช้ `SUNSET` สำหรับข้อความบนพื้นหลังสว่าง
- อย่าใช้สีสถานะ (`success`, `warning`, `error`) นอกเหนือจากการแสดงสถานะ
- อย่าใช้ `ICON_FOCUS` มากเกินไป (เฉพาะจุดที่ต้องการดึงความสนใจจริง)

## ตัวอย่างการใช้งานจริง

### ปุ่มหลัก
```tsx
<button className="bg-buff text-creamy border-buff hover:bg-raisin-black hover:border-raisin-black">
  Primary Action
</button>
```

### ปุ่มรอง
```tsx
<button className="bg-transparent text-buff border-buff hover:bg-sunset hover:text-raisin-black hover:border-sunset">
  Secondary Action
</button>
```

### การ์ด
```tsx
<div className="bg-page-bg border border-buff/20 rounded-lg p-4">
  <h3 className="text-raisin-black">Card Title</h3>
  <p className="text-buff">Card description</p>
</div>
```

### สถานะ
```tsx
<span className="text-status-success">✓ Active</span>
<span className="text-status-warning">⚠ Pending</span>
<span className="text-status-error">✗ Error</span>
```

## การอัปเดตสี

หากต้องการเปลี่ยนสีในอนาคต:
1. อัปเดตค่าใน `src/config/colors.ts`
2. อัปเดต CSS variables ใน `src/app/(main)/globals.css`
3. อัปเดต Tailwind colors ใน `tailwind.config.ts`
4. อัปเดตเอกสารนี้

**⚠️ ข้อควรระวัง:** อัปเดตทั้ง 3 ที่ให้สอดคล้องกันเสมอ!
