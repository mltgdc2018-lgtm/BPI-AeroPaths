# BPI AeroPath - File Structure Audit

เอกสารนี้ใช้สำหรับติดตามโครงสร้างไฟล์ปัจจุบันเปรียบเทียบกับข้อกำหนดใน [AI_RULES.md](file:///Users/sfasttrans/Documents/BPI-AeroPath/AI_RULES.md)

## 📁 PLANNED FILE STRUCTURE (From AI_RULES.md)

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
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── helpers.ts
│   │   │   └── cn.ts               # classnames utility
│   │   └── constants.ts            # App-wide constants
│   ├── types/                      # 🏷️ TypeScript Interfaces
│   │   ├── index.ts                # Shared Types
│   │   ├── material.ts
│   │   └── ...
│   ├── contexts/                   # React Contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── styles/                     # Global Styles
│   │   └── globals.css
│   └── middleware.ts               # Next.js Middleware (Auth)
├── e2e/                            # Playwright E2E Tests
├── firebase.json
├── firestore.rules
├── ...
└── package.json
```

## 🔍 CURRENT STATUS AUDIT (30-01-2026)

| Category           | Status      | Missing / Required Actions                                                                 |
| :----------------- | :---------- | :----------------------------------------------------------------------------------------- |
| **Project Config** | ⚠️ Partial  | Missing `firebase.json`, `firestore.rules`, `storage.rules`. (.env.local created)          |
| **GitHub Actions** | ❌ Missing  | `.github/workflows/` (deploy.yml, test.yml)                                                |
| **Public Assets**  | ✅ Complete | `images/`, `icons/`, `files/` folders established                                          |
| **App Routes**     | ✅ Complete | `(auth)/`, `(main)/`, `projects/`, `api/`, `not-found.tsx` established                     |
| **Components**     | ✅ Complete | `ui/`, `projects/` (material-control, warehouse) established                               |
| **Lib / Logic**    | ✅ Complete | `firebase/` (config.ts), `hooks/` (useAuth.ts), `utils/` (formatters.ts, index.ts) created |
| **Types**          | ✅ Complete | `src/types/` (user, material, transaction, index) defined                                  |
| **Contexts**       | ✅ Complete | `src/contexts/` (AuthContext.tsx) implemented                                              |
| **E2E Testing**    | ❌ Missing  | `e2e/` folder                                                                              |

## 🛠️ RECOMMENDED NEXT STEPS

1.  **Initialize Firebase Files:** สร้าง `firebase.json`, `firestore.rules`, และ `storage.rules`
2.  **Setup GitHub Workflows:** เตรียมระบบ CI/CD เบื้องต้น
3.  **Implement Auth UI:** สร้างหน้า Login/Signup ใน `src/app/(auth)/`
4.  **Database Seeding:** เตรียมข้อมูล Master Data เบื้องต้นสำหรับ Materials ใน Firestore
