"use client";
import {
  LogOut,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  PackageOpen,
  Activity,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { handleLogout } from "../controller/logoutController";
import { useAuth } from "../hook/useAuth";
import { isAdminRole } from "../utils/roleHelper";
import { useEffect, useMemo, useState } from "react";
import {
  getSidebarMenuItems,
  SIDEBAR_ICON_MAP,
} from "../utils/sidebarMenuConfig";
import { loadSidebarCustomization } from "../utils/sidebarCustomization";

export default function Sidebar({ sidebarOpen, setSidebarOpen, darkMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);

  const menuItems = isAdmin
    ? [
        {
          id: "Dashboard",
          label: "Dashboard",
          icon: BarChart3,
          path: "/view/dashboard",
        },
        {
          id: "Product In",
          label: "Product In",
          icon: ArrowDownToLine,
          path: "/view/product-in",
        },
        {
          id: "Product Out",
          label: "Product Out",
          icon: ArrowUpFromLine,
          path: "/view/product-out",
        },
        {
          id: "Parcel Shipped",
          label: "Stock In",
          icon: Package,
          path: "/view/parcel-shipped",
        },
        {
          id: "Parcel Delivery",
          label: "Stock Out",
          icon: PackageOpen,
          path: "/view/parcel-delivery",
        },
        {
          id: "Inventory Stock",
          label: "Inventory",
          icon: Activity,
          path: "/view/out-of-stock",
        },
      ]
    : [
        {
          id: "Product In",
          label: "Monitoring and Adding",
          icon: ArrowDownToLine,
          path: "/view/product-in",
        },
      ];

  const adminMenuItems = isAdmin
    ? [
        {
          id: "Admin Control Panel",
          label: "Admin Control Panel",
          icon: Activity,
          path: "/view/admin-panel",
        },
      ]
    : [];
  const allMenuItems = [...menuItems, ...adminMenuItems];

  const handleMenuClick = (path) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
      router.push("/");
    } catch (err) {
      alert(err.message || "Logout failed");
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-14 sm:top-16 h-full border-r transition-all duration-300 z-20 overflow-hidden ${
          sidebarOpen ? "w-64 sm:w-72 lg:w-64" : "w-0"
        } ${
          darkMode
            ? "bg-[#111827] border-[#374151]"
            : "bg-[#F3F4F6] border-[#E5E7EB]"
        }`}
      >
        {sidebarOpen && (
          <nav className="p-4 sm:p-5 lg:p-4 space-y-1 h-full overflow-y-auto pb-20">
            {allMenuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.path)}
                  className={`relative w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium group ${
                    isActive
                      ? "bg-[#1E40AF] text-white shadow-lg shadow-blue-700/30"
                      : darkMode
                        ? "text-[#D1D5DB] hover:bg-[#1E40AF] hover:text-white"
                        : "text-[#374151] hover:bg-[#1E40AF] hover:text-white"
                  }`}
                >
                  {/* Left accent bar */}
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-200 ${
                      isActive
                        ? "bg-white/70"
                        : "bg-transparent group-hover:bg-white/40"
                    }`}
                  />

                  {(() => {
                    const Icon =
                      SIDEBAR_ICON_MAP[item.iconKey] ||
                      SIDEBAR_ICON_MAP.Activity;
                    return <Icon className="w-5 h-5 flex-shrink-0" />;
                  })()}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}

            {/* Logout */}
            <div
              className={`pt-4 mt-4 border-t ${
                darkMode ? "border-[#374151]" : "border-[#D1D5DB]"
              }`}
            >
              <button
                onClick={handleLogoutClick}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium ${
                  darkMode
                    ? "text-[#EF4444] hover:bg-[#7F1D1D]/40 hover:text-red-300"
                    : "text-[#DC2626] hover:bg-red-50 hover:text-red-700"
                }`}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </aside>
    </>
  );
}
