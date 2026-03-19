# BPI AeroPath - AI Development Rules & Guidelines

> **Last Updated:** January 30, 2026  
> **Project:** BPI AeroPath (Warehouse & Logistics Management System)  
> **Team:** 20 users (Internal Department)  
> **AI Tools:** Antigravity AI Pro, Windsurf

---

## 📌 Project Overview

**คุณคือ Senior Full-stack Developer ที่เชี่ยวชาญในการพัฒนาเว็บแอปพลิเคชันระดับโลกที่มี UI ทันสมัยแบบ Glassmorphism**

**ชื่อโปรเจค:** BPI AeroPath

**วัตถุประสงค์:** Centralized Work Hub สำหรับแผนกคลังสินค้าและโลจิสติคส์ รวมทุกงานไว้ในที่เดียว (Material Control, Warehouse, Delivery) เพื่อให้ทีมมองเห็นความเคลื่อนไหวของงาน (Visibility), ติดตามปัญหา (Tracking) และทำงานแทนกันได้ (Redundancy)

**Tech Stack:**

- **Frontend:** Next.js 14+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Typography:** Noto Sans Thai (Google Fonts)
- **Visual Style:** Modern Aero Glass (Glassmorphism + Gradients)
- **Backend:** Firebase (Auth, Firestore, Storage, Functions)
- **State Management:** Zustand + TanStack Query
- **Deployment:** Vercel (Frontend) + Firebase Functions
- **Version Control:** GitHub
- **CI/CD:** GitHub Actions

**Language & Communication:**

- **UI Language:** อังกฤษ (English) - เพื่อให้ดู Professional
- **Date Format (Display):** dd-mm-yyyy (เช่น 30-01-2026)
- **Currency:** THB (e.g., 1,250.00 ฿)
- **Code Comments:** ไทย + อังกฤษ (Thai + English)
- **Chat/Explanation:** ภาษาไทย (Thai) - อธิบายละเอียด เข้าใจง่าย

---

## 🎯 CORE PRINCIPLES

### 1. Single Source of Truth

```
- ทุก Module (Inventory, PO, Requisition) ต้องใช้ Database Schema เดียวกัน
- Type definitions ต้องอยู่กลาง (src/types) ห้ามประกาศซ้ำซ้อนใน Component
- API contracts ต้องชัดเจน
- Shared utilities อยู่ที่ src/lib/utils
```

### 2. Modern Aero Glass Design (Mandatory)

```
- Background: ใช้ Gradient ที่ดูลึกและทันสมัยตลอดทั้งแอพ
- Cards/Containers: ต้องเป็น Glassmorphism (โปร่งแสง, เบลอหลัง, มีขอบบางๆ)
- Interactions: Animation ต้องนุ่มนวล (Smooth transition)
- Status: ใช้สีและ Pulse animation เพื่อบ่งบอกความเร่งด่วน
- Icons: ใช้ Lucide React (สม่ำเสมอ)
```

### 3. Hub-and-Spoke Navigation

```
- Home Hub: คือศูนย์กลาง ทางเข้าทุกโปรเจคอยู่ที่นี่ และมี Dashboard รวม
- Navigation: User ต้องสามารถกลับ Home หรือสลับ Project ได้ง่ายผ่าน Sidebar/Navbar
- Breadcrumb: แสดงเส้นทางปัจจุบันเสมอ
```

### 4. Communication Rules

```
✅ ตอบคำถามและสนทนาเป็นภาษาไทยเสมอ
✅ อธิบาย code logic เป็นภาษาไทยแบบละเอียด
✅ เขียน comments ในโค้ดเป็นภาษาไทย+อังกฤษ
✅ ตั้งชื่อตัวแปรและ function เป็นภาษาอังกฤษ (ตาม convention)
✅ ใช้ภาษาไทยที่เป็นกันเอง เข้าใจง่าย ไม่เป็นทางการเกินไป
✅ UI Text ใช้ภาษาอังกฤษทั้งหมด
```

---

## 🎨 VISUAL DESIGN SYSTEM

### 1. Color Palette & Background

**Global Background:** Gradient ไล่เฉดสีเข้มเพื่อให้ Glass effect เด่นชัด

```css
/* globals.css / tailwind.config.ts extension */
.bg-app-gradient {
  background: radial-gradient(circle at top left, #1e293b, #0f172a);
  /* หรือใช้ Tailwind classes: bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 */
}
```

**Semantic Colors:**

```typescript
const colors = {
  primary: {
    DEFAULT: "#3b82f6", // blue-500
    hover: "#2563eb", // blue-600
  },
  success: "#10b981", // green-500
  warning: "#f59e0b", // amber-500
  error: "#ef4444", // red-500
  critical: "#dc2626", // red-600 (with pulse)
  info: "#06b6d4", // cyan-500
};
```

### 2. Glassmorphism Components

ทุก Card หรือ Container ต้องใช้ Style นี้:

**Glass Card:**

- **Background:** `bg-white/10` (Dark mode default) หรือ `bg-white/40` (Light mode)
- **Blur:** `backdrop-blur-md` หรือ `backdrop-blur-lg`
- **Border:** `border border-white/20`
- **Shadow:** `shadow-xl`
- **Rounded:** `rounded-2xl`

```tsx
// Example
<div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl p-6">
  {/* Content */}
</div>
```

### 3. Animations & Micro-interactions

**Hover Effects:**

```css
/* Lift up */
hover:-translate-y-1

/* Glow */
hover:shadow-blue-500/20

/* Duration */
transition-all duration-300 ease-out
```

**Status Badges:**

```
Normal: สีเขียว/ฟ้า นิ่งๆ
Warning: สีเหลือง/ส้ม อาจกระพริบเบาๆ
Critical/Alert: สีแดง/ส้ม พร้อม animate-pulse (กระพริบเบาๆ)
```

### 4. Responsiveness

```
Mobile First: ออกแบบให้ใช้งานบนมือถือได้จริง
Touch Target: > 44px (iOS/Android standard)
Desktop: ใช้ Grid layout (3-4 columns) สำหรับ Dashboard
Breakpoints: sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1536px
```

### 5. Typography

```
Headers: Font Weight 600-700 (font-semibold, font-bold)
Body: Font Weight 400 (font-normal)
Small Text: Font Weight 400 + text-sm
Code/Monospace: 'Fira Code' หรือ 'JetBrains Mono'
Default Font: Inter (Google Fonts)
```

### 6. Spacing & Layout (⚠️ Critical Rules)

