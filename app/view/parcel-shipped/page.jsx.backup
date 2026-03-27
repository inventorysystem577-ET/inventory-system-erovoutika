/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
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
} from "../../utils/parcelShippedHelper";
import AuthGuard from "../../components/AuthGuard";
import { products } from "../../utils/productsData";
import { CATEGORIES, CATEGORY_OPTIONS, getCategoryColor, getCategoryIcon } from "../../utils/categoryUtils";

export default function Page() {
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("item");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES.ELECTRONICS);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const computedTotalPrice = (Number(price) || 0) * (Number(quantity) || 0);

  // Calculate unique items (count of distinct item names)
  const getUniqueItemCount = (itemsList) => {
    const uniqueNames = new Set(itemsList.map(item => item.name).filter(Boolean));
    return uniqueNames.size;
  };

  const uniqueItemCount = getUniqueItemCount(items);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    if (itemParam) {
      setName(itemParam);
    }
  }, [itemParam]);

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

  const loadItems = async () => {
    const data = await fetchParcelItems();
    const sortedData = data
      .map((item) => ({ ...item, quantity: Number(item.quantity || 0) }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
    setItems(sortedData);

    const existingNames = sortedData.map((item) => item.name).filter(Boolean);
    const componentNames = products
      .flatMap((product) => product.components || [])
      .map((component) => component.name)
      .flatMap((name) => (name || "").split(/\s+or\s+/i))
      .map((value) => value.trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...existingNames, ...componentNames])).sort();
    setItemSuggestions(unique);
  };

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
    const confirmed = window.confirm(
      "Confirm Stock In: Are you sure you want to add this item to stock in?",
    );
    if (!confirmed) return;

    const result = await handleAddParcelIn({
      name,
      date,
      quantity,
      timeHour,
      timeMinute,
      timeAMPM,
      shipping_mode: shippingMode,
      client_name: clientName,
      price: computedTotalPrice,
      category: category,
    });
    if (!result || !result.newItem) return;

    setItems(
      result.items
        .map((item) => ({ ...item, quantity: Number(item.quantity || 0) }))
        .filter((item) => item.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity),
    );

    setName("");
    setDate("");
    setQuantity(1);
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    setShippingMode("");
    setClientName("");
    setPrice("");
    setCategory(CATEGORIES.OTHERS);
    alert("Stock In recorded successfully.");
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

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pageNumbers.push(i);
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`flex flex-col w-full h-screen overflow-hidden ${
          darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
        }`}
      >
        {/* Navbar */}
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

        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        {/* Main */}
        <main
          className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : ""
          } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            {/* Header */}
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
                  <h1 className="text-3xl font-bold tracking-wide">Stock In</h1>
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
                Record new items delivered to your inventory
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleAddItem}
              className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151] text-white"
                  : "bg-white border-[#E5E7EB] text-[#111827]"
              }`}
            >
              <div className="flex items-center gap-2 mb-6">
                <Plus
                  className={`w-5 h-5 ${
                    darkMode ? "text-[#3B82F6]" : "text-[#1E3A8A]"
                  }`}
                />
                <h2 className="text-lg font-semibold">Add New Item</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                {/* Item Name */}
                <div>
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Package className="w-4 h-4" /> Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    list="stock-in-suggestions"
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white placeholder-[#6B7280]"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black placeholder-[#9CA3AF]"
                    }`}
                    required
                  />
                  <datalist id="stock-in-suggestions">
                    {itemSuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>

                {/* Date */}
                <div>
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
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    }`}
                    required
                  />
                </div>

                {/* Quantity */}
                <div>
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
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    }`}
                    required
                  />
                </div>

                {/* Time In */}
                <div>
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <Clock className="w-4 h-4" /> Time In
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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
                      className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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
                      className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                      }`}
                    >
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                {/* Category */}
                <div>
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
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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
                <div>
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
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
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
                <div>
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
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
                <div>
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
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" /> Add Item
                </button>
              </div>
            </form>

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
              className={`rounded-xl shadow-xl overflow-hidden border transition animate__animated animate__fadeInUp animate__fast ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] table-fixed">
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
                            className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap"
                          >
                            {head}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"
                    }
                  >
                    {currentItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
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
                          className={`border-t transition animate__animated animate__fadeIn animate__faster ${
                            darkMode
                              ? "border-[#374151] hover:bg-[#374151]/40"
                              : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                          }`}
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <td className="p-3 sm:p-4 font-semibold text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            {item.name}
                          </td>
                          <td className="p-3 sm:p-4 text-center align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                            >
                              <span className="mr-1">{getCategoryIcon(item.category)}</span>
                              {item.category || 'Others'}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            {item.date}
                          </td>
                          <td className="p-3 sm:p-4 text-center align-middle">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                                darkMode
                                  ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                                  : "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]"
                              }`}
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <Clock size={14} />
                              {formatTo12Hour(item.timeIn)}
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            {item.shipping_mode || "-"}
                          </td>
                          <td className="p-3 sm:p-4 text-sm sm:text-base whitespace-nowrap text-center align-middle">
                            {item.client_name || "-"}
                          </td>
                          <td className="p-3 sm:p-4 text-sm sm:text-base whitespace-nowrap text-center align-middle">
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

              {/* Pagination */}
              {items.length > 5 && (
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
                    {Math.min(indexOfLastItem, items.length)} of {items.length}{" "}
                    entries
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
