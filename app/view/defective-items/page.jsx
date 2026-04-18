"use client";
/* eslint-disable react-hooks/rules-of-hooks */

import React, { useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  XCircle,
} from "lucide-react";
import "animate.css";
import {
  getDefectiveItems,
  addDefectiveItem,
  deleteDefectiveItem,
  getDefectiveItemsStats,
} from "../../utils/defectiveItemsHelper";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import { CATEGORIES, CATEGORY_OPTIONS } from "../../utils/categoryUtils";

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Inventory items
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // Defective items records
  const [defectiveRecords, setDefectiveRecords] = useState([]);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState("");
  const [defectiveQuantity, setDefectiveQuantity] = useState(1);
  const [defectiveReason, setDefectiveReason] = useState("");
  const [defectiveDate, setDefectiveDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES.OTHERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search/filter
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination for records
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Stats
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalDefectiveQuantity: 0,
    uniqueItems: 0,
  });

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");

    // Set today's date as default
    setDefectiveDate(new Date().toISOString().split("T")[0]);
    
    loadData();
  }, []);

  const loadData = async () => {
    // Load inventory items
    const invData = await fetchParcelItems();
    const sortedInv = invData
      .map((item) => ({ ...item, quantity: Number(item.quantity || 0) }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
    setInventoryItems(sortedInv);
    
    // Load defective records
    const records = getDefectiveItems();
    setDefectiveRecords(records);
    
    // Update stats
    setStats(getDefectiveItemsStats());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      alert("Please select an item from inventory");
      return;
    }
    
    if (defectiveQuantity < 1) {
      alert("Defective quantity must be at least 1");
      return;
    }
    
    // Find selected inventory item
    const invItem = inventoryItems.find(
      (item) => item.name === selectedItem
    );
    
    if (!invItem) {
      alert("Selected item not found in inventory");
      return;
    }
    
    if (defectiveQuantity > invItem.quantity) {
      alert(`Cannot mark more than available stock (${invItem.quantity} units)`);
      return;
    }
    
    const confirmed = window.confirm(
      `Mark ${defectiveQuantity} unit(s) of "${selectedItem}" as defective?\n\n` +
      `This will deduct from inventory and record as defective.`
    );
    
    if (!confirmed) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await addDefectiveItem({
        itemName: selectedItem,
        quantity: defectiveQuantity,
        reason: defectiveReason,
        date: defectiveDate,
        category: selectedCategory,
      });
      
      if (result.success) {
        alert(
          `Successfully marked ${defectiveQuantity} unit(s) as defective.\n` +
          `Inventory updated: ${result.updatedInventory?.previousQty} → ${result.updatedInventory?.newQty}`
        );
        
        // Reset form
        setSelectedItem("");
        setDefectiveQuantity(1);
        setDefectiveReason("");
        setDefectiveDate(new Date().toISOString().split("T")[0]);
        setSelectedCategory(CATEGORIES.OTHERS);
        
        // Reload data
        await loadData();
      } else {
        alert(result.error || "Failed to add defective item");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while processing the request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    const confirmed = window.confirm(
      "Delete this defective item record?\n\n" +
      "The quantity will be restored to inventory."
    );
    
    if (!confirmed) return;
    
    const result = await deleteDefectiveItem(recordId, true);
    
    if (result.success) {
      alert(result.message || "Record deleted and inventory restored");
      await loadData();
    } else {
      alert(result.error || "Failed to delete record");
    }
  };

  // Filter records by search
  const filteredRecords = defectiveRecords.filter((record) =>
    record.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Get available quantity for selected item
  const getAvailableQty = () => {
    const item = inventoryItems.find((i) => i.name === selectedItem);
    return item ? item.quantity : 0;
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
                  <AlertTriangle
                    className={`w-6 h-6 ${
                      darkMode ? "text-[#EF4444]" : "text-[#DC2626]"
                    }`}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">
                    Defective Items
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
                Mark items as defective and manage defective inventory records
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div
                className={`p-4 rounded-xl shadow-lg border animate__animated animate__fadeInUp ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-[#EF4444]/20" : "bg-red-100"
                    }`}
                  >
                    <XCircle
                      className={`w-6 h-6 ${
                        darkMode ? "text-[#EF4444]" : "text-red-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Total Defective
                    </p>
                    <p className="text-2xl font-bold">{stats.totalDefectiveQuantity}</p>
                  </div>
                </div>
              </div>
              
              <div
                className={`p-4 rounded-xl shadow-lg border animate__animated animate__fadeInUp ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
                style={{ animationDelay: "0.1s" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-[#F97316]/20" : "bg-orange-100"
                    }`}
                  >
                    <Package
                      className={`w-6 h-6 ${
                        darkMode ? "text-[#F97316]" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Unique Items
                    </p>
                    <p className="text-2xl font-bold">{stats.uniqueItems}</p>
                  </div>
                </div>
              </div>
              
              <div
                className={`p-4 rounded-xl shadow-lg border animate__animated animate__fadeInUp ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-[#3B82F6]/20" : "bg-blue-100"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-6 h-6 ${
                        darkMode ? "text-[#3B82F6]" : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Total Records
                    </p>
                    <p className="text-2xl font-bold">{stats.totalRecords}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mark Defective Form */}
            <div
              className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151] text-white"
                  : "bg-white border-[#E5E7EB] text-[#111827]"
              }`}
            >
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    darkMode ? "text-[#EF4444]" : "text-red-600"
                  }`}
                />
                <h2 className="text-lg font-semibold">Mark Item as Defective</h2>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                  {/* Select Item */}
                  <div>
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Select Item *
                    </label>
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-red-500 focus:border-red-500 bg-white text-black"
                      }`}
                      required
                    >
                      <option value="">-- Select an item --</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name} (Stock: {item.quantity})
                        </option>
                      ))}
                    </select>
                    {selectedItem && (
                      <p
                        className={`text-xs mt-1 ${
                          darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                        }`}
                      >
                        Available: {getAvailableQty()} units
                      </p>
                    )}
                  </div>

                  {/* Defective Quantity */}
                  <div>
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <XCircle className="w-4 h-4" /> Defective Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={getAvailableQty()}
                      value={defectiveQuantity}
                      onChange={(e) => setDefectiveQuantity(parseInt(e.target.value) || 1)}
                      className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-red-500 focus:border-red-500 bg-white text-black"
                      }`}
                      required
                    />
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Max: {getAvailableQty()} units
                    </p>
                  </div>

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
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-red-500 focus:border-red-500 bg-white text-black"
                      }`}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label
                      className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      <Calendar className="w-4 h-4" /> Date *
                    </label>
                    <input
                      type="date"
                      value={defectiveDate}
                      onChange={(e) => setDefectiveDate(e.target.value)}
                      className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-red-500 focus:border-red-500 bg-white text-black"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-6">
                  <label
                    className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Reason for Defect
                  </label>
                  <textarea
                    value={defectiveReason}
                    onChange={(e) => setDefectiveReason(e.target.value)}
                    placeholder="Enter reason why item is defective (e.g., damaged, expired, quality issue)"
                    rows={3}
                    className={`border rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all resize-none ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#EF4444] focus:border-[#EF4444] bg-[#111827] text-white placeholder-[#6B7280]"
                        : "border-[#D1D5DB] focus:ring-red-500 focus:border-red-500 bg-white text-black placeholder-[#9CA3AF]"
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedItem}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg ${
                      isSubmitting || !selectedItem
                        ? "bg-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-[#EF4444] hover:bg-red-600 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    {isSubmitting ? "Processing..." : "Mark as Defective"}
                  </button>
                </div>
              </form>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                  }`}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search defective items..."
                  className={`border rounded-lg pl-10 pr-4 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#3B82F6] focus:border-[#3B82F6] bg-[#111827] text-white placeholder-[#6B7280]"
                      : "border-[#D1D5DB] focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-white text-black placeholder-[#9CA3AF]"
                  }`}
                />
              </div>
            </div>

            {/* Defective Records Table */}
            <div
              className={`rounded-xl shadow-xl overflow-hidden border transition animate__animated animate__fadeInUp animate__fast ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead
                    className={`${
                      darkMode
                        ? "bg-[#111827] text-[#D1D5DB]"
                        : "bg-[#F9FAFB] text-[#374151]"
                    }`}
                  >
                    <tr>
                      {[
                        "DATE",
                        "ITEM NAME",
                        "CATEGORY",
                        "QUANTITY",
                        "REASON",
                        "ACTIONS",
                      ].map((head) => (
                        <th
                          key={head}
                          className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      darkMode ? "divide-y divide-[#374151]" : "divide-y divide-[#E5E7EB]"
                    }
                  >
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className={`text-center p-8 sm:p-12 ${
                            darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          } animate__animated animate__fadeIn`}
                        >
                          <Package
                            className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${
                              darkMode ? "text-[#6B7280]" : "text-[#D1D5DB]"
                            }`}
                          />
                          <p className="text-base sm:text-lg font-medium mb-1">
                            No defective items recorded
                          </p>
                          <p className="text-xs sm:text-sm opacity-75">
                            Use the form above to mark items as defective
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((record, index) => (
                        <tr
                          key={record.id}
                          className={`transition animate__animated animate__fadeIn animate__faster ${
                            darkMode
                              ? "hover:bg-[#374151]/40"
                              : "hover:bg-[#F3F4F6]"
                          }`}
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <td className="p-3 sm:p-4 text-sm whitespace-nowrap text-center align-middle">
                            {record.date}
                          </td>
                          <td className="p-3 sm:p-4 font-semibold text-sm whitespace-nowrap text-center align-middle">
                            {record.itemName}
                          </td>
                          <td className="p-3 sm:p-4 text-sm whitespace-nowrap text-center align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                record.category === "Electronics"
                                  ? darkMode
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                  : record.category === "Mechanical"
                                    ? darkMode
                                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                      : "bg-orange-100 text-orange-700 border-orange-200"
                                    : darkMode
                                      ? "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                      : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {record.category || "Others"}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-center align-middle">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                                darkMode
                                  ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {record.quantity}
                            </span>
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-sm text-center align-middle max-w-xs truncate ${
                              darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                            }`}
                          >
                            {record.reason || "-"}
                          </td>
                          <td className="p-3 sm:p-4 text-center align-middle">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className={`p-2 rounded-lg transition-all ${
                                darkMode
                                  ? "hover:bg-[#374151] text-[#9CA3AF] hover:text-[#EF4444]"
                                  : "hover:bg-gray-100 text-gray-500 hover:text-red-600"
                              }`}
                              title="Delete record and restore inventory"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
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
                        )
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