> **Lesson Learned (Jan 30, 2026):** Tailwind v4 + global CSS reset `* { padding: 0; }`
> อาจทำให้ Tailwind padding classes เช่น `pt-32` ถูก override เป็น 0

**✅ Best Practices:**

1. **Critical Spacing (Navbar offset, Fixed elements):**
   - ใช้ **inline style** แทน Tailwind classes สำหรับ padding ที่สำคัญ
   - เพราะ inline style มี highest specificity และไม่ถูก override

   ```tsx
   // ✅ DO: ใช้ inline style สำหรับ padding-top ที่ต้อง offset จาก fixed navbar
   <section
     className="relative overflow-hidden pb-20"
     style={{ paddingTop: '160px' }}  // navbar height (64px) + extra spacing
   >

   // ❌ DON'T: พึ่ง Tailwind class อย่างเดียว (อาจถูก override)
   <section className="pt-32">
   ```

2. **ห้ามใช้ Global Reset ที่กินทุกอย่าง:**

   ```css
   /* ❌ DON'T: ห้ามใช้ใน globals.css */
   * {
     padding: 0;
     margin: 0;
   }

   /* ✅ DO: ใช้ Tailwind's preflight หรือ @layer base */
   @layer base {
     body {
       margin: 0;
     }
   }
   ```

3. **Consistent Navbar Offset:**
   - Navbar Height: `64px` (h-16)
   - Section Padding Top: `160px` (inline style) หรือ `pt-24+` ถ้า Tailwind works
   - ทดสอบใน browser เสมอก่อน commit

## 🧩 MODULE UI PATTERNS (Standard Alignment)

> **Lesson Learned (Feb 03, 2026):** เพื่อให้ทุก Module มีมาตรฐานเดียวกันและดู Professional ที่สุด ให้ใช้ลำดับชั้นและ Pattern ดังนี้:

### 1. Hierarchical Navigation (Hub-and-Spoke+)

- **Level 1 (Dashboard):** หน้ารวม Module (เช่น Dashboard ของ Smart Packaging)
- **Level 2 (Data Spec):** หน้าเลือกหมวดหมู่ (Category Selection)
- **Level 3 (Table View):** หน้าตารางข้อมูลล้วน (Table-only) โดยใช้ `DataTable`

### 2. UI Consistency (🚨 Avoid Redundancy)

- **ModuleHeader Integration:** ใช้ `ModuleHeader` ทุกหน้าในลำดับชั้น เพื่อจัดการ Title และปุ่มย้อนกลับให้เป็นมาตรฐานเดียวกัน
- **SearchToolbar Transparency:** ห้ามวาง `SearchToolbar` ซ้อนใน `GlassCard` หรือกล่องขาวอื่นอีก ให้วางลงบน `ModuleHeader` โดยตรง เพื่อรักษาความโปร่งใส (Transparency) และความคลีน
- **DataTable over GlassCard:** ตัว `DataTable` มี Wrapper เป็น GlassCard อยู่แล้ว ห้ามนำไปซ้อนใน `GlassCard` อื่นอีก เพื่อเลี่ยงการเกิดขอบซ้อน (Double Border)
- **Standard Modal Size:** หน้ารายละเอียด (Detail Modal) ให้ใช้ขนาด **`md:max-w-2xl`** เสมอ และจัดวางข้อมูลแบบ **Tabbed Info Grid** (Overview / History)

---

## 📁 FILE STRUCTURE (Hybrid Approach)

ใช้โครงสร้างแบบ Hybrid: แยก Route ตาม Feature แต่รวม Logic ที่ใช้ร่วมกันไว้ตรงกลาง

## 📁 Page vs Component Structure

### Next.js App Router Convention

Every route MUST be named `page.tsx` - this is Next.js requirement, not our choice.

### When to keep code in page.tsx:

- ✅ Simple pages (< 200 lines)
- ✅ Metadata-only pages
- ✅ Wrapper pages that import one main component

### When to extract to Component:

- ✅ Page logic > 200 lines
- ✅ Complex state management
- ✅ Reusable across multiple pages
- ✅ Needs unit testing separately

### Example Structure:

```
app/projects/material-control/inventory/page.tsx  → Route (wrapper)
components/projects/material-control/InventoryPage.tsx → UI Logic
components/projects/material-control/InventoryTable.tsx → Sub-component
```

```
bpi-aeropath/
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── test.yml
├── public/
│   ├── images/
│   ├── icons/
│   └── files/
├── src/
│   ├── app/                        # 🏠 Route Definitions (Next.js App Router)
│   │   ├── (auth)/                 # Login, Signup, Pending
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── pending/
│   │   ├── (main)/                 # Home Hub (Landing Page & Global Dashboard)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── projects/               # 📦 Project Modules
│   │   │   ├── material-control/   # Material Control System
│   │   │   │   ├── page.tsx
│   │   │   │   ├── inventory/
│   │   │   │   ├── requisition/
│   │   │   │   ├── receiving/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   ├── warehouse/          # Warehouse Management System
│   │   │   ├── delivery/           # Delivery Tracking
│   │   │   ├── documents/          # Document Center
│   │   │   ├── tasks/              # Task Management
│   │   │   ├── analytics/          # Dashboard & Analytics
│   │   │   ├── maintenance/        # Maintenance Log
│   │   │   └── staff/              # Staff Schedule
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/
│   │   │   ├── inventory/
│   │   │   └── reports/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/                 # 🧩 UI Components
│   │   ├── ui/                     # shadcn/ui (Atomic Components)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── shared/                 # Global Components
│   │   │   ├── GlassCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   └── ProjectCard.tsx
│   │   └── projects/               # Project-Specific Components
│   │       ├── material-control/
│   │       │   ├── MaterialForm.tsx
│   │       │   ├── StockLevelChart.tsx
│   │       │   ├── RequisitionForm.tsx
│   │       │   └── InventoryTable.tsx
│   │       └── warehouse/
│   ├── lib/                        # 🔧 Core Logic
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   └── storage.ts
│   │   ├── hooks/                  # Custom Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useStock.ts
│   │   │   ├── useMaterials.ts
│   │   │   └── useTransactions.ts
│   │   ├── utils/                  # Utility Functions
│   │   │   ├── formatters.ts       # Date, Currency formatters
│   │   │   ├── validators.ts
│   │   │   ├── helpers.ts
│   │   │   └── cn.ts               # classnames utility
│   │   └── constants.ts            # App-wide constants
│   ├── types/                      # 🏷️ TypeScript Interfaces
│   │   ├── index.ts                # Shared Types
│   │   ├── material.ts             # Material Domain Types
│   │   ├── transaction.ts
│   │   ├── user.ts
│   │   └── requisition.ts
│   ├── contexts/                   # React Contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── styles/                     # Global Styles
│   │   └── globals.css
│   └── middleware.ts               # Next.js Middleware (Auth)
├── e2e/                            # Playwright E2E Tests
│   ├── auth.spec.ts
│   └── material-control.spec.ts
├── AI_RULES.md                     # This file
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 📋 CODING STANDARDS

### Data Formatting (Strict)

```typescript
// ✅ Date Handling
// Store: Firestore Timestamp or ISO String
// Display: 'dd-mm-yyyy' (e.g., 30-01-2026)
import { format } from "date-fns";

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd-MM-yyyy");
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd-MM-yyyy HH:mm");
};

