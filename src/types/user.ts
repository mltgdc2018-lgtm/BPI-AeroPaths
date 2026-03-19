// 🏷️ src/types/user.ts
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
