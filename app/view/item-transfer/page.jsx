/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import TransferFormRow from "../../components/TransferFormRow";
import TransferRecordsTable from "../../components/TransferRecordsTable";
import { logActivity } from "../../utils/logActivity";
import {
  PackageCheck,
  Plus,
  X,
} from "lucide-react";
import "animate.css";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import {
  CATEGORIES,
  PRODUCT_CATEGORY_OPTIONS,
} from "../../utils/categoryUtils";

const STORAGE_KEY = "inventory.stockTransferHistory.v1";

const TYPE_OPTIONS = [
  { value: "PRODUCT", label: "Product" },
  { value: "STOCK", label: "Stock" },
];

const STOCK_CATEGORY_OPTIONS = [
  { value: CATEGORIES.COMPONENT, label: "Component" },
  { value: CATEGORIES.TOOL, label: "Tools" },
  { value: CATEGORIES.PRODUCT, label: "Product" },
  { value: CATEGORIES.OTHERS, label: "Other" },
];

const REMARK_OPTIONS = ["RELEASED", "RETURNED"];

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCategoryOptionsByType = (type) =>
  type === "PRODUCT" ? PRODUCT_CATEGORY_OPTIONS : STOCK_CATEGORY_OPTIONS;

const getDefaultCategoryByType = (type) => {
  const options = getCategoryOptionsByType(type);
  return options[0]?.value || "";
};

const buildDefaultForm = () => {
  const type = "PRODUCT";
  return {
    itemName: "",
    purpose: "",
    type,
    category: getDefaultCategoryByType(type),
    quantity: 1,
    date: getToday(),
    remark: REMARK_OPTIONS[0],
    receiver: "",
  };
};

const buildDefaultBulkRow = () => buildDefaultForm();