// ✅ Currency Handling
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Example: 1250.50 → "฿1,250.50" or "1,250.50 ฿"

// ✅ Filename Handling (downloads)
// Format: Prefix_Customer_YYYYMMDDHHmm.ext
```

### Type Definitions (Updated for BOM)

```typescript
// src/types/material.ts

export type MaterialCategory =
  | "raw-material"
  | "packaging"
  | "ingredient"
  | "supplies";
export type Unit = "kg" | "g" | "l" | "ml" | "pcs" | "box" | "bag" | "set";

export interface Material {
  id: string; // MAT-YYYYMMDD-XXXX
  name: string;
  nameEn: string; // English name for exports/reports
  sku: string;
  category: MaterialCategory;

  // Type Check
  type: "single" | "composite"; // composite = BOM/Set

  // Stock Info
  unit: Unit;
  currentStock: number;
  costPerUnit: number;

  // Thresholds & Alerts
  minStock: number; // Reorder Point (Yellow Badge)
  criticalStock: number; // Critical Level (Red Pulse Badge)
  maxStock: number;

  // For Composite Items (BOM)
  components?: {
    materialId: string;
    quantity: number; // Amount needed per 1 set
  }[];

  // Meta
  location: string; // e.g., "Z1-A-01" (Zone-Row-Shelf)
  suppliers: string[];
  barcode?: string;
  imageUrl?: string;
  description?: string;
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

// Transaction Types
export type TransactionType =
  | "receive"
  | "issue"
  | "adjust"
  | "loss"
  | "transfer";

export interface Transaction {
  id: string; // TRX-TYPE-YYYYMMDD-XXXX
  type: TransactionType;
  materialId: string;
  quantity: number;
  unit: Unit;
  fromLocation?: string;
  toLocation?: string;
  reference: string; // เลขที่เอกสารอ้างอิง (PO, RQ, etc.)
  notes?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  costPerUnit?: number;
  totalCost?: number;
}

// Requisition
export interface Requisition {
  id: string; // RQ-YYYYMMDD-XXXX
  reqNumber: string;
  requestedBy: string;
  department: string;
  items: RequisitionItem[];
  status: "pending" | "approved" | "rejected" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  notes?: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
}

export interface RequisitionItem {
  materialId: string;
  materialName: string;
  requestedQty: number;
  approvedQty?: number;
  issuedQty?: number;
  unit: Unit;
}

// User
export interface User {
  uid: string; // USR-XXXXXX
  email: string;
  displayName: string;
  role: "admin" | "manager" | "staff";
  department: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
  status: "active" | "pending" | "inactive";
}
```

### Naming Conventions

```typescript
// Files & Folders
// ✅ Components: PascalCase (MaterialCard.tsx, GlassCard.tsx)
// ✅ Utilities: camelCase (calculateStock.ts, formatDate.ts)
// ✅ Hooks: camelCase with 'use' prefix (useMaterials.ts, useAuth.ts)
// ✅ Types: PascalCase (Material.ts, Transaction.ts)
// ✅ Constants: UPPER_SNAKE_CASE (API_ENDPOINTS.ts, COLORS.ts)

// Variables & Functions
// ✅ camelCase for variables (materialList, currentStock)
// ✅ camelCase for functions (getMaterial, updateStock)
// ✅ PascalCase for React components (MaterialForm, GlassCard)
// ✅ UPPER_SNAKE_CASE for constants (MAX_STOCK_LIMIT, API_URL)

// Database Collections (Firestore)
// ✅ snake_case (materials, stock_transactions, receiving_notes)
// ✅ Plural nouns (materials, suppliers, users)

// Example
const MAX_ITEMS_PER_PAGE = 50; // constant
const materialList = await getMaterials(); // variable
const currentStock = calculateCurrentStock(transactions); // variable

function calculateCurrentStock(transactions: Transaction[]): number {
  return transactions.reduce((acc, txn) => {
    if (txn.type === "receive") return acc + txn.quantity;
    if (txn.type === "issue") return acc - txn.quantity;
    return acc;
  }, 0);
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material }) => {
  // component implementation
};
```

### Document ID Pattern

```typescript
// ✅ DO: Use consistent ID patterns

// Materials: MAT-YYYYMMDD-XXXX
const materialId = `MAT-${format(new Date(), "yyyyMMdd")}-${generateId(4)}`;
// Example: MAT-20260130-0001

// Transactions: TRX-TYPE-YYYYMMDD-XXXX
const transactionId = `TRX-RCV-${format(new Date(), "yyyyMMdd")}-${generateId(4)}`;
// Example: TRX-RCV-20260130-0001

// Documents: DOCTYPE-YYYYMMDD-XXXX
const requisitionId = `RQ-${format(new Date(), "yyyyMMdd")}-${generateId(4)}`;
// Example: RQ-20260130-0001

// Users: USR-XXXXXX
const userId = `USR-${generateId(6)}`;
// Example: USR-ABC123

// Projects: PRJ-SHORTNAME
const projectId = `PRJ-MATCTRL`;
// Example: PRJ-MATCTRL, PRJ-WAREHOUSE

// Helper function
function generateId(length: number): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
}
```

---

## 🎨 COMPONENT TEMPLATES (AI Instructions)

เมื่อ AI สร้าง Component ใหม่ ให้ใช้ Pattern นี้:

### 1. Glass Card Wrapper

```tsx
// components/shared/GlassCard.tsx
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  className,
  hoverEffect = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl p-6 text-white",
        hoverEffect &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-white/15 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

### 2. Status Badge with Pulse

