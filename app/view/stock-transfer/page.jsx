/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import {
  PackageCheck,
  Plus,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
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

  const { role } = useAuth();
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

  const handleAddOrEditRecord = (e) => {
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

  const handleDeleteRecord = (recordId) => {
    if (!isAdmin) return;

    const confirmed = window.confirm("Delete this stock transfer record?");
    if (!confirmed) return;

    setRecords((prev) => prev.filter((record) => record.id !== recordId));

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

  const handleAddBulkRecords = (e) => {
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
    setBulkRows([buildDefaultBulkRow()]);
    setMessage("Multiple records added.");
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i += 1) pageNumbers.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i += 1) pageNumbers.push(i);
      pageNumbers.push("...");
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push("...");
      for (let i = totalPages - 3; i <= totalPages; i += 1) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      pageNumbers.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
        pageNumbers.push(i);
      }
      pageNumbers.push("...");
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
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
                  <h1 className="text-3xl font-bold tracking-wide">Stock Transfer</h1>
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
                Front-end stock transfer tracker for admin and staff
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
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      darkMode
                        ? "bg-green-900/20 border-green-800 text-green-300"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 mb-4">
                  <div className="lg:col-span-3">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Item Name
                    </label>
                    <input
                      type="text"
                      value={form.itemName}
                      onChange={(e) => onFormChange("itemName", e.target.value)}
                      placeholder="Type item name"
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Purpose (optional)
                    </label>
                    <input
                      type="text"
                      value={form.purpose}
                      onChange={(e) => onFormChange("purpose", e.target.value)}
                      placeholder="Purpose of transfer"
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => onFormChange("type", e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    >
                      {transferTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => onFormChange("quantity", e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Calendar className="w-4 h-4" /> Date
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => onFormChange("date", e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-4">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => onFormChange("category", e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    >
                      {getCategoryOptionsByType(form.type).map((option) => (
                        <option key={`${form.type}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 lg:col-span-4">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Remark
                    </label>
                    <select
                      value={form.remark}
                      onChange={(e) => onFormChange("remark", e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    >
                      {REMARK_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 lg:col-span-4">
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Receiver
                    </label>
                    <input
                      type="text"
                      value={form.receiver}
                      onChange={(e) => onFormChange("receiver", e.target.value)}
                      placeholder="Receiver name"
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMultipleInput(true);
                      setError("");
                      setMessage("");
                    }}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                        : "bg-[#E5E7EB] text-[#374151] hover:bg-[#D1D5DB]"
                    }`}
                  >
                    Multiple Product Input
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
                    <Plus className="w-5 h-5" /> {editingId ? "Edit Record" : "Add Record"}
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
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
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
                    <h2 className="text-lg font-semibold">Multiple Product Input</h2>
                    <p
                      className={`text-xs ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Add multiple stock transfer records in one submission.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMultipleInput(false);
                      setError("");
                      setMessage("");
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      darkMode
                        ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                        : "bg-[#E5E7EB] text-[#374151] hover:bg-[#D1D5DB]"
                    }`}
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

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-3.5">
                        <input
                          type="text"
                          placeholder="Item Name"
                          value={row.itemName}
                          onChange={(e) =>
                            updateBulkRow(index, "itemName", e.target.value)
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all lg:col-span-2 ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />

                        <input
                          type="text"
                          placeholder="Purpose (optional)"
                          value={row.purpose}
                          onChange={(e) =>
                            updateBulkRow(index, "purpose", e.target.value)
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all lg:col-span-2 ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />

                        <select
                          value={row.type}
                          onChange={(e) => updateBulkRow(index, "type", e.target.value)}
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        >
                          {transferTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            updateBulkRow(index, "quantity", e.target.value)
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />

                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateBulkRow(index, "date", e.target.value)}
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />

                        <select
                          value={row.category}
                          onChange={(e) =>
                            updateBulkRow(index, "category", e.target.value)
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        >
                          {getCategoryOptionsByType(row.type).map((option) => (
                            <option key={`${row.type}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={row.remark}
                          onChange={(e) => updateBulkRow(index, "remark", e.target.value)}
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        >
                          {REMARK_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Receiver"
                          value={row.receiver || ""}
                          onChange={(e) =>
                            updateBulkRow(index, "receiver", e.target.value)
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />
                      </div>
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
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> Add Multiple Records
                  </button>
                </div>
              </div>
            )}

            <div
              className={`rounded-xl shadow-xl overflow-hidden border mb-4 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div
                className={`p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-3 ${
                  darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                }`}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter records by name, type, category, purpose"
                  className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                  }`}
                />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth("");
                    setSearchTerm("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    darkMode
                      ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
                      : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                  }`}
                >
                  Clear Filters
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead
                    className={`${
                      darkMode
                        ? "bg-[#111827] text-[#D1D5DB]"
                        : "bg-[#F9FAFB] text-[#374151]"
                    }`}
                  >
                    <tr>
                      {[
                        "ITEM NAME",
                        "PURPOSE",
                        "QUANTITY",
                        "DATE",
                        "TYPE / CATEGORY",
                        "REMARK",
                        "RECEIVER",
                        "ACTION",
                      ].map((head) => (
                        <th
                          key={head}
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-center"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}
                  >
                    {currentItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className={`text-center p-8 sm:p-12 ${
                            darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          } animate__animated animate__fadeIn`}
                        >
                          <PackageCheck
                            className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${
                              darkMode ? "text-[#6B7280]" : "text-[#D1D5DB]"
                            }`}
                          />
                          <p className="text-base sm:text-lg font-medium mb-1">
                            No stock transfer records yet
                          </p>
                          <p className="text-xs sm:text-sm opacity-75">
                            Add your first transfer record using the form above
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((record, index) => (
                        <tr
                          key={record.id}
                          className={`border-t transition animate__animated animate__fadeIn animate__faster ${
                            darkMode
                              ? "border-[#374151] hover:bg-[#374151]/40"
                              : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                          }`}
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <td className="px-4 py-3 text-center align-middle font-semibold text-sm whitespace-nowrap">
                            {record.itemName}
                          </td>
                          <td className="px-4 py-3 align-middle text-xs sm:text-sm">
                            {(record.purpose || "").trim() || "-"}
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                                darkMode
                                  ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                                  : "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]"
                              }`}
                            >
                              {record.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm">
                            {record.date}
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <div className="flex flex-col items-center gap-2">
                              <span
                                className={`text-[11px] uppercase tracking-wide font-semibold ${
                                  darkMode ? "text-[#E5E7EB]" : "text-[#1F2937]"
                                }`}
                              >
                                {record.type}
                              </span>
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                  darkMode
                                    ? "bg-[#111827] border-[#374151] text-[#D1D5DB]"
                                    : "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]"
                                }`}
                              >
                                {record.category}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm font-semibold">
                            {record.remark}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm">
                            {(record.receiver || "").trim() || "-"}
                          </td>

                          <td className="px-4 py-3 text-center align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditRecord(record)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  darkMode
                                    ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#374151]"
                                    : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                                }`}
                                title="Edit record"
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
                                    darkMode
                                      ? "bg-red-900/30 text-red-200 hover:bg-red-900/40"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                  title="Remove record"
                                >
                                  X
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length > itemsPerPage && (
                <div
                  className={`flex items-center justify-between px-4 py-3 border-t ${
                    darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}
                  >
                    Showing {indexOfFirstItem + 1} to{" "}
                    {Math.min(indexOfLastItem, filteredRecords.length)} of{" "}
                    {filteredRecords.length} entries
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? darkMode
                            ? "bg-[#374151] text-[#6B7280] cursor-not-allowed"
                            : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                          : darkMode
                            ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pageNum, idx) =>
                        pageNum === "..." ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className={`px-3 py-2 ${
                              darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                            }`}
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`px-3 py-2 rounded-lg font-medium transition-all ${
                              currentPage === pageNum
                                ? "bg-[#1E40AF] text-white shadow-md"
                                : darkMode
                                  ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                                  : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                            }`}
                          >
                            {pageNum}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? darkMode
                            ? "bg-[#374151] text-[#6B7280] cursor-not-allowed"
                            : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                          : darkMode
                            ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
