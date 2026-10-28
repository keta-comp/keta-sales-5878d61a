// Browser-safe role model for business members. Mirrors the app_role enum in Postgres.
export type MemberRole = "owner" | "admin" | "manager" | "receptionist" | "cashier";

export const MEMBER_ROLES: MemberRole[] = ["owner", "admin", "manager", "receptionist", "cashier"];

/** Assignable through the team UI — owner is granted only by founding or transfer. */
export const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "manager", "receptionist", "cashier"];

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Ega",
  admin: "Admin",
  manager: "Menejer",
  receptionist: "Qabul",
  cashier: "Kassir",
};

export type Permission =
  | "members.manage"
  | "settings.manage"
  | "finance.view"
  | "customers.delete"
  | "catalog.manage"
  | "sales.manage"
  | "appointments.manage"
  | "reports.export"
  | "medical.view";

const OWNER_ADMIN: Permission[] = [
  "members.manage",
  "settings.manage",
  "finance.view",
  "customers.delete",
  "catalog.manage",
  "sales.manage",
  "appointments.manage",
  "reports.export",
  "medical.view",
];

const PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: OWNER_ADMIN,
  admin: OWNER_ADMIN,
  manager: [
    "finance.view",
    "customers.delete",
    "catalog.manage",
    "sales.manage",
    "appointments.manage",
    "reports.export",
    "medical.view",
  ],
  receptionist: ["appointments.manage", "sales.manage"],
  cashier: ["sales.manage"],
};

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** A role change that would remove management access from the last owner/admin is forbidden. */
export function isDemotionBelow(current: MemberRole, next: MemberRole): boolean {
  return isAdminRole(current) && !isAdminRole(next);
}