```tsx
// components/shared/StatusBadge.tsx
import { cn } from "@/lib/utils";

type BadgeStatus = "normal" | "warning" | "critical" | "success" | "info";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
}: StatusBadgeProps) {
  const styles: Record<BadgeStatus, string> = {
    normal: "bg-blue-500/20 text-blue-200 border-blue-500/50",
    success: "bg-green-500/20 text-green-200 border-green-500/50",
    warning: "bg-amber-500/20 text-amber-200 border-amber-500/50",
    critical: "bg-red-500/20 text-red-200 border-red-500/50 animate-pulse",
    info: "bg-cyan-500/20 text-cyan-200 border-cyan-500/50",
  };

  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full border text-xs font-medium backdrop-blur-sm flex items-center gap-2 w-fit",
        styles[status],
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-2 h-2 rounded-full bg-current",
            status === "critical" && "animate-ping",
          )}
        />
      )}
      {label || status.toUpperCase()}
    </span>
  );
}
```

### 3. Component Structure Template

```typescript
// Standard Component Pattern
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// 🔷 Local imports
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { useMaterials } from '@/lib/hooks/useMaterials';
import type { Material } from '@/types/material';

// 🔷 Types/Interfaces
interface MaterialFormProps {
  initialData?: Material;
  onSubmit: (data: Material) => Promise<void>;
  onCancel: () => void;
}

// 🔷 Schemas (if using Zod)
const materialSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อวัตถุดิบ'),
  sku: z.string().min(1, 'กรุณากรอกรหัสสินค้า'),
  category: z.enum(['raw-material', 'packaging', 'ingredient', 'supplies']),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'pcs', 'box', 'bag']),
  minStock: z.number().min(0, 'ต้องมากกว่าหรือเท่ากับ 0'),
  currentStock: z.number().min(0, 'ต้องมากกว่าหรือเท่ากับ 0'),
});

type MaterialFormData = z.infer<typeof materialSchema>;

// 🔷 Component
export function MaterialForm({ initialData, onSubmit, onCancel }: MaterialFormProps) {
  // 🔸 Hooks
  const [isLoading, setIsLoading] = useState(false);
  const { materials } = useMaterials();
  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData || {
      name: '',
      sku: '',
      category: 'raw-material',
      unit: 'kg',
      minStock: 0,
      currentStock: 0,
    },
  });

  // 🔸 Effects
  useEffect(() => {
    // Effect logic here
  }, []);

  // 🔸 Handlers
  const handleSubmit = async (data: MaterialFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data as Material);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔸 Return JSX
  return (
    <GlassCard>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Form fields */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
```

---

## 🔐 DATABASE & SECURITY RULES

### Firestore Collections Strategy

```typescript
// Collection Names (snake_case)
const COLLECTIONS = {
  USERS: "users",
  MATERIALS: "materials",
  TRANSACTIONS: "transactions",
  REQUISITIONS: "requisitions",
  RECEIVING_NOTES: "receiving_notes",
  SUPPLIERS: "suppliers",
  PROJECTS: "projects",
  ACTIVITY_LOGS: "activity_logs",
} as const;
```

**Collections:**

- `users`: เก็บข้อมูลผู้ใช้, Role, Department
- `materials`: เก็บ Master Data ของสินค้า (รวม BOM info)
- `transactions`: เก็บประวัติการเคลื่อนไหว (Receive, Issue, Adjust, Loss)
  - **Note:** การตัดสต็อกต้องใช้ `runTransaction` เสมอ เพื่อความแม่นยำ
- `requisitions`: ใบเบิกจ่าย
- `receiving_notes`: ใบรับสินค้า
- `suppliers`: ข้อมูล Supplier
- `projects`: Config ของแต่ละโปรเจค (ถ้ามี)
- `activity_logs`: บันทึกการทำงาน (Audit trail)

### Security Rules (Firestore)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 🔹 Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function hasRole(role) {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }

    function isActiveUser() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
    }

    // 🔹 Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated(); // For signup
      allow update: if isOwner(userId) || hasRole('admin');
      allow delete: if hasRole('admin');
    }

    // 🔹 Materials collection
    match /materials/{materialId} {
      allow read: if isAuthenticated();
      allow create: if isActiveUser();
      allow update: if isActiveUser();
      allow delete: if hasRole('admin');
    }

    // 🔹 Transactions (ห้ามลบ - Audit trail)
    match /transactions/{transactionId} {
      allow read: if isAuthenticated();
      allow create: if isActiveUser();
      allow update: if hasRole('admin'); // Only admin can correct mistakes
      allow delete: if false; // ห้ามลบ transaction
    }

    // 🔹 Requisitions
    match /requisitions/{reqId} {
      allow read: if isAuthenticated();
      allow create: if isActiveUser();
      allow update: if isActiveUser() || hasRole('manager');
      allow delete: if hasRole('admin');
    }

    // 🔹 Activity Logs (Read-only for regular users)
    match /activity_logs/{logId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only server-side can write logs
    }
  }
}
```

### Storage Rules (Firebase Storage)

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }

    function isDocument() {
      return request.resource.contentType.matches('application/pdf') ||
             request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.*') ||
             request.resource.contentType.matches('text/csv');
    }

    function isValidSize(maxSizeMB) {
      return request.resource.size < maxSizeMB * 1024 * 1024;
    }

    // Material images
    match /materials/{materialId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isImage() && isValidSize(5); // Max 5MB
    }

    // Documents (PO, Invoice, etc.)
    match /documents/{category}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isDocument() && isValidSize(10); // Max 10MB
    }

    // User avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if isAuthenticated() &&
                    request.auth.uid == userId &&
                    isImage() &&
                    isValidSize(2); // Max 2MB
    }
  }
}
```

---

## 🧪 TESTING GUIDELINES

### Testing Strategy

```
Unit Tests (Vitest)        → 60% coverage target
Integration Tests (Vitest) → 30% coverage target
E2E Tests (Playwright)     → 10% coverage target
```

### Unit Testing with Vitest

#### Setup

```bash
# Install dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```typescript
// src/tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

#### Writing Unit Tests

