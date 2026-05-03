"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGuard from "../../components/AuthGuard";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import { logActivity } from "../../utils/logActivity";
import { useAuth } from "../../hook/useAuth";
import { PackageOpen, Plus, Clock, Calendar, Package } from "lucide-react";
import "animate.css";
import {
  fetchParcelOutItems,
  handleAddParcelOut,
  updateParcelOutItemHelper,
} from "../../utils/parcelOutHelper";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import useBulkStockOutForm from "../../hook/useBulkStockOutForm";
import StockOutBulkRow from "../../components/StockOutBulkRow";
import { CATEGORIES, CATEGORY_OPTIONS, getCategoryColor, getCategoryIcon } from "../../utils/categoryUtils";
import { buildProductCode } from "../../utils/inventoryMeta";

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [items, setItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [date, setDate] = useState("");
  const { role, displayName, userEmail } = useAuth();
  
  // Single item selection state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  
  // Computed values for stock availability
  const availableStock = useMemo(() => {
    if (!selectedItemId) return 0;
    const item = availableItems.find(item => item.name === selectedItemId || item.id === selectedItemId);
    return item ? item.quantity : 0;
  }, [selectedItemId, availableItems]);
  
  const maxQuantity = availableStock;
  const canAddParcelOut = availableStock > 0;
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES.OTHERS);
  const [selectedFilter, setSelectedFilter] = useState("");
  const computedTotalPrice = (Number(price) || 0) * (Number(quantity) || 0);
  const [isUpdatingCategoryId, setIsUpdatingCategoryId] = useState(null);
  const [showStockOutHistory, setShowStockOutHistory] = useState(false);
  const [showMultipleInput, setShowMultipleInput] = useState(false);

  const handleTransferCategory = async (itemId, nextCategory) => {
    setIsUpdatingCategoryId(itemId);
    const updated = await updateParcelOutItemHelper(itemId, {
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

  // Multi-product state
  const [parcelRows, setParcelRows] = useState([
    {
      id: 1,
      name: "",
      quantity: 1,
      price: "",
      category: CATEGORIES.ELECTRONICS,
      shippingMode: "",
      clientName: "",
    }
  ]);

  // Helper functions for multi-product management
  const addParcelRow = () => {
    const newId = Math.max(...parcelRows.map(row => row.id)) + 1;
    setParcelRows([
      ...parcelRows,
      {
        id: newId,
        name: "",
        quantity: 1,
        price: "",
        category: CATEGORIES.ELECTRONICS,
        shippingMode: "",
        clientName: "",
      }
    ]);
  };

  const removeParcelRow = (id) => {
    if (parcelRows.length > 1) {
      setParcelRows(parcelRows.filter(row => row.id !== id));
    }
  };

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

  const getUniqueItemCount = (itemsList) => {
    const uniqueNames = new Set(itemsList.map(item => item.name).filter(Boolean));
    return uniqueNames.size;
  };

  const uniqueOutItemCount = getUniqueItemCount(items);

  // Helper function for conditional styling
  const getClassName = (darkMode, darkClass, lightClass) => {
    return darkMode ? darkClass : lightClass;
  };

  const aggregateAvailableItems = (rows) => {
    const grouped = (rows || []).reduce((acc, row) => {
      const key = row.name;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { id: key, name: key, quantity: 0 };
      }
      acc[key].quantity += Number(row.quantity || 0);
      return acc;
    }, {});

    return Object.values(grouped)
      .filter((row) => row.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
  };

  const loadStockOutData = async () => {
    const outItems = await fetchParcelOutItems();
    setItems(outItems);
    const inItems = await fetchParcelItems();
    setAvailableItems(aggregateAvailableItems(inItems));
  };

  const {
    bulkRows,
    addRow,
    removeRow,
    updateRow,
    handleBulkSubmit,
    error: bulkError,
    message: bulkMessage,
  } = useBulkStockOutForm({
    onSuccess: async () => {
      await loadStockOutData();
    },
    actor: { role, displayName, userEmail },
    availableItems,
  });

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
    loadStockOutData();
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
    
    // For single input mode, use the direct state values to avoid race condition
    const isSingleInput = !showMultipleInput;
    const rowsToProcess = isSingleInput
      ? [{
          id: 1,
          name: selectedItemId,
          quantity: parseInt(quantity) || 1,
          price: price,
          category: category,
          shippingMode: shippingMode,
          clientName: clientName,
        }]
      : parcelRows;
    
    // Validate all rows have required fields
    const invalidRows = rowsToProcess.filter(row => !row.name || row.quantity <= 0);
    if (invalidRows.length > 0) {
      alert("Please fill in all required fields (Item Name and Quantity) for each row.");
      return;
    }

    // Add each row
    let successCount = 0;
    for (const row of rowsToProcess) {
      const quantityToAdd = parseInt(row.quantity);
      const rowTotalPrice = (parseFloat(row.price) || 0) * quantityToAdd;

      const result = await handleAddParcelOut({
        item_name: row.name,
        date,
        quantity: quantityToAdd,
        timeHour,
        timeMinute,
        timeAMPM,
        shipping_mode: row.shippingMode || shippingMode,
        client_name: row.clientName || clientName,
        price: rowTotalPrice,
        category: row.category || category,
      });

      if (result && result.newItem) {
        successCount++;
        await logActivity({
          userId: userEmail || null,
          userName: displayName || userEmail || "Unknown User",
          userType: role || "staff",
          action: "Stock OUT",
          module: "Inventory",
          details: `Removed ${quantityToAdd}x ${row.name} (Client: ${row.clientName || clientName || "N/A"})`,
        });
      }
    }
    
    // Reload data
    await loadStockOutData();

    alert(
      `✅ Successfully created ${successCount} Stock Out record(s)!`,
    );

    // Reset form
    setSelectedItemId("");
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
    setQuantity(1);
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    setShippingMode("");
    setClientName("");
    setPrice("");
    setCategory(CATEGORIES.OTHERS);
  };

  const filteredItems = selectedFilter
    ? items.filter((item) => item.name === selectedFilter)
    : items;
  const filterOptions = Array.from(
    new Set((items || []).map((item) => item.name).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

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
          activeTab="stock-out"
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
                      darkMode ? "text-[#EF4444]" : "text-[#DC2626]"
                    }`}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">
                    Stock Out
                  </h1>
                </div>
                <div
                  className={`flex-1 h-[2px] ${
                    darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"
                  }`}
                ></div>
              </div>
              <p
                className={`text-sm ${
                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                Record items going out of your inventory
              </p>
            </div>

            {/* Add Item Form */}
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
                      "w-5 h-5 text-[#EF4444]",
                      "w-5 h-5 text-[#DC2626]"
                    )}
                  />
                  <h2 className="text-lg font-semibold">Out Item</h2>
                </div>
              </div>

              {/* Row 1: Item Name, Date, Quantity, Time Out */}
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
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setQuantity(1);
                    }}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
                    )}
                    required
                  >
                    <option value="" disabled>Please select</option>
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name} (Stock: {item.quantity})
                      </option>
                    ))}
                  </select>
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
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
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
                    <Package className="w-3.5 h-3.5" /> Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!selectedItemId || !canAddParcelOut}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white disabled:bg-[#0B0B0B] disabled:opacity-50 disabled:cursor-not-allowed",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black disabled:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    required
                  />
                  {selectedItemId && !canAddParcelOut && (
                    <p className="text-[10px] text-[#EF4444] mt-1">⚠️ No stock available</p>
                  )}
                  {selectedItemId && canAddParcelOut && (
                    <p className={getClassName(darkMode, "text-[10px] mt-1 text-gray-400", "text-[10px] mt-1 text-gray-500")}>
                      Available: {availableStock} units (1-{maxQuantity})
                    </p>
                  )}
                </div>

                {/* Time Out */}
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-xs font-medium mb-1.5 text-gray-300 flex items-center gap-1",
                    "text-xs font-medium mb-1.5 text-gray-700 flex items-center gap-1"
                  )}>
                    <Clock className="w-3.5 h-3.5" /> Time Out
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={`border rounded-lg px-2 py-2 flex-1 min-w-[50px] focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#DC2626] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className={`border rounded-lg px-2 py-2 flex-1 min-w-[50px] focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#DC2626] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={timeAMPM}
                      onChange={(e) => setTimeAMPM(e.target.value)}
                      className={`border rounded-lg px-2 py-2 w-[60px] min-w-[60px] shrink-0 focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#DC2626] bg-white text-black"
                      }`}
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
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
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
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
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
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
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
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
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
                  disabled={!canAddParcelOut}
                  className={`bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg ${
                    canAddParcelOut ? "" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-4 h-4" /> Out Item
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
                className={`p-6 rounded-xl shadow-lg mb-8 border animate__animated animate__fadeInUp ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h2
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Multiple Stock Out
                  </h2>
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
                      className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Row
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <StockOutBulkRow
                      key={`stock-out-row-${index}`}
                      row={row}
                      index={index}
                      onChange={updateRow}
                      onRemove={removeRow}
                      darkMode={darkMode}
                      availableItems={availableItems}
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
                    className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> Submit Multiple Items
                  </button>
                </div>
              </form>
            )}

            <div
              className={`rounded-xl shadow-xl overflow-hidden border mb-4 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <button
                type="button"
                onClick={() => setShowStockOutHistory((prev) => !prev)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                  darkMode
                    ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#1F2937]"
                    : "bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]"
                }`}
              >
                {showStockOutHistory ? "hide" : "show"}
              </button>
            </div>

            {showStockOutHistory && (
            <>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <label
                className={`text-sm font-medium ${
                  darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                }`}
              >
                Filter by Item:
              </label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className={`border rounded-lg px-3 py-2 w-60 focus:outline-none focus:ring-2 transition-all ${
                  darkMode
                    ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white"
                    : "border-[#D1D5DB] focus:ring-[#DC2626] focus:border-[#DC2626] bg-white text-black"
                }`}
              >
                <option value="">All Items</option>
                {filterOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div
              className={`mb-6 flex justify-between p-4 rounded-lg shadow animate__animated animate__fadeInUp animate__fast ${
                darkMode
                  ? "bg-[#1F2937] text-white border border-[#374151]"
                  : "bg-white text-[#111827] border border-[#E5E7EB]"
              }`}
            >
              <div className="font-medium">
                Unique Items Out: <span className="font-bold">{uniqueOutItemCount}</span>
              </div>
              <div className="font-medium">
                Total Records: <span className="font-bold">{items.length}</span>
              </div>
              <div className="font-medium">
                Available Types: <span className="font-bold">{availableItems.length}</span>
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
                        "Code",
                        "Product",
                        "Category",
                        "Date",
                        "Quantity",
                        "Time Out",
                        "Shipping",
                        "Client",
                        "Price",
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
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className={`px-4 sm:px-6 py-12 sm:py-16 text-center ${
                            darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          }`}
                        >
                          <PackageOpen
                            className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 animate__animated animate__bounce animate__infinite animate__slow ${
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
                      filteredItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`transition-all duration-200 animate__animated animate__fadeInUp ${
                            darkMode
                              ? "hover:bg-[#374151]/40"
                              : "hover:bg-[#F3F4F6]"
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle text-xs sm:text-sm whitespace-nowrap ${
                              darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                            }`}
                          >
                            {item.item_code || buildProductCode(item, "CMP")}
                          </td>
                          <td
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle font-semibold text-sm sm:text-base break-words whitespace-normal ${
                              darkMode ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {item.name}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center align-middle">
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
                                  ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                                  : "bg-[#FFEDD5] text-[#DC2626] border border-[#FED7AA]"
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
                              {formatTo12Hour(item.timeOut)}
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
            </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
