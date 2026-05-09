
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { logActivity } from "../../utils/logActivity";
import Sidebar from "../../components/Sidebar";
import TopNavbar from "../../components/TopNavbar";
import {
  ShieldCheck,
  Search,
  Undo2,
  Bug,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Package,
  PackageCheck,
  Truck,
  ArrowDownToLine,
} from "lucide-react";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchProductInController,
  fetchProductOutController,
  updateProductInController,
  deleteProductInController,
  updateProductOutController,
  deleteProductOutController,
} from "../../controller/productController";
import {
  getParcelInItems,
  updateParcelInItem,
  deleteParcelInItem,
} from "../../controller/parcelShipped";
import {
  getParcelOutItems,
  updateParcelOutItem,
  deleteParcelOutItem,
} from "../../controller/parcelDelivery";
import {
  loadAdminUndoHistory,
  saveDeletedAdminRecord,
  removeAdminUndoRecord,
  setAdminUndoDebugExpiry,
} from "../../utils/adminUndo";

const TABS = [
  { key: "products-in", label: "Products In", icon: PackageCheck },
  { key: "products-out", label: "Products Out", icon: Package },
  { key: "components-in", label: "Components In", icon: ArrowDownToLine },
  { key: "components-out", label: "Components Out", icon: Truck },
];

const APPROVAL_TABLES = ["user_profiles", "access_requests_temp"];

const ITEMS_PER_PAGE = 10;

const TAB_META = {
  "products-in": { table: "product_in", label: "Products In", nameKey: "product_name" },
  "products-out": { table: "products_out", label: "Products Out", nameKey: "product_name" },
  "components-in": { table: "parcel_in", label: "Components In", nameKey: "item_name" },
  "components-out": { table: "parcel_out", label: "Components Out", nameKey: "item_name" },
  users: { table: "user_profiles", label: "Users", nameKey: "name" },
};