```typescript
// src/lib/utils/calculateStock.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateCurrentStock,
  isLowStock,
  isCriticalStock,
} from "./calculateStock";
import type { Transaction } from "@/types/material";

describe("calculateStock utilities", () => {
  describe("calculateCurrentStock", () => {
    it("should calculate stock correctly with receives and issues", () => {
      const transactions: Transaction[] = [
        { type: "receive", quantity: 100 } as Transaction,
        { type: "issue", quantity: 30 } as Transaction,
        { type: "receive", quantity: 50 } as Transaction,
      ];

      const result = calculateCurrentStock(transactions);

      expect(result).toBe(120); // 100 - 30 + 50
    });

    it("should handle empty transactions", () => {
      expect(calculateCurrentStock([])).toBe(0);
    });

    it("should handle adjustments", () => {
      const transactions: Transaction[] = [
        { type: "receive", quantity: 100 } as Transaction,
        { type: "adjust", quantity: -10 } as Transaction, // ปรับลด 10
      ];

      expect(calculateCurrentStock(transactions)).toBe(90);
    });

    it("should handle loss transactions", () => {
      const transactions: Transaction[] = [
        { type: "receive", quantity: 100 } as Transaction,
        { type: "loss", quantity: 15 } as Transaction,
      ];

      expect(calculateCurrentStock(transactions)).toBe(85);
    });
  });

  describe("isLowStock", () => {
    it("should return true when stock is below minimum", () => {
      expect(isLowStock(5, 10)).toBe(true);
    });

    it("should return false when stock is above minimum", () => {
      expect(isLowStock(15, 10)).toBe(false);
    });

    it("should return false when stock equals minimum", () => {
      expect(isLowStock(10, 10)).toBe(false);
    });
  });

  describe("isCriticalStock", () => {
    it("should return true when stock is at or below critical level", () => {
      expect(isCriticalStock(5, 5)).toBe(true);
      expect(isCriticalStock(3, 5)).toBe(true);
    });

    it("should return false when stock is above critical level", () => {
      expect(isCriticalStock(10, 5)).toBe(false);
    });
  });
});
```

#### Testing React Components

```typescript
// src/components/projects/material-control/MaterialCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialCard } from './MaterialCard';
import type { Material } from '@/types/material';

describe('MaterialCard', () => {
  const mockMaterial: Material = {
    id: 'MAT-20260130-0001',
    name: 'Test Material',
    nameEn: 'Test Material',
    sku: 'TEST-001',
    category: 'raw-material',
    type: 'single',
    unit: 'kg',
    currentStock: 50,
    minStock: 20,
    criticalStock: 10,
    maxStock: 100,
    costPerUnit: 150,
    suppliers: ['SUP-001'],
    location: 'Z1-A-01',
    lastUpdated: new Date(),
    createdAt: new Date(),
    createdBy: 'USR-001',
    isActive: true,
  };

  it('should render material information correctly', () => {
    render(<MaterialCard material={mockMaterial} />);

    expect(screen.getByText('Test Material')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('should show low stock warning when stock is below minimum', () => {
    const lowStockMaterial = { ...mockMaterial, currentStock: 15 };
    render(<MaterialCard material={lowStockMaterial} />);

    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('should show critical stock alert when stock is at critical level', () => {
    const criticalStockMaterial = { ...mockMaterial, currentStock: 8 };
    render(<MaterialCard material={criticalStockMaterial} />);

    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<MaterialCard material={mockMaterial} onClick={handleClick} />);

    const card = screen.getByRole('article'); // assuming MaterialCard has role="article"
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledWith(mockMaterial.id);
  });
});
```

#### Testing Hooks

```typescript
// src/lib/hooks/useMaterials.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMaterials } from './useMaterials';

// Mock Firebase
vi.mock('@/lib/firebase/firestore', () => ({
  getMaterials: vi.fn(() => Promise.resolve([
    { id: 'MAT-1', name: 'Material 1', currentStock: 100 },
    { id: 'MAT-2', name: 'Material 2', currentStock: 50 },
  ])),
}));

describe('useMaterials', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('should fetch materials successfully', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useMaterials(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Material 1');
  });
});
```

### E2E Testing with Playwright

