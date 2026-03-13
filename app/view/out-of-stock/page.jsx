/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import TopNavbar from "../../components/TopNavbar";
import AuthGuard from "../../components/AuthGuard";
import {
  Box,
  AlertTriangle,
  TrendingDown,
  XCircle,
  Package,
} from "lucide-react";
import Link from "next/link";
import "animate.css";

// Import controllers
import {
  fetchProductInController,
} from "../../controller/productController";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import {
  buildDescription,
  buildProductCode,
  buildSku,
} from "../../utils/inventoryMeta";

export default function Page() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type"); // 'parcel' or 'product'
  const focusParam = searchParams.get("focus");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("product-inventory");
  const [darkMode, setDarkMode] = useState(false);

  // Parcel items
  const [parcelItems, setParcelItems] = useState([]);
  const [filterParcelStatus, setFilterParcelStatus] = useState(
    statusParam && typeParam === "parcel" ? statusParam : "all",
  );

  // Product items
  const [productItems, setProductItems] = useState([]);
  const [filterProductStatus, setFilterProductStatus] = useState(
    statusParam && typeParam === "product" ? statusParam : "all",
  );
  const [focusedSection, setFocusedSection] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportError, setExportError] = useState("");
  const [parcelSearch, setParcelSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);

  const parcelTableRef = useRef(null);
  const productTableRef = useRef(null);

  // Helper to get stock status
  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out";
    if (quantity <= 5) return "critical";
    if (quantity < 10) return "low";
    return "available";
  };

  // Helper to get status label
  const getStatusLabel = (quantity) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity <= 5) return "Critical Level";
    if (quantity < 10) return "Low Stock";
    return "Available";
  };

  // Helper to get status color
  const getStatusColor = (quantity, darkMode) => {
    if (quantity === 0) {
      return darkMode
        ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
        : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]";
    }
    if (quantity <= 5) {
      return darkMode
        ? "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30"
        : "bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]";
    }
    if (quantity < 10) {
      return darkMode
        ? "bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30"
        : "bg-[#FEF9C3] text-[#EAB308] border border-[#FEF08A]";
    }
    return darkMode
      ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
      : "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]";
  };

  // Helper to get status icon
  const getStatusIcon = (quantity) => {
    if (quantity === 0) return <XCircle className="w-4 h-4" />;
    if (quantity <= 5)
      return <AlertTriangle className="w-4 h-4 animate-pulse" />;
    if (quantity < 10) return <TrendingDown className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

  // Helper to get indicator dot color
  const getIndicatorColor = (quantity) => {
    if (quantity === 0) return "bg-[#EF4444]";
    if (quantity <= 5) return "bg-[#F97316]";
    if (quantity < 10) return "bg-[#FACC15]";
    return "bg-[#22C55E]";
  };

  const loadItems = async () => {
    const parcelData = await fetchParcelItems();
    const productData = await fetchProductInController();

    setParcelItems(parcelData || []);
    setProductItems(productData || []);
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");
    loadItems();
  }, []);

  // Update filter when status param changes
  useEffect(() => {
    if (statusParam && typeParam === "parcel") {
      setFilterParcelStatus(statusParam);
      setFilterProductStatus("all");
    } else if (statusParam && typeParam === "product") {
      setFilterProductStatus(statusParam);
      setFilterParcelStatus("all");
    }
  }, [statusParam, typeParam]);

  // Scroll and highlight the relevant inventory section when navigated from dashboard cards
  useEffect(() => {
    const target =
      focusParam === "product-table" || typeParam === "product"
        ? "product"
        : focusParam === "parcel-table" || typeParam === "parcel"
          ? "parcel"
          : null;

    if (!target) return;

    const sectionRef = target === "product" ? productTableRef : parcelTableRef;
    if (!sectionRef.current) return;

    const scrollTimer = setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocusedSection(target);
    }, 120);

    const clearTimer = setTimeout(() => {
      setFocusedSection(null);
    }, 2400);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusParam, typeParam, parcelItems.length, productItems.length]);

  // Filter parcel items based on selected status
  const filteredParcelItems = parcelItems.filter((item) => {
    const statusMatch =
      filterParcelStatus === "all" ||
      getStockStatus(item.quantity) === filterParcelStatus;
    const keyword = parcelSearch.trim().toLowerCase();
    if (!keyword) return statusMatch;
    const code = buildProductCode(item, "CMP").toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.name || "").toLowerCase();
    return statusMatch && (name.includes(keyword) || code.includes(keyword) || sku.includes(keyword));
  });

  // Filter product items based on selected status
  const filteredProductItems = productItems.filter((item) => {
    const statusMatch =
      filterProductStatus === "all" ||
      getStockStatus(item.quantity) === filterProductStatus;
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return statusMatch;
    const code = buildProductCode(item).toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.product_name || "").toLowerCase();
    return statusMatch && (name.includes(keyword) || code.includes(keyword) || sku.includes(keyword));
  });

  // Count parcel items by status
  const parcelStatusCounts = {
    out: parcelItems.filter((item) => item.quantity === 0).length,
    critical: parcelItems.filter(
      (item) => item.quantity > 0 && item.quantity <= 5,
    ).length,
    low: parcelItems.filter((item) => item.quantity > 5 && item.quantity < 10)
      .length,
    available: parcelItems.filter((item) => item.quantity >= 10).length,
  };

  // Count product items by status
  const productStatusCounts = {
    out: productItems.filter((item) => item.quantity === 0).length,
    critical: productItems.filter(
      (item) => item.quantity > 0 && item.quantity <= 5,
    ).length,
    low: productItems.filter((item) => item.quantity > 5 && item.quantity < 10)
      .length,
    available: productItems.filter((item) => item.quantity >= 10).length,
  };

  const exportToPDF = (parcelData = [], productData = []) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    // Parcel Section
    doc.setFontSize(14);
    doc.text("Components Stock Status", 14, 40);

    const parcelTableColumn = [
      "Item Name",
      "Stock Quantity",
      "Status",
      "Date Added",
    ];
    const parcelTableRows = parcelData.map((item) => [
      item.name,
      `${item.quantity} units`,
      getStatusLabel(item.quantity),
      item.date,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [parcelTableColumn],
      body: parcelTableRows,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] }, // Blue
    });

    // Product Section
    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text("Product Inventory Status", 14, finalY + 15);

    const productTableColumn = [
      "Product Name",
      "Stock Quantity",
      "Status",
      "Date Added",
    ];
    const productTableRows = productData.map((item) => [
      item.product_name,
      `${item.quantity} units`,
      getStatusLabel(item.quantity),
      item.date,
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [productTableColumn],
      body: productTableRows,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [124, 58, 237] }, // Purple
    });

    doc.save("inventory-report.pdf");
  };

  const handleExportClick = () => {
    if (!isAdmin) {
      setExportError("Only admin can run export and delete controls.");
      return;
    }
    setExportError("");
    setShowExportModal(true);
  };

  const handleExportPdfOnly = () => {
    const parcelSnapshot = [...parcelItems];
    const productSnapshot = [...productItems];
    exportToPDF(parcelSnapshot, productSnapshot);
    setShowExportModal(false);
  };


    setParcelItems([]);
    setProductItems([]);
    setShowExportModal(false);
    setIsProcessingExport(false);
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />

        {/* Main Content */}
        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "ml-0"
          } pt-16`}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex flex-col items-center text-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Inventory Status
                </h1>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Monitor stock levels for components and products
                </p>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportClick}
                disabled={!isAdmin}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isAdmin
                    ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-xl hover:scale-105 active:scale-95"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                Export as PDF
              </button>
            </div>

            {/* Alert Banner for Critical Items */}
            {(parcelStatusCounts.out > 0 ||
              parcelStatusCounts.critical > 0 ||
              productStatusCounts.out > 0 ||
              productStatusCounts.critical > 0) && (
              <div
                className={`p-4 rounded-xl mb-6 border-l-4 animate__animated animate__fadeInDown ${
                  darkMode
                    ? "bg-[#7f1d1d]/20 border-[#EF4444]"
                    : "bg-[#FEE2E2] border-[#DC2626]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#EF4444] mb-1">
                      Inventory Alert
                    </h3>
                    <p
                      className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {parcelStatusCounts.out > 0 && (
                        <>
                          <strong>Components:</strong> {parcelStatusCounts.out}{" "}
                          item
                          {parcelStatusCounts.out > 1 ? "s" : ""} out of stock
                        </>
                      )}
                      {parcelStatusCounts.out > 0 &&
                        parcelStatusCounts.critical > 0 &&
                        " • "}
                      {parcelStatusCounts.critical > 0 && (
                        <>
                          {parcelStatusCounts.critical} item
                          {parcelStatusCounts.critical > 1 ? "s" : ""} at
                          critical level
                        </>
                      )}
                      {(parcelStatusCounts.out > 0 ||
                        parcelStatusCounts.critical > 0) &&
                        (productStatusCounts.out > 0 ||
                          productStatusCounts.critical > 0) && (
                          <span className="mx-2">|</span>
                        )}
                      {productStatusCounts.out > 0 && (
                        <>
                          <strong>Products:</strong> {productStatusCounts.out}{" "}
                          product{productStatusCounts.out > 1 ? "s" : ""} out of
                          stock
                        </>
                      )}
                      {productStatusCounts.out > 0 &&
                        productStatusCounts.critical > 0 &&
                        " • "}
                      {productStatusCounts.critical > 0 && (
                        <>
                          {productStatusCounts.critical} product
                          {productStatusCounts.critical > 1 ? "s" : ""} at
                          critical level
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============= PARCEL SECTION ============= */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-6 h-6 text-[#1e40af]" />
                <h2 className="text-xl font-bold">Components Stock Status</h2>
              </div>

              {/* Parcel Status Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Out of Stock */}
                <div
                  onClick={() => setFilterParcelStatus("out")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterParcelStatus === "out"
                      ? "ring-2 ring-[#EF4444] shadow-[#EF4444]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FEE2E2]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-5 h-5 text-[#EF4444]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#EF4444]/20" : "bg-[#FEE2E2]"
                      } text-[#EF4444]`}
                    >
                      Critical
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Out of Stock
                  </p>
                  <p className="text-2xl font-bold">{parcelStatusCounts.out}</p>
                </div>

                {/* Critical Level */}
                <div
                  onClick={() => setFilterParcelStatus("critical")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterParcelStatus === "critical"
                      ? "ring-2 ring-[#F97316] shadow-[#F97316]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FFEDD5]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#F97316]/20" : "bg-[#FFEDD5]"
                      } text-[#F97316]`}
                    >
                      Alert
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Critical Level
                  </p>
                  <p className="text-2xl font-bold">
                    {parcelStatusCounts.critical}
                  </p>
                </div>

                {/* Low Stock */}
                <div
                  onClick={() => setFilterParcelStatus("low")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterParcelStatus === "low"
                      ? "ring-2 ring-[#FACC15] shadow-[#FACC15]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FEF9C3]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-[#FACC15]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#FACC15]/20" : "bg-[#FEF9C3]"
                      } text-[#FACC15]`}
                    >
                      Warning
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Low Stock
                  </p>
                  <p className="text-2xl font-bold">{parcelStatusCounts.low}</p>
                </div>

                {/* Available */}
                <div
                  onClick={() => setFilterParcelStatus("available")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterParcelStatus === "available"
                      ? "ring-2 ring-[#22C55E] shadow-[#22C55E]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#DCFCE7]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Box className="w-5 h-5 text-[#22C55E]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#22C55E]/20" : "bg-[#DCFCE7]"
                      } text-[#22C55E]`}
                    >
                      Good
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Available
                  </p>
                  <p className="text-2xl font-bold">
                    {parcelStatusCounts.available}
                  </p>
                </div>
              </div>

              {/* Parcel Filter Dropdown */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Filter Component Less by Status:
                </label>
                <select
                  value={filterParcelStatus}
                  onChange={(e) => setFilterParcelStatus(e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full sm:w-60 focus:outline-none focus:ring-2 transition-all text-sm ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"
                  }`}
                >
                  <option value="all">
                    All Parcels ({parcelItems.length})
                  </option>
                  <option value="available">
                    Available ({parcelStatusCounts.available})
                  </option>
                  <option value="low">
                    Low Stock ({parcelStatusCounts.low})
                  </option>
                  <option value="critical">
                    Critical Level ({parcelStatusCounts.critical})
                  </option>
                  <option value="out">
                    Out of Stock ({parcelStatusCounts.out})
                  </option>
                </select>
                <input
                  type="text"
                  value={parcelSearch}
                  onChange={(e) => setParcelSearch(e.target.value)}
                  placeholder="Search by component name, code, or SKU"
                  className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm self-end ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#60A5FA] focus:border-[#60A5FA] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"
                  }`}
                />
              </div>

              {/* Parcel Items Table */}
              <div
                ref={parcelTableRef}
                className={`rounded-xl shadow-lg overflow-hidden border ${
                  focusedSection === "parcel"
                    ? "ring-2 ring-[#1e40af] ring-offset-2 ring-offset-transparent"
                    : ""
                } ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className={
                        darkMode
                          ? "bg-[#374151] text-gray-300"
                          : "bg-[#1e40af] text-white"
                      }
                    >
                      <tr>
                        {[
                          "Item Name",
                          "Product Code",
                          "SKU",
                          "Description",
                          "Stock Quantity",
                          "Status",
                          "Date Added",
                          "Actions",
                        ].map((head) => (
                          <th
                            key={head}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"
                      }`}
                    >
                      {filteredParcelItems.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Package
                                className={`w-12 h-12 ${
                                  darkMode ? "text-gray-600" : "text-gray-400"
                                }`}
                              />
                              <p
                                className={`text-sm ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                No parcels found
                              </p>
                              <p
                                className={`text-xs ${
                                  darkMode ? "text-gray-500" : "text-gray-500"
                                }`}
                              >
                                Try changing the filter
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredParcelItems.map((item, index) => (
                          <tr
                            key={index}
                            className={`transition-colors ${
                              darkMode
                                ? "hover:bg-[#374151]"
                                : "hover:bg-[#F9FAFB]"
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full ${getIndicatorColor(
                                    item.quantity,
                                  )}`}
                                />
                                <span className="break-words whitespace-normal">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildProductCode(item, "CMP")}
                            </td>
                            <td className="px-4 py-3 text-sm">{buildSku(item)}</td>
                            <td className="px-4 py-3 text-sm">
                              {buildDescription(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  item.quantity,
                                  darkMode,
                                )}`}
                              >
                                {getStatusIcon(item.quantity)}
                                {getStatusLabel(item.quantity)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.date}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity === 0 ? (
                                <Link
                                  href={`/view/parcel-shipped?item=${encodeURIComponent(item.name)}`}
                                >
                                  <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer w-fit">
                                    Add Stock
                                  </div>
                                </Link>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ============= PRODUCT SECTION ============= */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-6 h-6 text-[#7c3aed]" />
                <h2 className="text-xl font-bold">Product Inventory Status</h2>
              </div>

              {/* Product Status Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Out of Stock */}
                <div
                  onClick={() => setFilterProductStatus("out")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterProductStatus === "out"
                      ? "ring-2 ring-[#EF4444] shadow-[#EF4444]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FEE2E2]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-5 h-5 text-[#EF4444]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#EF4444]/20" : "bg-[#FEE2E2]"
                      } text-[#EF4444]`}
                    >
                      Critical
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Out of Stock
                  </p>
                  <p className="text-2xl font-bold">
                    {productStatusCounts.out}
                  </p>
                </div>

                {/* Critical Level */}
                <div
                  onClick={() => setFilterProductStatus("critical")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterProductStatus === "critical"
                      ? "ring-2 ring-[#F97316] shadow-[#F97316]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FFEDD5]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#F97316]/20" : "bg-[#FFEDD5]"
                      } text-[#F97316]`}
                    >
                      Alert
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Critical Level
                  </p>
                  <p className="text-2xl font-bold">
                    {productStatusCounts.critical}
                  </p>
                </div>

                {/* Low Stock */}
                <div
                  onClick={() => setFilterProductStatus("low")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterProductStatus === "low"
                      ? "ring-2 ring-[#FACC15] shadow-[#FACC15]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#FEF9C3]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.7s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-[#FACC15]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#FACC15]/20" : "bg-[#FEF9C3]"
                      } text-[#FACC15]`}
                    >
                      Warning
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Low Stock
                  </p>
                  <p className="text-2xl font-bold">
                    {productStatusCounts.low}
                  </p>
                </div>

                {/* Available */}
                <div
                  onClick={() => setFilterProductStatus("available")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${
                    filterProductStatus === "available"
                      ? "ring-2 ring-[#22C55E] shadow-[#22C55E]/30 shadow-lg scale-[1.03]"
                      : ""
                  } ${
                    darkMode
                      ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]"
                      : "bg-white border-[#E5E7EB] hover:bg-[#DCFCE7]"
                  } animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.8s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Box className="w-5 h-5 text-[#22C55E]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? "bg-[#22C55E]/20" : "bg-[#DCFCE7]"
                      } text-[#22C55E]`}
                    >
                      Good
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Available
                  </p>
                  <p className="text-2xl font-bold">
                    {productStatusCounts.available}
                  </p>
                </div>
              </div>

              {/* Product Filter Dropdown */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Filter Complete Set Less by Status:
                </label>
                <select
                  value={filterProductStatus}
                  onChange={(e) => setFilterProductStatus(e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full sm:w-60 focus:outline-none focus:ring-2 transition-all text-sm ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"
                  }`}
                >
                  <option value="all">
                    All Products ({productItems.length})
                  </option>
                  <option value="available">
                    Available ({productStatusCounts.available})
                  </option>
                  <option value="low">
                    Low Stock ({productStatusCounts.low})
                  </option>
                  <option value="critical">
                    Critical Level ({productStatusCounts.critical})
                  </option>
                  <option value="out">
                    Out of Stock ({productStatusCounts.out})
                  </option>
                </select>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by product name, code, or SKU"
                  className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm self-end ${
                    darkMode
                      ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white"
                      : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"
                  }`}
                />
              </div>

              {/* Product Items Table */}
              <div
                ref={productTableRef}
                className={`rounded-xl shadow-lg overflow-hidden border ${
                  focusedSection === "product"
                    ? "ring-2 ring-[#7c3aed] ring-offset-2 ring-offset-transparent"
                    : ""
                } ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead
                      className={
                        darkMode
                          ? "bg-[#374151] text-gray-300"
                          : "bg-[#7c3aed] text-white"
                      }
                    >
                      <tr>
                        {[
                          "Product Name",
                          "Product Code",
                          "SKU",
                          "Description",
                          "Stock Quantity",
                          "Status",
                          "Date Added",
                          "Actions",
                        ].map((head) => (
                          <th
                            key={head}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"
                      }`}
                    >
                      {filteredProductItems.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Box
                                className={`w-12 h-12 ${
                                  darkMode ? "text-gray-600" : "text-gray-400"
                                }`}
                              />
                              <p
                                className={`text-sm ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                No products found
                              </p>
                              <p
                                className={`text-xs ${
                                  darkMode ? "text-gray-500" : "text-gray-500"
                                }`}
                              >
                                Try changing the filter
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredProductItems.map((item, index) => (
                          <tr
                            key={index}
                            className={`transition-colors ${
                              darkMode
                                ? "hover:bg-[#374151]"
                                : "hover:bg-[#F9FAFB]"
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full ${getIndicatorColor(
                                    item.quantity,
                                  )}`}
                                />
                                <span className="break-words whitespace-normal">
                                  {item.product_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildProductCode(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">{buildSku(item)}</td>
                            <td className="px-4 py-3 text-sm">
                              {buildDescription(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  item.quantity,
                                  darkMode,
                                )}`}
                              >
                                {getStatusIcon(item.quantity)}
                                {getStatusLabel(item.quantity)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.date}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity === 0 ? (
                                <Link href={`/view/product-in?product=${encodeURIComponent(item.product_name)}`}>
                                  <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
                                    Add Stock
                                  </div>
                                </Link>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showExportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !isProcessingExport && setShowExportModal(false)}
            />
            <div
              className={`relative z-10 w-full max-w-md rounded-xl border shadow-2xl p-5 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151] text-white"
                  : "bg-white border-[#E5E7EB] text-black"
              }`}
            >
              <h3 className="text-lg font-semibold mb-2">Export Inventory PDF</h3>
              <p
                className={`text-sm mb-4 ${
                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                Save the current inventory as a PDF file
              </p>

              {exportError && (
                <div
                  className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                    darkMode
                      ? "bg-red-900/20 border-red-800 text-red-300"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {exportError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleExportPdfOnly}
                  disabled={isProcessingExport}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                    isProcessingExport
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-[#1E40AF] hover:bg-[#1D4ED8] text-white"
                  }`}
                >
                  Save PDF Only
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

