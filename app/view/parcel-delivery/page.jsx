/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useState, useEffect } from "react";
import AuthGuard from "../../components/AuthGuard";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import { PackageOpen, Plus, Clock, Calendar, Package, X } from "lucide-react";
import "animate.css";
import {
  fetchParcelOutItems,
  handleAddParcelOut,
} from "../../utils/parcelOutHelper";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import { CATEGORIES, CATEGORY_OPTIONS, getCategoryColor, getCategoryIcon } from "../../utils/categoryUtils";

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [items, setItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [date, setDate] = useState("");
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [selectedFilter, setSelectedFilter] = useState("");

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

  const loadItems = async () => {
    const outItems = await fetchParcelOutItems();
    setItems(outItems);
    const inItems = await fetchParcelItems();
    setAvailableItems(aggregateAvailableItems(inItems));
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
    
    // Validate all rows have required fields
    const invalidRows = parcelRows.filter(row => !row.name || row.quantity <= 0);
    if (invalidRows.length > 0) {
      alert("Please fill in all required fields (Item Name and Quantity) for each row.");
      return;
    }

    // Add each row
    for (const row of parcelRows) {
      const quantityToAdd = parseInt(row.quantity);
      const computedTotalPrice = (parseFloat(row.price) || 0) * quantityToAdd;

      const result = await handleAddParcelOut({
        item_name: row.name,
        date,
        quantity: quantityToAdd,
        timeHour,
        timeMinute,
        timeAMPM,
        shipping_mode: row.shippingMode,
        client_name: row.clientName,
        price: computedTotalPrice,
        category: row.category,
      });

      if (!result || !result.newItem) {
        alert(`Failed to add item: ${row.name}`);
        return;
      }
    }

    // Reload items and reset form
    await loadItems();
    
    // Reset form after successful submission
    setParcelRows([{
      id: 1,
      name: "",
      quantity: 1,
      price: "",
      category: CATEGORIES.ELECTRONICS,
      shippingMode: "",
      clientName: "",
    }]);

    alert(`✅ Successfully created ${parcelRows.length} Parcel Out items!`);
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
          activeTab="parcel-delivery"
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

            {/* Form */}
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
                  <h2 className="text-lg font-semibold">Items to Out</h2>
                </div>
              </div>

              {/* Date and Time (shared for all items) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-sm font-medium mb-2 text-gray-300",
                    "text-sm font-medium mb-2 text-gray-700"
                  )}>
                    <Calendar className="w-4 h-4 inline mr-1" /> Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={getClassName(
                      darkMode,
                      "border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                      "border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    )}
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label className={getClassName(
                    darkMode,
                    "text-sm font-medium mb-2 text-gray-300",
                    "text-sm font-medium mb-2 text-gray-700"
                  )}>
                    <Clock className="w-4 h-4 inline mr-1" /> Time Out
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      )}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <span className="self-center">:</span>
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                        "border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      )}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-product rows */}
              <div className="space-y-4 mb-6">
                {parcelRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={getClassName(
                      darkMode,
                      "p-4 rounded-lg border bg-[#111827] border-[#374151]",
                      "p-4 rounded-lg border bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={getClassName(
                        darkMode,
                        "text-sm font-medium text-gray-300",
                        "text-sm font-medium text-gray-700"
                      )}>
                        Item {index + 1}
                      </h4>
                      {parcelRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParcelRow(row.id)}
                          className={getClassName(
                            darkMode,
                            "p-1 rounded hover:bg-red-900/20 text-red-400 transition-colors",
                            "p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                          )}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Item Name */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Item Name
                        </label>
                        <select
                          value={row.name}
                          onChange={(e) => updateParcelRow(row.id, 'name', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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

                      {/* Quantity */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => updateParcelRow(row.id, 'quantity', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                          )}
                          required
                        />
                      </div>

                      {/* Category */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Category
                        </label>
                        <select
                          value={row.category}
                          onChange={(e) => updateParcelRow(row.id, 'category', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                          )}
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Price */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Price per Unit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.price}
                          onChange={(e) => updateParcelRow(row.id, 'price', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                          )}
                        />
                      </div>

                      {/* Shipping Mode */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Shipping Mode
                        </label>
                        <input
                          type="text"
                          value={row.shippingMode}
                          onChange={(e) => updateParcelRow(row.id, 'shippingMode', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                          )}
                        />
                      </div>

                      {/* Client Name */}
                      <div className="flex flex-col">
                        <label className={getClassName(
                          darkMode,
                          "text-xs font-medium mb-1 text-gray-400",
                          "text-xs font-medium mb-1 text-gray-600"
                        )}>
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={row.clientName}
                          onChange={(e) => updateParcelRow(row.id, 'clientName', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Price Display */}
              <div className="mb-6 p-4 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className={getClassName(
                    darkMode,
                    "text-lg font-semibold text-white",
                    "text-lg font-semibold text-gray-900"
                  )}>
                    Total Price:
                  </span>
                  <span className={getClassName(
                    darkMode,
                    "text-xl font-bold text-green-400",
                    "text-xl font-bold text-green-600"
                  )}>
                    ₱{calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={addParcelRow}
                  className={getClassName(
                    darkMode,
                    "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors",
                    "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-black px-4 py-2 rounded-lg font-medium transition-colors"
                  )}
                >
                  <Plus className="w-4 h-4" /> Add Item Row
                </button>
                <button
                  type="submit"
                  className={getClassName(
                    darkMode,
                    "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors",
                    "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-black px-6 py-2.5 rounded-lg font-medium transition-colors"
                  )}
                >
                  <Plus className="w-5 h-5" /> Out {parcelRows.length} {parcelRows.length === 1 ? 'Item' : 'Items'}
                </button>
              </div>
            </form>

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
                    ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                    : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
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
                        "Item Name",
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
                          colSpan={8}
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
                            className={`px-4 sm:px-6 py-3 sm:py-4 text-center align-middle font-semibold text-sm sm:text-base break-words whitespace-normal ${
                              darkMode ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {item.name}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                            >
                              <span className="mr-1">{getCategoryIcon(item.category)}</span>
                              {item.category || 'Others'}
                            </span>
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
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