#### Setup

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Writing E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");

    // กรอก email และ password
    await page.fill('input[name="email"]', "test@bpi.com");
    await page.fill('input[name="password"]', "password123");

    // คลิกปุ่ม login
    await page.click('button[type="submit"]');

    // ตรวจสอบว่า redirect ไปหน้า home
    await expect(page).toHaveURL("/");

    // ตรวจสอบว่าเห็น welcome message
    await expect(page.locator("text=Welcome to BPI AeroPath")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "wrong@email.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // ตรวจสอบ error message (ภาษาไทย)
    await expect(
      page.locator("text=/ข้อมูลไม่ถูกต้อง|invalid/i"),
    ).toBeVisible();
  });
});
```

```typescript
// e2e/material-control.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Material Control", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@bpi.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("should navigate to material control from home", async ({ page }) => {
    // คลิกที่ Material Control card
    await page.click("text=Material Control");

    // ตรวจสอบว่า URL ถูกต้อง
    await expect(page).toHaveURL("/projects/material-control");

    // ตรวจสอบว่าเห็น inventory table
    await expect(page.locator("table")).toBeVisible();
  });

  test("should create new requisition", async ({ page }) => {
    await page.goto("/projects/material-control/requisition");

    // คลิกปุ่ม New Requisition
    await page.click('button:has-text("New Requisition")');

    // กรอกฟอร์ม
    await page.selectOption('select[name="department"]', "Production");
    await page.fill('textarea[name="notes"]', "Urgent order");

    // เพิ่ม material
    await page.click('button:has-text("Add Item")');
    await page.selectOption(
      'select[name="items.0.materialId"]',
      "MAT-20260130-0001",
    );
    await page.fill('input[name="items.0.requestedQty"]', "50");

    // Submit
    await page.click('button[type="submit"]');

    // ตรวจสอบ success message
    await expect(
      page.locator("text=/สร้างสำเร็จ|created successfully/i"),
    ).toBeVisible();
  });

  test("should filter materials by category", async ({ page }) => {
    await page.goto("/projects/material-control/inventory");

    // เลือก category filter
    await page.selectOption('select[name="category"]', "raw-material");

    // รอให้ table update
    await page.waitForTimeout(500);

    // ตรวจสอบว่าแสดงเฉพาะ raw materials
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

### Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment Checklist

#### 1. Code Quality

```
✅ All tests passing (unit + E2E)
✅ No TypeScript errors
✅ No console.log/console.error in production code
✅ No commented-out code
✅ Code reviewed and approved
✅ Linting passed (ESLint)
✅ Formatting correct (Prettier)
```

#### 2. Security

```
✅ Environment variables configured correctly
✅ No API keys or secrets in code
✅ Firestore security rules updated
✅ Firebase Storage rules updated
✅ Authentication middleware working
✅ CORS configured properly
✅ Rate limiting implemented (if needed)
✅ SQL injection prevention (N/A for Firestore)
✅ XSS protection enabled
```

#### 3. Performance

```
✅ Images optimized (using Next.js Image)
✅ Lazy loading implemented
✅ Bundle size checked (< 200KB initial load)
✅ Lighthouse score > 90
✅ No memory leaks
✅ Database queries optimized
✅ Pagination implemented for large lists
✅ Caching strategy in place
```

#### 4. Functionality

```
✅ All features tested manually
✅ Mobile responsive (tested on multiple devices)
✅ Cross-browser compatible (Chrome, Firefox, Safari)
✅ Error handling working correctly
✅ Loading states showing properly
✅ Success/error messages displaying (ภาษาไทย)
✅ Navigation flow working (Home Hub → Projects → Home)
✅ All forms validated properly
```

#### 5. Firebase

```
✅ Firestore indexes created
✅ Storage buckets configured
✅ Cloud Functions deployed (if any)
✅ Firebase config updated for production
✅ Backup strategy in place
✅ Billing alerts configured
```

#### 6. Documentation

```
✅ README updated
✅ CHANGELOG updated
✅ API documentation complete
✅ Component documentation complete
✅ Deployment guide written
✅ User guide prepared (if needed)
```

### Deployment Steps

#### Step 1: Prepare Environment Variables

```bash
# .env.production
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bpi-aeropath.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bpi-aeropath
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bpi-aeropath.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_APP_URL=https://bpi-aeropath.vercel.app
NODE_ENV=production
```

#### Step 2: Build and Test

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Run E2E tests against production build
npm run test:e2e
```

#### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI (first time only)
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Via Vercel Dashboard:**

1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

#### Step 4: Post-Deployment Verification

```
✅ Visit production URL
✅ Test login flow
✅ Test critical features (Material Control, Requisition, etc.)
✅ Check error tracking (Sentry, if configured)
✅ Verify Firebase connection
✅ Check analytics (if configured)
✅ Test on mobile devices
✅ Verify email notifications (if any)
✅ Check performance (Lighthouse)
✅ Verify all environment variables loaded
```

### Rollback Plan

```bash
# If deployment has issues, rollback to previous version

# Via Vercel Dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "..." → "Promote to Production"

# Via CLI:
vercel rollback [deployment-url]

# Emergency: Disable entire site
# Set maintenance mode in Vercel dashboard
```

### Environment-Specific Configs

```typescript
// src/lib/config.ts
const config = {
  development: {
    apiUrl: "http://localhost:3000",
    enableDebug: true,
    logLevel: "debug",
    enableAnalytics: false,
  },
  staging: {
    apiUrl: "https://staging.bpi-aeropath.vercel.app",
    enableDebug: true,
    logLevel: "info",
    enableAnalytics: false,
  },
  production: {
    apiUrl: "https://bpi-aeropath.vercel.app",
    enableDebug: false,
    logLevel: "error",
    enableAnalytics: true,
  },
};

export const getConfig = () => {
  const env = (process.env.NODE_ENV || "development") as keyof typeof config;
  return config[env];
};
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### 1. Firebase Connection Issues

**Problem:** "Firebase not initialized" error

**Solution:**

```typescript
// ✅ Correct: Initialize Firebase once
// src/lib/firebase/config.ts
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if already initialized
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export default app;
```

**Checklist:**

- ✅ ตรวจสอบว่า environment variables ครบถ้วน
- ✅ ตรวจสอบว่า Firebase project ID ถูกต้อง
- ✅ ตรวจสอบ Firebase Console ว่า enable services แล้ว
- ✅ Restart development server

---

#### 2. Authentication Not Working

**Problem:** User cannot login / redirect loop

**Solution:**

```typescript
// ตรวจสอบ middleware
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token");
  const { pathname } = request.nextUrl;

  // Allow access to login/signup pages
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    if (token) {
      // ถ้ามี token แล้ว redirect ไป home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!token && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
};
```

**Checklist:**

- ✅ ตรวจสอบ cookie settings
- ✅ ตรวจสอบ Firebase Auth configuration
- ✅ ลอง clear browser cache/cookies
- ✅ ตรวจสอบ CORS settings
- ✅ ตรวจสอบ middleware matcher pattern

---

#### 3. Firestore Permission Denied

**Problem:** "Missing or insufficient permissions"

**Solution:**

```javascript
// firestore.rules - Debug mode (ชั่วคราว)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ⚠️ Debug: เปิด read ทุกคนก่อน (ชั่วคราว - อย่าใช้ใน production!)
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Production Rules:**

```javascript
// Deploy rules ใหม่ใน Firebase Console
firebase deploy --only firestore:rules
```

**Checklist:**

- ✅ ตรวจสอบว่า user login แล้ว
- ✅ Deploy Firestore rules ใหม่
- ✅ ตรวจสอบ user role ถูกต้อง
- ✅ ลอง test ด้วย Firebase Console (Firestore → Rules → Simulator)
- ✅ ตรวจสอบ request.auth ไม่เป็น null

---

#### 4. Data Not Updating in Real-Time

**Problem:** Changes not reflecting immediately

**Solution:**

```typescript
// ✅ ใช้ onSnapshot สำหรับ real-time
import { onSnapshot, collection } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useMaterialsRealtime() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "materials"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Material[];
        setMaterials(data);
        setLoading(false);
      },
      (err) => {
        console.error("Snapshot error:", err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe(); // Cleanup
  }, []);

  return { materials, loading, error };
}
```

**Checklist:**

- ✅ ใช้ `onSnapshot` แทน `getDocs`
- ✅ ตรวจสอบว่า cleanup function ทำงาน
- ✅ Invalidate React Query cache หลัง mutation
- ✅ ตรวจสอบ network connection
- ✅ ตรวจสอบว่าไม่มี infinite loop

---

#### 5. Images Not Loading

**Problem:** Images showing broken/404

**Solution:**

```typescript
// ✅ ใช้ Next.js Image component
import Image from 'next/image';

// Local images (ใน /public)
<Image
  src="/images/logo.png"
  alt="BPI AeroPath"
  width={200}
  height={50}
  priority // สำหรับ above-the-fold images
/>

// External images
<Image
  src="https://firebasestorage.googleapis.com/..."
  alt="Material image"
  width={200}
  height={200}
  unoptimized={false} // Optimize by default
/>
```

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "ui-avatars.com",
      "lh3.googleusercontent.com", // Google avatars
    ],
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;
```

**Checklist:**

