/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useState, useEffect } from "react";
import AuthGuard from "../../components/AuthGuard";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import { PackageOpen, Plus, Clock, Calendar, Package } from "lucide-react";
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
  const [selectedItemId, setSelectedItemId] = useState("");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES.OTHERS);
  const [selectedFilter, setSelectedFilter] = useState("");
  const computedTotalPrice = (Number(price) || 0) * (Number(quantity) || 0);

  // Calculate unique items (count of distinct item names)
  const getUniqueItemCount = (itemsList) => {
    const uniqueNames = new Set(itemsList.map(item => item.name).filter(Boolean));
    return uniqueNames.size;
  };

  const uniqueOutItemCount = getUniqueItemCount(items);

  const selectedItem = availableItems.find(
    (item) => item.name === selectedItemId,
  );
  const availableStock = selectedItem?.quantity || 0;
  const maxQuantity = availableStock;
  const canAddParcelOut = availableStock > 0;

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

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");

    const loadItems = async () => {
      const outItems = await fetchParcelOutItems();
      setItems(outItems);
      const inItems = await fetchParcelItems();
      setAvailableItems(aggregateAvailableItems(inItems));
    };

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
    if (!selectedItemId) return;

    const result = await handleAddParcelOut({
      item_name: selectedItemId,
      date,
      quantity: Number(quantity),
      timeHour,
      timeMinute,
      timeAMPM,
      shipping_mode: shippingMode,
      client_name: clientName,
      price: computedTotalPrice,
      category: category,
    });

    if (!result || !result.newItem) return;

    setItems(result.updatedOut || []);
    setAvailableItems(aggregateAvailableItems(result.updatedIn || []));

    alert(
      `✅ Successfully created Parcel Out!\n` +
        `Item: ${selectedItemId}\n` +
        `Quantity Out: ${quantity} units`,
    );

    setSelectedItemId("");
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
        className={`flex flex-col w-full h-screen overflow-hidden ${
          darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
        }`}
      >
        {/* Top Navbar */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-sm ${
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

        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
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
                className={`text-center text-sm ${
                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                Record items going out of your inventory
              </p>
            </div>

            {/* Add Item Form */}
            <form
              onSubmit={handleAddItem}
              className={`p-6 rounded-xl shadow-lg mb-8 border animate__animated animate__fadeInUp ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center gap-2 mb-5">
                <Plus
                  className={`w-5 h-5 ${
                    darkMode ? "text-[#F97316]" : "text-[#EA580C]"
                  }`}
                />
                <h2
                  className={`text-lg font-semibold ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Out Item
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Item Name */}
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Package className="w-4 h-4" /> Item Name
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setQuantity(1);
                    }}
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                    required
                  >
                    <option value="" disabled>
                      Please select
                    </option>
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name} (Stock: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Calendar className="w-4 h-4" /> Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col">
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
                    max={maxQuantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!selectedItemId || !canAddParcelOut}
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white disabled:bg-[#0B0B0B] disabled:opacity-50 disabled:cursor-not-allowed"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black disabled:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                    required
                  />
                  {selectedItemId && !canAddParcelOut && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      ⚠️ No stock available
                    </p>
                  )}
                  {selectedItemId && canAddParcelOut && (
                    <p
                      className={`text-xs mt-1 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                    >
                      Available: {availableStock} units (can take out 1-
                      {maxQuantity})
                    </p>
                  )}
                  {selectedItemId && (
                    <p
                      className={`text-xs mt-1 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                    >
                      Unique Items Available: {availableItems.length} different types
                    </p>
                  )}
                </div>

                {/* Time Out */}
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Clock className="w-4 h-4" /> Time Out
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={`border rounded-lg px-2 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className={`border rounded-lg px-2 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 60 }, (_, i) => {
                        const val = i < 10 ? `0${i}` : `${i}`;
                        return (
                          <option key={i} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={timeAMPM}
                      onChange={(e) => setTimeAMPM(e.target.value)}
                      className={`border rounded-lg px-2 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                      }`}
                    >
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Category */}
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Package className="w-4 h-4" /> Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                    required
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Shipping Mode
                  </label>
                  <input
                    type="text"
                    value={shippingMode}
                    onChange={(e) => setShippingMode(e.target.value)}
                    placeholder="Shopee (J&T)"
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                  />
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}
                  >
                    Display Price: ₱{computedTotalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name"
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    className={`text-sm font-medium mb-2 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
                    }`}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={!canAddParcelOut}
                  className={`bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg ${
                    canAddParcelOut
                      ? "animate__animated animate__pulse animate__infinite animate__slow"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-5 h-5" /> Out Item
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
