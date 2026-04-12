import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart3,
  Package,
  PackageOpen,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export const SIDEBAR_ICON_MAP = {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart3,
  Package,
  PackageOpen,
  Settings,
  ShieldCheck,
  AlertTriangle,
};

export const SIDEBAR_ICON_OPTIONS = Object.keys(SIDEBAR_ICON_MAP).sort((a, b) =>
  a.localeCompare(b),
);

export const DEFAULT_ADMIN_SIDEBAR_ITEMS = [
  {
    id: "Dashboard",
    label: "Dashboard",
    iconKey: "BarChart3",
    path: "/view/dashboard",
  },
  {
    id: "Product In",
    label: "Product In",
    iconKey: "ArrowDownToLine",
    path: "/view/product-in",
  },
  {
    id: "Item Transfer",
    label: "Item Transfer",
    iconKey: "ArrowLeftRight",
    path: "/view/item-transfer",
  },
  {
    id: "Product Out",
    label: "Product Out",
    iconKey: "ArrowUpFromLine",
    path: "/view/product-out",
  },
  {
    id: "Parcel Shipped",
    label: "Components Stock In",
    iconKey: "Package",
    path: "/view/parcel-shipped",
  },
  {
    id: "Parcel Delivery",
    label: "Components Stock Out",
    iconKey: "PackageOpen",
    path: "/view/parcel-delivery",
  },
  {
    id: "Inventory Stock",
    label: "Inventory",
    iconKey: "Activity",
    path: "/view/out-of-stock",
  },
  {
    id: "Defective Items",
    label: "Defective Items",
    iconKey: "AlertTriangle",
    path: "/view/defective-items",
  },
];

export const DEFAULT_STAFF_SIDEBAR_ITEMS = [
  {
    id: "Product In",
    label: "Monitoring and Adding",
    iconKey: "ArrowDownToLine",
    path: "/view/product-in",
  },
  {
    id: "Item Transfer",
    label: "Item Transfer",
    iconKey: "ArrowLeftRight",
    path: "/view/item-transfer",
  },
<<<<<<< Updated upstream
    {
=======
  {
>>>>>>> Stashed changes
    id: "Defective Items",
    label: "Defective Items",
    iconKey: "AlertTriangle",
    path: "/view/defective-items",
  },
];

export const DEFAULT_ADMIN_EXTRA_SIDEBAR_ITEMS = [
  {
    id: "Admin Control Panel",
    label: "Admin Control Panel",
    iconKey: "ShieldCheck",
    path: "/view/admin-panel",
  },
];

export const getSidebarMenuItems = (isAdmin) => {
  return isAdmin
    ? [...DEFAULT_ADMIN_SIDEBAR_ITEMS, ...DEFAULT_ADMIN_EXTRA_SIDEBAR_ITEMS]
    : DEFAULT_STAFF_SIDEBAR_ITEMS;
};