- ✅ ตรวจสอบ path ถูกต้อง
- ✅ เพิ่ม domain ใน next.config.js
- ✅ ตรวจสอบ file permissions
- ✅ ลอง access โดยตรงใน browser
- ✅ ตรวจสอบ Firebase Storage rules

---

#### 6. Build Errors

**Problem:** "Module not found" during build

**Solution:**

```bash
# ลบ node_modules และ reinstall
rm -rf node_modules
rm package-lock.json
npm install

# ลบ .next cache
rm -rf .next

# Build ใหม่
npm run build
```

**Checklist:**

- ✅ ตรวจสอบ import paths (@/ alias)
- ✅ ตรวจสอบ dependencies ใน package.json
- ✅ ตรวจสอบ TypeScript errors
- ✅ ลอง build บน local ก่อน
- ✅ ตรวจสอบ tsconfig.json paths

---

#### 7. Slow Performance

**Problem:** App loading slow / laggy

**Solutions:**

```typescript
// 1. Lazy load components
import { lazy, Suspense } from 'react';

const MaterialForm = lazy(() => import('@/components/projects/material-control/MaterialForm'));

function MyComponent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MaterialForm />
    </Suspense>
  );
}

// 2. Memoize expensive calculations
import { useMemo } from 'react';

const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// 3. Virtualize long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>

// 4. Optimize Firestore queries
import { query, collection, where, orderBy, limit } from 'firebase/firestore';

const q = query(
  collection(db, 'materials'),
  where('isActive', '==', true),
  orderBy('name'),
  limit(50) // จำกัดจำนวน
);

// 5. Use React.memo for expensive components
import { memo } from 'react';

export const MaterialCard = memo(({ material }: Props) => {
  // component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.material.id === nextProps.material.id;
});
```

**Checklist:**

- ✅ ใช้ Lighthouse audit
- ✅ ตรวจสอบ bundle size (npm run build → analyze)
- ✅ Optimize images (WebP, AVIF)
- ✅ Enable caching headers
- ✅ Add loading states ทุก async action
- ✅ Use React DevTools Profiler
- ✅ Check Network tab สำหรับ slow requests

---

#### 8. TypeScript Errors

**Problem:** Type errors ที่แก้ไม่ได้

**Solution:**

```typescript
// ✅ Option 1: Type assertion (ใช้เมื่อแน่ใจว่า type ถูกต้อง)
const data = unknownData as Material;

// ✅ Option 2: Type guard (แนะนำ)
function isMaterial(obj: unknown): obj is Material {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "name" in obj &&
    "sku" in obj
  );
}

if (isMaterial(data)) {
  // TypeScript รู้ว่า data เป็น Material แน่นอน
  console.log(data.name);
}

// ✅ Option 3: Zod schema validation
import { z } from "zod";

const materialSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  // ... other fields
});

const parsedData = materialSchema.parse(unknownData); // Throws if invalid
// or
const result = materialSchema.safeParse(unknownData);
if (result.success) {
  const data = result.data; // Typed correctly
}

// ⚠️ Option 4: Suppress error (ใช้น้อยที่สุด)
// @ts-ignore
const result = problematicCode();

// ❌ DON'T: Use 'any' everywhere
const data: any = unknownData; // Bad practice
```

**Checklist:**

- ✅ ตรวจสอบ type definitions
- ✅ อัพเดท @types packages
- ✅ ใช้ `unknown` แทน `any`
- ✅ สร้าง custom type guards
- ✅ ใช้ Zod สำหรับ runtime validation

---

#### 9. Glassmorphism ไม่แสดงผล

**Problem:** Glass effect ไม่เห็น / ไม่โปร่งแสง

**Solution:**

```tsx
// ✅ ตรวจสอบว่ามี backdrop-blur
<div className="bg-white/10 backdrop-blur-md">
  {/* Content */}
</div>

// ✅ ตรวจสอบว่า parent มี background
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
  <div className="bg-white/10 backdrop-blur-md">
    {/* Glass card */}
  </div>
</div>

// ✅ ตรวจสอบ browser support
// backdrop-filter ไม่ support ใน browser เก่า
// สามารถใช้ fallback:
<div className="bg-white/10 backdrop-blur-md bg-opacity-80">
  {/* Content */}
</div>
```

**Checklist:**

- ✅ Browser support backdrop-filter (Chrome 76+, Safari 9+)
- ✅ Parent element มี background
- ✅ ใช้ opacity ร่วมกับ blur
- ✅ ตรวจสอบ z-index layers

---

#### 10. Date/Time ไม่ตรง

**Problem:** วันที่แสดงผิด / timezone ไม่ตรง

**Solution:**

```typescript
// ✅ ใช้ date-fns และกำหนด timezone
import { format } from "date-fns";
import { th } from "date-fns/locale";

// Display format: dd-mm-yyyy
export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd-MM-yyyy", { locale: th });
};

// ✅ Firestore Timestamp conversion
import { Timestamp } from "firebase/firestore";

// Save to Firestore
const docData = {
  createdAt: Timestamp.now(),
};

// Read from Firestore
const createdAt = docSnap.data().createdAt.toDate(); // Convert to JS Date
const formatted = formatDate(createdAt);

// ✅ Handle timezone (Thailand = UTC+7)
import { utcToZonedTime, formatInTimeZone } from "date-fns-tz";

const bangkokTime = utcToZonedTime(new Date(), "Asia/Bangkok");
const formatted = formatInTimeZone(
  bangkokTime,
  "Asia/Bangkok",
  "dd-MM-yyyy HH:mm",
);
```

**Checklist:**

- ✅ ใช้ Firestore Timestamp สำหรับ dates
- ✅ Convert เป็น JS Date ก่อน format
- ✅ ใช้ date-fns สำหรับ formatting
- ✅ ตรวจสอบ timezone settings

---

### Debug Tools

```typescript
// src/lib/utils/debug.ts

// Development helpers
export const debugLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG] ${message}`, data);
  }
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
};