export default function AdminPanelPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("products-in");
  const { role, loading, userEmail, displayName } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminRole(role);

  // Data
  const [productsIn, setProductsIn] = useState([]);
  const [productsOut, setProductsOut] = useState([]);
  const [componentsIn, setComponentsIn] = useState([]);
  const [componentsOut, setComponentsOut] = useState([]);
  const [users, setUsers] = useState([]);
  const [profileTable, setProfileTable] = useState(null);
  const [usersError, setUsersError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // Search & pagination per tab
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Edit modal
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [undoHistory, setUndoHistory] = useState([]);
  const [restoringUndoId, setRestoringUndoId] = useState(null);
  const [debugExpiring, setDebugExpiring] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDarkMode(saved === "true");
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/view/dashboard");
    }
  }, [loading, isAdmin, router]);

  const refreshUndoHistory = useCallback(async () => {
    const history = await loadAdminUndoHistory();
    setUndoHistory(Array.isArray(history) ? history : []);
  }, []);

  useEffect(() => {
    refreshUndoHistory();
    const intervalId = setInterval(() => {
      refreshUndoHistory();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [refreshUndoHistory]);

  const buildDeleteSnapshot = useCallback((item, tabKey, usersTab) => {
    const meta = TAB_META[tabKey] || TAB_META["products-in"];
    if (usersTab) {
      const sourceTable = item.__sourceTable || "user_profiles";
      return {
        label: item.name || item.email || `#${item.id}`,
        tabKey: "users",
        table: sourceTable,
        payload: {
          name: item.name || null,
          email: item.email || null,
          role: item.role || "staff",
          is_approved: item.is_approved ?? item.status === "approved",
          rejected_at: item.rejected_at || null,
          approved_at: item.approved_at || null,
          created_at: item.created_at || null,
        },
      };
    }

    const nameValue = item[meta.nameKey] || item.name || `#${item.id}`;
    if (meta.table === "product_in") {
      return {
        label: String(nameValue),
        tabKey,
        table: meta.table,
        payload: {
          product_name: item.product_name || null,
          quantity: Number(item.quantity ?? 0),
          date: item.date || null,
          time_in: item.time_in || null,
          components: Array.isArray(item.components) ? item.components : item.components || [],
          shipping_mode: item.shipping_mode || null,
          client_name: item.client_name || null,
          description: item.description || null,
          price: item.price === "" || item.price === undefined ? null : item.price,
          category: item.category || "Others",
        },
      };
    }

    if (meta.table === "products_out") {
      return {
        label: String(nameValue),
        tabKey,
        table: meta.table,
        payload: {
          product_name: item.product_name || null,
          quantity: Number(item.quantity ?? 0),
          date: item.date || null,
          time_out: item.time_out || null,
          components: Array.isArray(item.components) ? item.components : item.components || [],
          shipping_mode: item.shipping_mode || null,
          client_name: item.client_name || null,
          description: item.description || null,
          price: item.price === "" || item.price === undefined ? null : item.price,
          category: item.category || "Others",
        },
      };
    }

    if (meta.table === "parcel_in") {
      return {
        label: String(nameValue),
        tabKey,
        table: meta.table,
        payload: {
          item_name: item.item_name || item.name || null,
          quantity: Number(item.quantity ?? 0),
          date: item.date || null,
          time_in: item.time_in || item.timeIn || null,
          shipping_mode: item.shipping_mode || null,
          client_name: item.client_name || null,
          price: item.price === "" || item.price === undefined ? null : item.price,
          category: item.category || "Others",
        },
      };
    }

    return {
      label: String(nameValue),
      tabKey,
      table: meta.table,
      payload: {
        item_name: item.item_name || item.name || null,
        quantity: Number(item.quantity ?? 0),
        date: item.date || null,
        time_out: item.time_out || item.timeOut || null,
        shipping_mode: item.shipping_mode || null,
        client_name: item.client_name || null,
        price: item.price === "" || item.price === undefined ? null : item.price,
        category: item.category || "Others",
      },
    };
  }, []);

  const restoreDeletedRecord = useCallback(async (entry) => {
    const table = entry?.table;
    const payload = entry?.payload || {};
    if (!table) {
      return { error: { message: "Invalid undo record." } };
    }
    return await supabase.from(table).insert([payload]);
  }, []);

  const handleRestoreFromHistory = async (entry) => {
  if (!entry?.id) return;
  setRestoringUndoId(entry.id);

  const { error } = await restoreDeletedRecord(entry);
  if (error) {
    setFeedback({ type: "error", message: `Restore failed: ${error.message || "Unknown error"}` });
    setRestoringUndoId(null);
    return;
  }

  await logActivity({
    userId: userEmail || null,
    userName: displayName || userEmail || "Unknown User",
    userType: role || "staff",
    action: "RESTORE_RECORD",
    module: "Admin CRUD Products",
    details: `Restored ${entry.label || "record"} from ${getUndoTypeLabel(entry.tabKey)}`,
  });

  await removeAdminUndoRecord(entry.id);
  await refreshUndoHistory();
  await loadAllData();
  setFeedback({ type: "success", message: "Record restored successfully." });
  setRestoringUndoId(null);
};

  const handleDebugUndoExpiry = async () => {
    setDebugExpiring(true);
    await setAdminUndoDebugExpiry(1);
    await refreshUndoHistory();
    setFeedback({
      type: "success",
      message: "Undo records set to expire in 1 minute (debug mode).",
    });
    setDebugExpiring(false);
  };

  const fetchUserProfiles = useCallback(async () => {
    const tableRows = [];
    const errors = [];

    for (const table of APPROVAL_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select("id, name, email, role, is_approved, rejected_at, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        errors.push(`${table}: ${error.message}`);
        continue;
      }

      tableRows.push(
        ...(data || []).map((row) => ({
          ...row,
          __sourceTable: table,
          status: row.is_approved ? "approved" : row.rejected_at ? "denied" : "pending",
        })),
      );
    }

    if (tableRows.length === 0 && errors.length > 0) {
      setProfileTable(null);
      setUsersError(errors.join(" | "));
      return [];
    }

    // Deduplicate by user id; prefer user_profiles over temp table rows.
    const deduped = new Map();
    for (const row of tableRows) {
      const existing = deduped.get(row.id);
      if (!existing || (existing.__sourceTable !== "user_profiles" && row.__sourceTable === "user_profiles")) {
        deduped.set(row.id, row);
      }
    }

    const merged = Array.from(deduped.values()).sort((a, b) => {
      const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTs - aTs;
    });

    setProfileTable(merged[0]?.__sourceTable || "user_profiles");
    setUsersError("");
    return merged;
  }, []);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    const [pIn, pOut, cInResult, cOutResult, userProfiles] = await Promise.all([
      fetchProductInController(),
      fetchProductOutController(),
      getParcelInItems(),
      getParcelOutItems(),
      fetchUserProfiles(),
    ]);
    setProductsIn(pIn || []);
    setProductsOut(pOut || []);
    setComponentsIn(cInResult?.data || []);
    setComponentsOut(cOutResult?.data || []);
    setUsers(userProfiles || []);
    setDataLoading(false);
  }, [fetchUserProfiles]);

  useEffect(() => {
    if (isAdmin) loadAllData();
  }, [isAdmin, loadAllData]);

  // Reset page and search when switching tabs
  useEffect(() => {
    setSearch("");
    setPage(1);
  }, [activeTab]);

  // Clear feedback after 4s
  useEffect(() => {
    if (!feedback.message) return;
    const t = setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Get current tab data
  const getCurrentData = () => {
    switch (activeTab) {
      case "products-in": return productsIn;
      case "products-out": return productsOut;
      case "components-in": return componentsIn;
      case "components-out": return componentsOut;
      case "users": return users;
      default: return [];
    }
  };

  // Whether it's a product tab (vs component/parcel tab)
  const isProductTab = activeTab === "products-in" || activeTab === "products-out";
  const isUsersTab = activeTab === "users";

  // Get fields for current tab
  const getFields = () => {
    if (isUsersTab) {
      return [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
      ];
    }

    if (isProductTab) {
      return [
        { key: "product_name", label: "Product Name" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "date", label: "Date" },
        { key: "price", label: "Price", type: "number" },
        { key: "shipping_mode", label: "Shipping Mode" },
        { key: "client_name", label: "Client Name" },
        { key: "description", label: "Description" },
      ];
    }
    return [
      { key: "item_name", label: "Item Name" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "date", label: "Date" },
      { key: "price", label: "Price", type: "number" },
      { key: "shipping_mode", label: "Shipping Mode" },
      { key: "client_name", label: "Client Name" },
    ];
  };

  // Filter by search
  const getFilteredData = () => {
    const data = getCurrentData();
    const keyword = search.trim().toLowerCase();
    if (!keyword) return data;

    if (isUsersTab) {
      return data.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const role = (item.role || "").toLowerCase();
        const status = (item.status || "").toLowerCase();
        return (
          name.includes(keyword) ||
          email.includes(keyword) ||
          role.includes(keyword) ||
          status.includes(keyword)
        );
      });
    }

    return data.filter((item) => {
      const name = (item.product_name || item.item_name || "").toLowerCase();
      const client = (item.client_name || "").toLowerCase();
      const mode = (item.shipping_mode || "").toLowerCase();
      return name.includes(keyword) || client.includes(keyword) || mode.includes(keyword);
    });
  };

  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Column config for table display
  const getColumns = () => {
    if (isUsersTab) {
      return [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Registered" },
      ];
    }

    if (isProductTab) {
      return [
        { key: "product_name", label: "Name" },
        { key: "quantity", label: "Qty" },
        { key: "date", label: "Date" },
        { key: "price", label: "Price" },
        { key: "client_name", label: "Client" },
        { key: "shipping_mode", label: "Shipping" },
      ];
    }
    return [
      { key: "item_name", label: "Name" },
      { key: "quantity", label: "Qty" },
      { key: "date", label: "Date" },
      { key: "price", label: "Price" },
      { key: "client_name", label: "Client" },
      { key: "shipping_mode", label: "Shipping" },
    ];
  };

  // ---- EDIT ----
  const openEdit = (item) => {
    setEditItem(item);
    const fields = getFields();
    const form = {};
    for (const f of fields) {
      form[f.key] = item[f.key] ?? "";
    }
    setEditForm(form);
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditForm({});
    setEditSaving(false);
  };

  const handleEditChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateUserProfile = async (id, updates, sourceTable) => {
    let dbUpdates = { ...updates };
    if (updates.status !== undefined) {
      dbUpdates.is_approved = updates.status === "approved";
      if (updates.status === "approved") {
        dbUpdates.approved_at = new Date().toISOString();
        dbUpdates.rejected_at = null;
      } else if (updates.status === "denied") {
        dbUpdates.rejected_at = new Date().toISOString();
        dbUpdates.approved_at = null;
      } else {
        dbUpdates.approved_at = null;
        dbUpdates.rejected_at = null;
      }
      delete dbUpdates.status;
    }
    const target = sourceTable || profileTable || "user_profiles";
    return supabase.from(target).update(dbUpdates).eq("id", id);
  };

  const deleteUserProfile = async (id, sourceTable) => {
    const target = sourceTable || profileTable || "user_profiles";
    return supabase.from(target).delete().eq("id", id);
  };

  const handleApprovalUpdate = async (id, status, sourceTable) => {
    const { error } = await updateUserProfile(id, { status }, sourceTable);
    if (error) {
      setFeedback({ type: "error", message: `Failed to ${status} user: ${error.message}` });
      return;
    }
    setFeedback({ type: "success", message: `User ${status} successfully.` });
    await loadAllData();
  };

  const handleEditSave = async () => {
  if (!editItem) return;
  setEditSaving(true);

  if (isUsersTab) {
    const updates = {
      name: editForm.name || null,
      email: editForm.email || null,
      role: (editForm.role || "staff").toLowerCase(),
      status: (editForm.status || "pending").toLowerCase(),
    };

    const { error } = await updateUserProfile(
      editItem.id,
      updates,
      editItem.__sourceTable
    );

    if (error) {
      setFeedback({
        type: "error",
        message: `Update failed: ${error.message || "Unknown error"}`,
      });
      setEditSaving(false);
      return;
    }

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "UPDATE USER",
      module: "Admin CRUD Products",
      details: `Updated user ${editItem.name || editItem.email} -> name: ${updates.name}, role: ${updates.role}, status: ${updates.status}`,
    });

    setFeedback({ type: "success", message: "User updated successfully." });
    closeEdit();
    await loadAllData();
    setEditSaving(false);
    return;
  }

  const updates = {};
  const fields = getFields();

  for (const f of fields) {
    const newVal =
      f.type === "number"
        ? editForm[f.key] === "" || editForm[f.key] === null
          ? null
          : Number(editForm[f.key])
        : editForm[f.key] || null;

    const oldVal = editItem[f.key] ?? null;

    if (newVal !== oldVal) {
      updates[f.key] = newVal;
    }
  }

  if (Object.keys(updates).length === 0) {
    closeEdit();
    setEditSaving(false);
    return;
  }

  let result;

  switch (activeTab) {
    case "products-in":
      result = await updateProductInController(editItem.id, updates);
      break;
    case "products-out":
      result = await updateProductOutController(editItem.id, updates);
      break;
    case "components-in":
      result = await updateParcelInItem(editItem.id, updates);
      break;
    case "components-out":
      result = await updateParcelOutItem(editItem.id, updates);
      break;
    default:
      result = { error: { message: "Unknown tab" } };
  }

  if (result?.error) {
    setFeedback({
      type: "error",
      message: `Update failed: ${result.error.message || "Unknown error"}`,
    });
    setEditSaving(false);
    return;
  }

  const recordName =
    editItem.product_name ||
    editItem.item_name ||
    editItem.name ||
    `#${editItem.id}`;

  await logActivity({
    userId: userEmail || null,
    userName: displayName || userEmail || "Unknown User",
    userType: role || "staff",
    action: "UPDATE RECORD",
    module: "Admin CRUD Products",
    details: `Updated ${recordName} in ${TAB_META[activeTab]?.label || activeTab}`,
  });

  setFeedback({ type: "success", message: "Record updated successfully." });
  closeEdit();
  await loadAllData();
  setEditSaving(false);
};

  // ---- DELETE ----
  const openDelete = (item) => {
    setDeleteTarget(item);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleDeleteConfirm = async () => {
  if (!deleteTarget) return;
  setDeleting(true);

  const undoSnapshot = buildDeleteSnapshot(
    deleteTarget,
    activeTab,
    isUsersTab
  );

  if (isUsersTab) {
    const { error } = await deleteUserProfile(
      deleteTarget.id,
      deleteTarget.__sourceTable
    );

    if (error) {
      setFeedback({
        type: "error",
        message: `Delete failed: ${error.message || "Unknown error"}`,
      });
      setDeleting(false);
      return;
    }

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "DELETE USER",
      module: "Admin CRUD Products",
      details: `Deleted user ${deleteTarget.name || deleteTarget.email}`,
    });

    const undoSaveResult = await saveDeletedAdminRecord({
      ...undoSnapshot,
      deletedBy: userEmail || null,
    });

    if (!undoSaveResult?.success) {
      setFeedback({
        type: "error",
        message: `User deleted, but undo archive failed: ${undoSaveResult?.error?.message || "Unknown error"}`,
      });
    } else {
      setFeedback({
        type: "success",
        message: "User deleted from profile list.",
      });
    }

    await refreshUndoHistory();
    closeDelete();
    await loadAllData();
    setDeleting(false);
    return;
  };

  let result;

  switch (activeTab) {
    case "products-in":
      result = await deleteProductInController(deleteTarget.id);
      break;
    case "products-out":
      result = await deleteProductOutController(deleteTarget.id);
      break;
    case "components-in":
      result = await deleteParcelInItem(deleteTarget.id);
      break;
    case "components-out":
      result = await deleteParcelOutItem(deleteTarget.id);
      break;
    default:
      result = { error: { message: "Unknown tab" } };
  }

  if (result?.error) {
    setFeedback({
      type: "error",
      message: `Delete failed: ${result.error.message || "Unknown error"}`,
    });
    setDeleting(false);
    return;
  }

  const recordName =
    deleteTarget.product_name ||
    deleteTarget.item_name ||
    deleteTarget.name ||
    `#${deleteTarget.id}`;

  await logActivity({
    userId: userEmail || null,
    userName: displayName || userEmail || "Unknown User",
    userType: role || "staff",
    action: "DELETE RECORD",
    module: "Admin CRUD Products",
    details: `Deleted ${recordName} from ${TAB_META[activeTab]?.label || activeTab}`,
  });

  const undoSaveResult = await saveDeletedAdminRecord({
    ...undoSnapshot,
    deletedBy: userEmail || null,
  });

  if (!undoSaveResult?.success) {
    setFeedback({
      type: "error",
      message: `Record deleted, but undo archive failed: ${undoSaveResult?.error?.message || "Unknown error"}`,
    });
  } else {
    setFeedback({ type: "success", message: "Record deleted." });
  }

  await refreshUndoHistory();
  closeDelete();
  await loadAllData();
  setDeleting(false);
};

  // ---- STYLE HELPERS ----
  const cardClass = (extra = "") =>
    `rounded-xl border ${extra} ${
      darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
    }`;

  const subtextClass = darkMode ? "text-gray-400" : "text-gray-600";

  const formatUndoDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const getTimeUntilExpiry = (expiresAt) => {
    if (!expiresAt) return "-";
    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime())) return "-";

    const remainingMs = expiryDate.getTime() - Date.now();
    const absolute = expiryDate.toLocaleString();

    if (remainingMs <= 0) return `${absolute} (expired)`;

    const totalMinutes = Math.floor(remainingMs / 60000);
    if (totalMinutes < 1) return `${absolute} (<1 min left)`;
    if (totalMinutes < 60) return `${absolute} (${totalMinutes} min left)`;

    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `${absolute} (${totalHours} hr left)`;

    const totalDays = Math.floor(totalHours / 24);
    return `${absolute} (${totalDays} day${totalDays > 1 ? "s" : ""} left)`;
  };

  const getUndoTypeLabel = (tabKey) => {
    return TAB_META[tabKey]?.label || "Unknown";
  };

  if (!isAdmin) {
    return (
      <AuthGuard darkMode={darkMode}>
        <div
          className={`min-h-screen flex items-center justify-center ${
            darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"
          }`}
        >
          <p className="text-sm">Redirecting...</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"
        }`}
      >
        <TopNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "ml-0"
          } pt-16`}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className={`${cardClass()} p-6 mb-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
                    <h1 className="text-2xl font-bold">Admin Control Panel</h1>
                  </div>
                  <p className={`text-sm ${subtextClass}`}>
                    Edit, delete, and manage inventory records plus user approvals.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await refreshUndoHistory();
                      setUndoModalOpen(true);
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? "bg-[#374151] text-gray-200 hover:bg-[#4B5563]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo / Restore ({undoHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDebugUndoExpiry}
                    disabled={debugExpiring || undoHistory.length === 0}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      darkMode
                        ? "bg-amber-900/40 text-amber-300 hover:bg-amber-900/60"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    Debug 1m Expiry
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback Banner */}
            {feedback.message && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                  feedback.type === "success"
                    ? darkMode
                      ? "bg-green-900/30 text-green-400 border border-green-800"
                      : "bg-green-50 text-green-700 border border-green-200"
                    : darkMode
                      ? "bg-red-900/30 text-red-400 border border-red-800"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {activeTab === "users" && !profileTable && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                  darkMode
                    ? "bg-amber-900/30 text-amber-300 border border-amber-800"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                Unable to load user profiles. Check RLS permissions for `user_profiles` or `access_requests_temp`.
                {usersError ? ` Details: ${usersError}` : ""}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#2563EB] text-white shadow-lg"
                        : darkMode
                          ? "bg-[#1F2937] text-gray-300 hover:bg-[#374151] border border-[#374151]"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-[#E5E7EB]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : darkMode
                            ? "bg-[#374151] text-gray-400"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {activeTab === tab.key ? filteredData.length : (() => {
                        switch (tab.key) {
                          case "products-in": return productsIn.length;
                          case "products-out": return productsOut.length;
                          case "components-in": return componentsIn.length;
                          case "components-out": return componentsOut.length;
                          case "users": return users.length;
                          default: return 0;
                        }
                      })()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <div className={`${cardClass()} p-4 mb-4`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subtextClass}`} />
                <input
                  type="text"
                  placeholder={`Search ${isUsersTab ? "users" : isProductTab ? "products" : "components"}...`}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border transition-colors ${
                    darkMode
                      ? "bg-[#111827] border-[#374151] text-white placeholder-gray-500 focus:border-[#2563EB]"
                      : "bg-[#F9FAFB] border-[#E5E7EB] text-black placeholder-gray-400 focus:border-[#2563EB]"
                  } outline-none`}
                />
              </div>
            </div>

            {/* Data Table */}
            <div className={`${cardClass()} overflow-hidden`}>
              {dataLoading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  <p className={`mt-3 text-sm ${subtextClass}`}>Loading records...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className={`w-10 h-10 mx-auto mb-3 ${subtextClass}`} />
                  <p className={`text-sm ${subtextClass}`}>
                    {search ? "No records match your search." : "No records found."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={darkMode ? "bg-[#374151]/50" : "bg-[#F9FAFB]"}>
                          {getColumns().map((col) => (
                            <th
                              key={col.key}
                              className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}
                            >
                              {col.label}
                            </th>
                          ))}
                          <th className={`px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedData.map((item) => (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              darkMode ? "hover:bg-[#374151]/30" : "hover:bg-[#F9FAFB]"
                            }`}
                          >
                            {getColumns().map((col) => (
                              <td key={col.key} className="px-4 py-3">
                                {col.key === "created_at"
                                  ? item[col.key]
                                    ? new Date(item[col.key]).toLocaleDateString()
                                    : "—"
                                  : col.key === "status"
                                    ? (
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          String(item[col.key] || "").toLowerCase() === "approved"
                                            ? "bg-green-100 text-green-700"
                                            : String(item[col.key] || "").toLowerCase() === "denied"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {item[col.key] || "pending"}
                                      </span>
                                    )
                                  : col.key === "price"
                                  ? item[col.key] != null
                                    ? `₱${Number(item[col.key]).toLocaleString()}`
                                    : "—"
                                  : col.key === "quantity"
                                    ? (
                                      <span className={`font-medium ${
                                        Number(item[col.key]) === 0
                                          ? "text-red-500"
                                          : Number(item[col.key]) <= 5
                                            ? "text-orange-500"
                                            : ""
                                      }`}>
                                        {item[col.key]}
                                      </span>
                                    )
                                    : item[col.key] || "—"
                                }
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {isUsersTab && String(item.status || "").toLowerCase() === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApprovalUpdate(item.id, "approved", item.__sourceTable)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        darkMode
                                          ? "hover:bg-[#374151] text-green-400"
                                          : "hover:bg-green-50 text-green-600"
                                      }`}
                                      title="Approve"
                                    >
                                      <UserCheck className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApprovalUpdate(item.id, "denied", item.__sourceTable)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        darkMode
                                          ? "hover:bg-[#374151] text-amber-400"
                                          : "hover:bg-amber-50 text-amber-600"
                                      }`}
                                      title="Deny"
                                    >
                                      <UserX className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEdit(item)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    darkMode
                                      ? "hover:bg-[#374151] text-blue-400"
                                      : "hover:bg-blue-50 text-blue-600"
                                  }`}
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDelete(item)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    darkMode
                                      ? "hover:bg-[#374151] text-red-400"
                                      : "hover:bg-red-50 text-red-600"
                                  }`}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${
                      darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                    }`}>
                      <p className={`text-xs ${subtextClass}`}>
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                            darkMode ? "hover:bg-[#374151]" : "hover:bg-gray-100"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs px-2">
                          {page} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                            darkMode ? "hover:bg-[#374151]" : "hover:bg-gray-100"
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ====== UNDO / RESTORE MODAL ====== */}
        {undoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
              className={`w-full max-w-5xl rounded-xl border shadow-2xl ${
                darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}>
                <div>
                  <h2 className="font-semibold text-lg">Deleted Records (Undo / Restore)</h2>
                  <p className={`text-xs mt-1 ${subtextClass}`}>
                    Records auto-expire after 30 days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUndoModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-500/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
                {undoHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className={`text-sm ${subtextClass}`}>
                      No deleted records are available for restore.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={darkMode ? "bg-[#374151]/50" : "bg-[#F9FAFB]"}>
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Name</th>
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Type</th>
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Deleted At</th>
                          <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Expires At</th>
                          <th className={`px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider ${subtextClass}`}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {undoHistory.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`${darkMode ? "hover:bg-[#374151]/30" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-3 font-medium">{entry.label || "-"}</td>
                            <td className="px-4 py-3">{getUndoTypeLabel(entry.tabKey)}</td>
                            <td className="px-4 py-3">{formatUndoDate(entry.deletedAt)}</td>
                            <td className="px-4 py-3">{getTimeUntilExpiry(entry.expiresAt)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRestoreFromHistory(entry)}
                                disabled={restoringUndoId === entry.id}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                {restoringUndoId === entry.id ? "Restoring..." : "Restore"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== EDIT MODAL ====== */}
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
              className={`w-full max-w-lg rounded-xl border shadow-2xl ${
                darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}>
                <h2 className="font-semibold text-lg">Edit Record</h2>
                <button type="button" onClick={closeEdit} className="p-1 rounded-lg hover:bg-gray-500/20">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {getFields().map((field) => (
                  <div key={field.key}>
                    <label className={`block text-xs font-medium mb-1.5 ${subtextClass}`}>
                      {field.label}
                    </label>
                    {isUsersTab && field.key === "role" ? (
                      <select
                        value={editForm[field.key] ?? "staff"}
                        onChange={(e) => handleEditChange(field.key, e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors outline-none ${
                          darkMode
                            ? "bg-[#111827] border-[#374151] text-white focus:border-[#2563EB]"
                            : "bg-[#F9FAFB] border-[#E5E7EB] text-black focus:border-[#2563EB]"
                        }`}
                      >
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : isUsersTab && field.key === "status" ? (
                      <select
                        value={editForm[field.key] ?? "pending"}
                        onChange={(e) => handleEditChange(field.key, e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors outline-none ${
                          darkMode
                            ? "bg-[#111827] border-[#374151] text-white focus:border-[#2563EB]"
                            : "bg-[#F9FAFB] border-[#E5E7EB] text-black focus:border-[#2563EB]"
                        }`}
                      >
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="denied">denied</option>
                      </select>
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={editForm[field.key] ?? ""}
                        onChange={(e) => handleEditChange(field.key, e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors outline-none ${
                          darkMode
                            ? "bg-[#111827] border-[#374151] text-white focus:border-[#2563EB]"
                            : "bg-[#F9FAFB] border-[#E5E7EB] text-black focus:border-[#2563EB]"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}>
                <button
                  type="button"
                  onClick={closeEdit}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====== DELETE CONFIRMATION ====== */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
              className={`w-full max-w-sm rounded-xl border shadow-2xl ${
                darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="font-semibold text-lg">Delete Record</h2>
                </div>
                <p className={`text-sm ${subtextClass}`}>
                  Are you sure you want to delete{" "}
                  <strong className={darkMode ? "text-white" : "text-black"}>
                    {deleteTarget.name || deleteTarget.email || deleteTarget.product_name || deleteTarget.item_name || `#${deleteTarget.id}`}
                  </strong>
                  ? This action cannot be undone.
                </p>
              </div>
              <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}>
                <button
                  type="button"
                  onClick={closeDelete}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}