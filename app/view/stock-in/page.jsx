"use client";

// Force dynamic rendering to avoid pre-rendering issues with useSearchParams
export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import AuthGuard from "../../components/AuthGuard";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import { logActivity } from "../../utils/logActivity";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
  PackageOpen,
  Plus,
  Clock,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "animate.css";
import {
  fetchParcelItems,
  handleAddParcelIn,
  updateParcelInItemHelper,
} from "../../utils/parcelShippedHelper";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import useBulkStockInForm from "../../hook/useBulkStockInForm";
import StockInBulkRow from "../../components/StockInBulkRow";
import { products } from "../../utils/productsData";
import { CATEGORIES, CATEGORY_OPTIONS, getCategoryColor, getCategoryIcon } from "../../utils/categoryUtils";
import { buildProductCode } from "../../utils/inventoryMeta";

function PageContent() {
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("item");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [items, setItems] = useState([]);
  
  // Single input form state
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  
  // Multiple products state for parcels
  const [parcelRows, setParcelRows] = useState([
    {
      id: 1,
      name: itemParam || "",
      quantity: 1,
      price: "",
      category: CATEGORIES.ELECTRONICS,
      shippingMode: "",
      clientName: "",
    }
  ]);
  
  // Common date and time for all parcels
  const [date, setDate] = useState("");
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES.OTHERS);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  // Calculate total price from all parcel rows
  const computedTotalPrice = parcelRows.reduce((total, row) => {
    return total + (Number(row.price) || 0) * (Number(row.quantity) || 0);
  }, 0);
  const [isUpdatingCategoryId, setIsUpdatingCategoryId] = useState(null);
  const [showStockInHistory, setShowStockInHistory] = useState(false);
  const [showMultipleInput, setShowMultipleInput] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { role, displayName, userEmail } = useAuth();
  const isAdmin = isAdminRole(role);

  const {
    bulkRows,
    addRow,
    removeRow,
    updateRow,
    handleBulkSubmit,
    error: bulkError,
    message: bulkMessage,
  } = useBulkStockInForm({
    onSuccess: async () => {
      await loadItems();
    },
    actor: { role, displayName, userEmail },
  });

  // Calculate unique items (count of distinct item names)
  const getUniqueItemCount = (itemsList) => {
    const uniqueNames = new Set(itemsList.map(item => item.name).filter(Boolean));
    return uniqueNames.size;
  };

  const uniqueItemCount = getUniqueItemCount(items);

  const handleTransferCategory = async (itemId, nextCategory) => {
    setIsUpdatingCategoryId(itemId);
    const updated = await updateParcelInItemHelper(itemId, {
      category: nextCategory || CATEGORIES.OTHERS,
    });

    if (updated) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === itemId ? { ...row, category: updated.category } : row,
        ),
      );
    } else {
      alert("Failed to transfer category.");
    }

    setIsUpdatingCategoryId(null);
  };

  useEffect(() => {
    if (itemParam) {
      setName(itemParam);
    }
  }, [itemParam]);

  // Sync name with first parcel row when in single input mode
  useEffect(() => {
    if (!showMultipleInput && parcelRows.length > 0) {
      setParcelRows(rows => rows.map((row, idx) => 
        idx === 0 ? { ...row, name, quantity } : row
      ));
    }
  }, [name, quantity, showMultipleInput]);

  const updateParcelRow = (id, field, value) => {
    setParcelRows(parcelRows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Reset quantity to 1 when item changes
        if (field === 'name') {
          updatedRow.quantity = 1;
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const calculateTotalPrice = () => {
    return parcelRows.reduce((total, row) => {
      const quantityToAdd = parseInt(row.quantity) || 0;
      const computedTotalPrice = (parseFloat(row.price) || 0) * quantityToAdd;
      return total + computedTotalPrice;
    }, 0);
  };

  // Helper function for conditional styling
  const getClassName = (darkMode, darkClass, lightClass) => {
    return darkMode ? darkClass : lightClass;
  };

  const loadItems = async () => {
    const inItems = await fetchParcelItems();
    setItems(inItems);
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");

    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    const formattedMinute = minute < 10 ? `0${minute}` : `${minute}`;

    setTimeHour(hour.toString());
    setTimeMinute(formattedMinute);
    setTimeAMPM(ampm);
    loadItems();
  }, []);

  const formatTo12Hour = (time) => {
    if (!time) return "";
    if (time.includes("AM") || time.includes("PM")) return time;
    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    // Validate that at least one parcel is selected and all required fields are filled
    const validParcels = parcelRows.filter(row => row.name && row.quantity && date);
    if (validParcels.length === 0) {
      alert("Please select at least one item and fill all required fields");
      return;
    }

    const confirmed = window.confirm(
      `Confirm Stock In: Are you sure you want to add ${validParcels.length} item(s) to stock in?`,
    );
    if (!confirmed) return;

    // Process each valid parcel row
    let successCount = 0;
    for (const row of validParcels) {
      const rowTotalPrice = (Number(row.price) || 0) * (Number(row.quantity) || 0);
      const result = await handleAddParcelIn({
        name: row.name,
        date,
        quantity: row.quantity,
        timeHour,
        timeMinute,
        timeAMPM,
        shipping_mode: shippingMode || row.shippingMode,
        client_name: clientName || row.clientName,
        price: rowTotalPrice,
        category: category,
      });
      if (result && result.newItem) {
        successCount++;
        await logActivity({
          userId: userEmail || null,
          userName: displayName || userEmail || "Unknown User",
          userType: role || "staff",
          action: "Stock IN",
          module: "Inventory",
          details: `Added ${row.quantity}x ${row.name}`,
        });
      }
    }
    
    // Reload items to show updated list
    await loadItems();

    // Reset form
    setName("");
    setQuantity(1);
    setParcelRows([{
      id: 1,
      name: "",
      quantity: 1,
      price: "",
      category: CATEGORIES.ELECTRONICS,
      shippingMode: "",
      clientName: "",
    }]);
    setDate("");
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    setShippingMode("");
    setClientName("");
    setPrice("");
    
    alert(`${successCount} Stock In record(s) added successfully.`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-black"
        }`}
      >
        {/* Top Navbar */}
        <TopNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab="stock-in"
          darkMode={darkMode}
        />

        {/* Main Content */}
        <main
          className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-0"
          } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Header */}
            <div className="mb-10 animate__animated animate__fadeInDown animate__faster">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div
                  className={`flex-1 h-[2px] ${
                    darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"
                  }`}
                ></div>
                <div className="flex items-center gap-2 px-3">
                  <PackageOpen
                    className={`w-6 h-6 ${
                      darkMode ? "text-[#F97316]" : "text-[#EA580C]"
                    }`}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">
                    Stock In
                  </h1>
                </div>
                <div
                  className={`flex-1 h-[2px] ${
                    darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"
                  }`}
                ></div>
              </div>
              <div className="text-center">
                <p
                  className={`text-sm ${
                    darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                  }`}
                >
                  Record items coming into your inventory
                </p>
              </div>
            </div>

            {/* Form */}
            {!showMultipleInput && (
            <form
              onSubmit={handleAddItem}
              className={getClassName(
                darkMode,
                "p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster bg-[#1F2937] border-[#374151] text-white",
                "p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster bg-white border-[#E5E7EB] text-[#111827]"
              )}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <Plus
                    className={getClassName(
                      darkMode,
                      "w-5 h-5 text-[#3B82F6]",
                      "w-5 h-5 text-[#1E3A8A]"
                    )}
                  />
                  <h2 className="text-lg font-semibold">Add New Item</h2>
                </div>
              </div>

              {/* Row 1: Item Name, Date, Quantity, Time In */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Item Name */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <Package className="w-3.5 h-3.5" /> Item Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Item name"
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                    required
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <Calendar className="w-3.5 h-3.5" /> Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <PackageCheck className="w-3.5 h-3.5" /> Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                    required
                  />
                </div>

                {/* Time In */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <Clock className="w-3.5 h-3.5" /> Time In
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      )}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <span className="self-center text-sm">:</span>
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      )}
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                    <select
                      value={timeAMPM}
                      onChange={(e) => setTimeAMPM(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-2 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      )}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Category, Shipping Mode, Client Name, Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Category */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <Package className="w-3.5 h-3.5" /> Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                    required
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shipping Mode */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300",
                    "text-xs font-medium mb-1.5 text-gray-700"
                  )}>
                    Shipping Mode
                  </label>
                  <input
                    type="text"
                    value={shippingMode}
                    onChange={(e) => setShippingMode(e.target.value)}
                    placeholder="Shopee (J&T)"
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                  />
                  <p className={getClassName(
                    darkMode,
                    "text-[10px] mt-1 text-gray-400",
                    "text-[10px] mt-1 text-gray-500"
                  )}>
                    Display Price: ₱{computedTotalPrice.toLocaleString()}
                  </p>
                </div>

                {/* Client Name */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300",
                    "text-xs font-medium mb-1.5 text-gray-700"
                  )}>
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name"
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                  />
                </div>
                {/* Price */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300",
                    "text-xs font-medium mb-1.5 text-gray-700"
                  )}>
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowMultipleInput(true)}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Multiple Items
                </button>
                <button
                  type="submit"
                  className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </form>
            )}

            {showMultipleInput && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleBulkSubmit();
                }}
                className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151] text-white"
                    : "bg-white border-[#E5E7EB] text-[#111827]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h2 className="text-lg font-semibold">Multiple Stock In</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMultipleInput(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm hover:shadow-md"
                    >
                      Back to Single Input
                    </button>
                    <button
                      type="button"
                      onClick={addRow}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Row
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <StockInBulkRow
                      key={`stock-in-row-${index}`}
                      row={row}
                      index={index}
                      onChange={updateRow}
                      onRemove={removeRow}
                      darkMode={darkMode}
                    />
                  ))}
                </div>

                {bulkError && (
                  <p className="mt-4 text-sm font-medium text-[#DC2626]">{bulkError}</p>
                )}
                {bulkMessage && (
                  <p className="mt-4 text-sm font-medium text-[#16A34A]">{bulkMessage}</p>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> Submit Multiple Items
                  </button>
                </div>
              </form>
            )}

            {isAdmin && (
              <div
                className={`rounded-xl shadow-xl overflow-hidden border mb-4 ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowStockInHistory((prev) => !prev)}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    darkMode
                      ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#1F2937]"
                      : "bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {showStockInHistory ? "hide" : "show"}
                </button>
              </div>
            )}

            {isAdmin && showStockInHistory && (
            <>
            {/* Stats */}
            <div
              className={`mb-6 flex justify-between p-4 rounded-lg shadow animate__animated animate__fadeInUp animate__fast ${
                darkMode
                  ? "bg-[#1F2937] text-white border border-[#374151]"
                  : "bg-white text-[#111827] border border-[#E5E7EB]"
              }`}
            >
              <div className="font-medium">
                Unique Items: <span className="font-bold">{uniqueItemCount}</span>
              </div>
              <div className="font-medium">
                Total Records: <span className="font-bold">{items.length}</span>
              </div>
              <div className="font-medium">
                Total Quantity:{" "}
                <span className="font-bold">
                  {items.reduce((sum, item) => sum + Number(item.quantity), 0)}
                </span>
              </div>
            </div>

            {/* Table */}
            <div
              className={`rounded-xl shadow-lg overflow-hidden border animate__animated animate__fadeInDown ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="overflow-y-auto overflow-x-auto max-h-[600px]">
                <table className="w-full min-w-[1050px] table-fixed">
                  <thead
                    className={`sticky top-0 z-10 ${
                      darkMode
                        ? "bg-[#111827] border-b border-[#374151]"
                        : "bg-[#F9FAFB] border-b border-[#E5E7EB]"
                    }`}
                  >
                      <tr>
                        {[
                          "CODE",
                          "PRODUCT",
                          "CATEGORY",
                          "DATE",
                          "QUANTITY",
                          "TIME IN",
                          "SHIPPING",
                          "CLIENT",
                          "PRICE",
                        ].map(
                        (head) => (
                          <th
                            key={head}
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider whitespace-nowrap ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {head}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"
                    }`}
                  >
                      {currentItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan="9"
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
                            No items added yet
                          </p>
                          <p className="text-xs sm:text-sm opacity-75">
                            Add your first item using the form above
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`transition-all duration-200 animate__animated animate__fadeInUp ${
                            darkMode
                              ? "hover:bg-[#374151]/40"
                              : "hover:bg-[#F3F4F6]"
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <td className="p-3 sm:p-4 text-center align-middle text-xs sm:text-sm whitespace-nowrap">
                            {buildProductCode(item, "CMP")}
                          </td>
                          <td className="p-3 sm:p-4 font-semibold text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            {item.name}
                          </td>
                          <td className="p-3 sm:p-4 text-center align-middle">
                            <div className="flex flex-col items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                              >
                                <span className="mr-1">
                                  {getCategoryIcon(item.category)}
                                </span>
                                {item.category || "Others"}
                              </span>
                              <select
                                value={item.category || CATEGORIES.OTHERS}
                                onChange={(e) =>
                                  handleTransferCategory(item.id, e.target.value)
                                }
                                disabled={isUpdatingCategoryId === item.id}
                                className={`text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 ${
                                  darkMode
                                    ? "bg-[#111827] border-[#374151] text-white focus:ring-[#3B82F6]"
                                    : "bg-white border-[#D1D5DB] text-black focus:ring-[#1E3A8A]"
                                }`}
                                aria-label="Transfer category"
                              >
                                {CATEGORY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center align-middle text-sm sm:text-base ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {item.date}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${
                                darkMode
                                  ? "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30"
                                  : "bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]"
                              }`}
                            >
                              {item.quantity} units
                            </span>
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center align-middle text-sm sm:text-base ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50" />
                              {formatTo12Hour(item.timeIn)}
                            </div>
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle text-sm sm:text-base ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {item.shipping_mode || "-"}
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle text-sm sm:text-base ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {item.client_name || "-"}
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle text-sm sm:text-base ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {item.price !== null && item.price !== undefined
                              ? `₱${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border transition-colors ${
                  darkMode
                    ? "border-[#374151] bg-[#1F2937] text-white hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed"
                    : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                darkMode ? "bg-[#374151] text-white" : "bg-[#E5E7EB] text-[#374151]"
              }`}>
                Page {currentPage} of {totalPages}
              </span>

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
            </>
              )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