// Firebase error handler
export const handleFirebaseError = (error: unknown): string => {
  if (error instanceof Error) {
    // Log to error tracking service (e.g., Sentry)
    console.error("Firebase Error:", error);

    // Return user-friendly message (ภาษาไทย)
    if (error.message.includes("permission-denied")) {
      return "คุณไม่มีสิทธิ์ในการทำรายการนี้";
    }
    if (error.message.includes("not-found")) {
      return "ไม่พบข้อมูลที่ต้องการ";
    }
    if (error.message.includes("already-exists")) {
      return "ข้อมูลนี้มีอยู่ในระบบแล้ว";
    }
    if (error.message.includes("unauthenticated")) {
      return "กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
    }
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
};

// API error handler
export const handleApiError = (
  error: unknown,
): { message: string; code?: string } => {
  if (error instanceof Response) {
    return {
      message: `API Error: ${error.status} ${error.statusText}`,
      code: error.status.toString(),
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  return {
    message: "Unknown API error",
  };
};

// Console wrapper (automatically disabled in production)
export const log = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG]", ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.info("[INFO]", ...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};
```

---

### Getting Help

**ขั้นตอนการขอความช่วยเหลือ:**

1. **ตรวจสอบ Error Message**
   - อ่าน error message ให้ละเอียด
   - Copy full stack trace
   - Screenshot หน้าจอ

2. **ค้นหาใน Documentation**
   - Next.js docs: https://nextjs.org/docs
   - Firebase docs: https://firebase.google.com/docs
   - GitHub issues ของ library ที่เกี่ยวข้อง

3. **ลองแก้เอง**
   - ใช้ troubleshooting guide นี้
   - Console.log debug
   - ตรวจสอบ network tab
   - ลอง isolate ปัญหา (comment code ทีละส่วน)

4. **ถามทีม**
   - Post ใน Slack #bpi-aeropath-dev
   - แนบ error message + screenshot
   - บอก steps to reproduce
   - บอกว่าลองอะไรไปแล้วบ้าง

5. **สร้าง Issue**
   - ถ้าเป็น bug สร้าง GitHub issue
   - ใส่ label: `bug`, `help-wanted`
   - ใส่ reproduction steps ละเอียด

**Template สำหรับขอความช่วยเหลือ:**

```markdown
## ปัญหา

[อธิบายปัญหาสั้นๆ แต่ชัดเจน]

## Error Message
```

[paste error message และ stack trace]

```

## Steps to Reproduce
1. ไปที่หน้า...
2. คลิกที่...
3. กรอกข้อมูล...
4. เห็น error...

## Expected Behavior
[ควรจะเป็นอย่างไร]

## Actual Behavior
[เป็นอย่างไร]

## Environment
- OS: [e.g., macOS 14, Windows 11]
- Browser: [e.g., Chrome 120, Firefox 115]
- Node version: [e.g., 18.17.0]
- Package versions: [paste from package.json]

## Screenshots
[ถ้ามี แนบ screenshot]

## What I've Tried
- [สิ่งที่ลองแล้ว 1]
- [สิ่งที่ลองแล้ว 2]
- [สิ่งที่ลองแล้ว 3]

## Additional Context
[ข้อมูลเพิ่มเติมอื่นๆ]
```

---

## 📞 Support & Resources

### Documentation

- **Next.js:** https://nextjs.org/docs
- **Firebase:** https://firebase.google.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TanStack Query:** https://tanstack.com/query/latest
- **React Hook Form:** https://react-hook-form.com
- **Zod:** https://zod.dev
- **date-fns:** https://date-fns.org

### Internal Resources

- **Slack Channel:** #bpi-aeropath-dev
- **Project Board:** [GitHub Projects URL]
- **Design Figma:** [Figma URL]
- **API Documentation:** [Internal docs URL]
- **Project Manager:** [ชื่อ PM]
- **Tech Lead:** [ชื่อ Tech Lead]

### Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run format          # Format with Prettier

# Testing
npm run test            # Run unit tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Run E2E tests with UI

# Firebase
firebase login          # Login to Firebase
firebase deploy         # Deploy everything
firebase deploy --only firestore:rules    # Deploy only rules
firebase deploy --only functions          # Deploy only functions
firebase emulators:start                  # Start local emulators

# Git
git checkout -b feature/new-feature      # Create feature branch
git add .                                # Stage changes
git commit -m "feat: add new feature"    # Commit
git push origin feature/new-feature      # Push to remote
```

---

## 🎉 FINAL NOTES

### Core Principles to Remember

```
✨ Code quality > Speed
   - เขียนโค้ดให้ดี ไม่ใช่เขียนให้เร็ว
   - Readable code is maintainable code

✨ User experience > Feature count
   - Feature น้อยแต่ใช้งานได้ดี ดีกว่า feature เยอะแต่ใช้ยาก
   - Always think: "Would I enjoy using this?"

✨ Security > Convenience
   - ไม่มี shortcut ในเรื่อง security
   - Always validate, always authenticate

✨ Documentation > Cleverness
   - โค้ดที่ clever แต่อ่านไม่รู้เรื่อง = โค้ดที่แย่
   - Comment อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"

✨ Collaboration > Individual work
   - Code review เป็นการเรียนรู้ ไม่ใช่การตำหนิ
   - Share knowledge, help teammates

✨ Consistency > Perfection
   - Consistent code ดีกว่า perfect code ที่ไม่ตรงกัน
   - Follow conventions, don't reinvent the wheel
```

### The Golden Rule

**"Write code that your future self will thank you for"**

เมื่อคุณกลับมาดูโค้ดนี้ใน 6 เดือน:

- คุณจะเข้าใจได้ไหม?
- คุณจะแก้ไขได้ง่ายไหม?
- คุณจะภูมิใจกับสิ่งที่เขียนไหม?

ถ้าคำตอบคือ "ใช่" ทั้งหมด แสดงว่าคุณทำได้ดีแล้ว! 🎊

---

### Attribution

```
Project: BPI AeroPath
Purpose: Centralized Warehouse & Logistics Management System
Team: BPI Department (20 users)
Technology: Next.js 14 + TypeScript + Firebase + Glassmorphism UI
AI Assistance: Antigravity AI Pro, Windsurf
```

---

**Version:** 1.0.0  
**Last Updated:** January 30, 2026  
**Maintained by:** BPI AeroPath Development Team

---

## 📋 Quick Start Checklist for New Developers

```
Day 1:
☐ Clone repository
☐ Install dependencies (npm install)
☐ Setup environment variables (.env.local)
☐ Run development server (npm run dev)
☐ Read this AI_RULES.md file thoroughly
☐ Join Slack channel #bpi-aeropath-dev

Week 1:
☐ Familiarize with project structure
☐ Understand core components (GlassCard, StatusBadge)
☐ Review type definitions in src/types
☐ Study Firebase structure
☐ Make first small contribution
☐ Get first code review

Month 1:
☐ Implement a complete feature
☐ Write tests for your code
☐ Help review others' code
☐ Understand deployment process
☐ Become comfortable with tech stack
```

**Welcome to BPI AeroPath! Let's build something amazing together! 🚀**
