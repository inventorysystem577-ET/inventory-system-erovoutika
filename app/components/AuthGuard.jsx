"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../hook/useAuth";
import { isAdminRole } from "../utils/roleHelper";

// Pages staff can access (everything except admin panel)
const STAFF_ALLOWED_PATHS = [
  "/view/product-in",
  "/view/item-transfer",
  "/view/parcel-shipped",
  "/view/out-of-stock",
  "/view/dashboard",
];

// Admin-only pages
const ADMIN_ONLY_PATHS = [
  "/view/admin-panel",
  "/view/user-approvals",
  "/view/admin-Crud-Products",
];

/* ================= AUTH GUARD ================= */
export default function AuthGuard({ children, darkMode = false }) {
  const { loading: authLoading, userEmail, role, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = isAdminRole(role);
  const isApproved = status === "approved";

  useEffect(() => {
    if (authLoading || !userEmail) return;
    if (!isApproved) {
      router.replace("/");
      return;
    }
    if (isAdmin) return;
    // Staff: block admin-only pages
    if (ADMIN_ONLY_PATHS.includes(pathname)) {
      router.replace("/view/dashboard");
      return;
    }
    // Staff: allow listed pages, redirect others to dashboard
    if (!STAFF_ALLOWED_PATHS.includes(pathname)) {
      router.replace("/view/dashboard");
    }
  }, [authLoading, userEmail, isAdmin, isApproved, pathname, router]);

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-[#020617]" : "bg-white"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full border-4 animate-spin ${
            darkMode
              ? "border-white/25 border-t-white"
              : "border-gray-300 border-t-[#1E40AF]"
          }`}
        />
      </div>
    );
  }

  if (!userEmail) return null;
  if (!isApproved) return null;
  if (!isAdmin && ADMIN_ONLY_PATHS.includes(pathname)) return null;

  return <>{children}</>;
}