export default function StockTransferPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showMultipleInput, setShowMultipleInput] = useState(false);

  const [records, setRecords] = useState([]);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const [form, setForm] = useState(buildDefaultForm());
  const [bulkRows, setBulkRows] = useState([buildDefaultBulkRow()]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { role, displayName, userEmail } = useAuth();
  const isAdmin = isAdminRole(role);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setRecords([]);
        setHasHydratedStorage(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setRecords([]);
        setHasHydratedStorage(true);
        return;
      }
      setRecords(parsed);
      setHasHydratedStorage(true);
    } catch {
      setRecords([]);
      setHasHydratedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, hasHydratedStorage]);

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const monthMatch =
        !selectedMonth || (record.date || "").slice(0, 7) === selectedMonth;
      if (!monthMatch) return false;

      if (!keyword) return true;

      return (
        (record.itemName || "").toLowerCase().includes(keyword) ||
        (record.purpose || "").toLowerCase().includes(keyword) ||
        (record.type || "").toLowerCase().includes(keyword) ||
        (record.category || "").toLowerCase().includes(keyword) ||
        (record.remark || "").toLowerCase().includes(keyword) ||
        (record.receiver || "").toLowerCase().includes(keyword)
      );
    });
  }, [records, searchTerm, selectedMonth]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!message) return;

    const timeoutId = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [message]);

  const setFormType = (type) => {
    setForm((prev) => ({
      ...prev,
      type,
      category: getDefaultCategoryByType(type),
    }));
  };

  const onFormChange = (field, value) => {
    if (field === "type") {
      setFormType(value);
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: field === "quantity" ? Number(value || 1) : value,
    }));
  };

  const resetForm = () => {
    setForm(buildDefaultForm());
    setEditingId(null);
  };

  const validateRow = (row) => {
    if (!(row.itemName || "").trim()) return "Item Name is required.";
    if (!row.type) return "Type is required.";
    if (!row.category) return "Category is required.";
    if (!row.date) return "Date is required.";
    if (Number(row.quantity || 0) <= 0) return "Quantity must be greater than 0.";
    if (!row.remark) return "Remark is required.";
    if (!(row.receiver || "").trim()) return "Receiver is required.";
    return "";
  };

  const handleAddOrEditRecord = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateRow(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanRecord = {
      itemName: form.itemName.trim(),
      purpose: (form.purpose || "").trim(),
      type: form.type,
      category: form.category,
      quantity: Number(form.quantity || 1),
      date: form.date,
      remark: form.remark,
      receiver: (form.receiver || "").trim(),
    };

    if (editingId) {
      setRecords((prev) =>
        prev.map((record) =>
          record.id === editingId ? { ...record, ...cleanRecord } : record,
        ),
      );

      await logActivity({
        userId: userEmail || null,
        userName: displayName || userEmail || "Unknown User",
        userType: role || "staff",
        action: "UPDATE TRANSFER",
        module: "Item Transfer",
        details: `Updated ${cleanRecord.quantity}x ${cleanRecord.itemName}`,
      });

      setMessage("Record updated.");
      resetForm();
      return;
    }

    const newRecord = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      ...cleanRecord,
    };

    setRecords((prev) => [newRecord, ...prev]);

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "CREATE TRANSFER",
      module: "Item Transfer",
      details: `Transferred ${cleanRecord.quantity}x ${cleanRecord.itemName} (${cleanRecord.type} → ${cleanRecord.category})`,
    });

    setMessage("Record added.");
    resetForm();
  };

  const handleEditRecord = (record) => {
    setEditingId(record.id);
    setForm({
      itemName: record.itemName || "",
      purpose: record.purpose || "",
      type: record.type || "PRODUCT",
      category:
        record.category || getDefaultCategoryByType(record.type || "PRODUCT"),
      quantity: Number(record.quantity || 1),
      date: record.date || getToday(),
      remark: record.remark || REMARK_OPTIONS[0],
      receiver: record.receiver || "",
    });
    setShowMultipleInput(false);
    setError("");
    setMessage("");
  };

  const handleDeleteRecord = async (recordId) => {
    if (!isAdmin) return;

    const confirmed = window.confirm("Delete this item transfer record?");
    if (!confirmed) return;

    const deletedRecord = records.find((r) => r.id === recordId);

    setRecords((prev) => prev.filter((record) => record.id !== recordId));

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "DELETE TRANSFER",
      module: "Item Transfer",
      details: `Deleted ${deletedRecord?.quantity || ""}x ${deletedRecord?.itemName || ""}`,
    });

    if (editingId === recordId) {
      resetForm();
    }

    setMessage("Record removed.");
  };

  const updateBulkRow = (indexToUpdate, field, value) => {
    setBulkRows((prev) =>
      prev.map((row, index) => {
        if (index !== indexToUpdate) return row;

        if (field === "type") {
          return {
            ...row,
            type: value,
            category: getDefaultCategoryByType(value),
          };
        }

        return {
          ...row,
          [field]: field === "quantity" ? Number(value || 1) : value,
        };
      }),
    );
  };

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, buildDefaultBulkRow()]);
  };

  const removeBulkRow = (indexToRemove) => {
    setBulkRows((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddBulkRecords = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (bulkRows.length === 0) {
      setError("Add at least one row.");
      return;
    }

    const validationErrors = [];
    const newRecords = [];

    bulkRows.forEach((row, index) => {
      const rowError = validateRow(row);
      if (rowError) {
        validationErrors.push(`Row ${index + 1}: ${rowError}`);
        return;
      }

      newRecords.push({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}-${index}`,
        createdAt: new Date().toISOString(),
        itemName: row.itemName.trim(),
        purpose: (row.purpose || "").trim(),
        type: row.type,
        category: row.category,
        quantity: Number(row.quantity || 1),
        date: row.date,
        remark: row.remark,
        receiver: (row.receiver || "").trim(),
      });
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    setRecords((prev) => [...newRecords, ...prev]);

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "CREATE TRANSFER BULK",
      module: "Item Transfer",
      details: newRecords.map((r) => `${r.quantity}x ${r.itemName}`).join(", "),
    });

    setBulkRows([buildDefaultBulkRow()]);
    setMessage("Multiple records added.");
  };

  const transferTypeOptions = TYPE_OPTIONS;

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`flex flex-col w-full h-screen overflow-hidden ${
          darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
        }`}
      >
        <div
          className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-sm animate__animated animate__fadeInDown animate__faster ${
            darkMode
              ? "bg-[#111827]/90 border-[#374151]"
              : "bg-white/90 border-[#E5E7EB]"
          }`}
        >
          <TopNavbar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </div>

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : ""
          } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            <div className="mb-10 animate__animated animate__fadeInDown animate__faster">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div
                  className={`flex-1 h-[2px] ${
                    darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"
                  }`}
                ></div>
                <div className="flex items-center gap-2 px-3">
                  <PackageCheck
                    className={`w-6 h-6 ${
                      darkMode ? "text-[#3B82F6]" : "text-[#1E3A8A]"
                    }`}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">Item Transfer</h1>
                </div>
                <div
                  className={`flex-1 h-[2px] ${
                    darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"
                  }`}
                ></div>
              </div>
              <p
                className={`text-center text-sm ${
                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                Front-end item transfer tracker for admin and staff
              </p>
            </div>

            {!showMultipleInput && (
              <form
                onSubmit={handleAddOrEditRecord}
                className={`p-7 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                {error && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      darkMode
                        ? "bg-red-900/20 border-red-800 text-red-300"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    {error}
                  </div>
                )}

                {message && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm text-center ${
                      darkMode
                        ? "bg-green-900/20 border-green-800 text-green-300"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <TransferFormRow
                  mode="single"
                  row={form}
                  darkMode={darkMode}
                  onFieldChange={onFormChange}
                  transferTypeOptions={transferTypeOptions}
                  getCategoryOptionsByType={getCategoryOptionsByType}
                  remarkOptions={REMARK_OPTIONS}
                />

                <div className="flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMultipleInput(true);
                      setError("");
                      setMessage("");
                    }}
                    className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-[#38b559] text-white hover:bg-[#42d469] shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Add Multiple Item Input
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        darkMode
                          ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      Cancel Edit
                    </button>
                  )}

                  <button
                    type="submit"
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> {editingId ? "Edit Item" : "Add Item"}
                  </button>
                </div>
              </form>
            )}

            {showMultipleInput && (
              <div
                className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                {error && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      darkMode
                        ? "bg-red-900/20 border-red-800 text-red-300"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    {error}
                  </div>
                )}

                {message && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm text-center ${
                      darkMode
                        ? "bg-green-900/20 border-green-800 text-green-300"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold">Multiple Item Input</h2>
                    <p
                      className={`text-xs ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Add multiple Item Transfer records in one submission.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMultipleInput(false);
                      setError("");
                      setMessage("");
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-[#38b559] text-white hover:bg-[#42d469] shadow-sm hover:shadow-md"
                  >
                    Back to Single Product
                  </button>
                </div>

                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <div
                      key={`transfer-row-${index}`}
                      className={`rounded-lg border p-4 ${
                        darkMode
                          ? "border-[#374151] bg-[#111827]"
                          : "border-[#E5E7EB] bg-[#F9FAFB]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Record {index + 1}</h3>
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBulkRow(index)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              darkMode
                                ? "bg-red-900/30 text-red-200 hover:bg-red-900/40"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>

                      <TransferFormRow
                        mode="bulk"
                        row={row}
                        darkMode={darkMode}
                        onFieldChange={(field, value) =>
                          updateBulkRow(index, field, value)
                        }
                        transferTypeOptions={transferTypeOptions}
                        getCategoryOptionsByType={getCategoryOptionsByType}
                        remarkOptions={REMARK_OPTIONS}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6 gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={addBulkRow}
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
                        : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    + Add Another Row
                  </button>

                  <button
                    type="button"
                    onClick={handleAddBulkRecords}
                    className="bg-[#38b559] hover:bg-[#42d469] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> Add Multiple Items
                  </button>
                </div>
              </div>
            )}

            <TransferRecordsTable
              darkMode={darkMode}
              isAdmin={isAdmin}
              data={{
                filteredRecords,
                currentItems,
                itemsPerPage,
                indexOfFirstItem,
                indexOfLastItem,
                currentPage,
                totalPages,
              }}
              filters={{
                searchTerm,
                setSearchTerm,
                selectedMonth,
                setSelectedMonth,
              }}
              handlers={{
                setCurrentPage,
                handleEditRecord,
                handleDeleteRecord,
              }}
            />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}