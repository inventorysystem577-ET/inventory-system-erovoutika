/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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
  FileText,
  FileSpreadsheet,
  FileJson,
  FileDown,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import "animate.css";

// Import controllers
import {
  fetchProductInController,
  clearProductInInventory,
  clearProductOutHistory,
} from "../../controller/productController";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import { fetchParcelOutItems } from "../../utils/parcelOutHelper";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import { saveAdminUndoAction } from "../../utils/adminUndo";
import {
  buildDescription,
  buildProductCode,
  buildSku,
} from "../../utils/inventoryMeta";
import {
  CATEGORIES,
  CATEGORY_OPTIONS,
  getCategoryColor,
  getCategoryIcon,
} from "../../utils/categoryUtils";

export default function Page() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type");
  const focusParam = searchParams.get("focus");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("product-inventory");
  const [darkMode, setDarkMode] = useState(false);

  const [parcelItems, setParcelItems] = useState([]);
  const [filterParcelStatus, setFilterParcelStatus] = useState(
    statusParam && typeParam === "parcel" ? statusParam : "all",
  );

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
  const [parcelCategoryFilter, setParcelCategoryFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);

  const parcelTableRef = useRef(null);
  const productTableRef = useRef(null);

  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out";
    if (quantity <= 5) return "critical";
    if (quantity < 10) return "low";
    return "available";
  };

  const getStatusLabel = (quantity) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity <= 5) return "Critical Level";
    if (quantity < 10) return "Low Stock";
    return "Available";
  };

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

  const getStatusIcon = (quantity) => {
    if (quantity === 0) return <XCircle className="w-4 h-4" />;
    if (quantity <= 5)
      return <AlertTriangle className="w-4 h-4 animate-pulse" />;
    if (quantity < 10) return <TrendingDown className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

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

  useEffect(() => {
    if (statusParam && typeParam === "parcel") {
      setFilterParcelStatus(statusParam);
      setFilterProductStatus("all");
    } else if (statusParam && typeParam === "product") {
      setFilterProductStatus(statusParam);
      setFilterParcelStatus("all");
    }
  }, [statusParam, typeParam]);

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
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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

  const filteredParcelItems = parcelItems.filter((item) => {
    const statusMatch =
      filterParcelStatus === "all" ||
      getStockStatus(item.quantity) === filterParcelStatus;
    const categoryMatch =
      parcelCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        parcelCategoryFilter.toLowerCase();
    const keyword = parcelSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const code = buildProductCode(item, "CMP").toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        code.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const filteredProductItems = productItems.filter((item) => {
    const statusMatch =
      filterProductStatus === "all" ||
      getStockStatus(item.quantity) === filterProductStatus;
    const categoryMatch =
      productCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        productCategoryFilter.toLowerCase();
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const code = buildProductCode(item).toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.product_name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        code.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const parcelStatusCounts = {
    out: parcelItems.filter((item) => item.quantity === 0).length,
    critical: parcelItems.filter(
      (item) => item.quantity > 0 && item.quantity <= 5,
    ).length,
    low: parcelItems.filter((item) => item.quantity > 5 && item.quantity < 10)
      .length,
    available: parcelItems.filter((item) => item.quantity >= 10).length,
  };

  const productStatusCounts = {
    out: productItems.filter((item) => item.quantity === 0).length,
    critical: productItems.filter(
      (item) => item.quantity > 0 && item.quantity <= 5,
    ).length,
    low: productItems.filter((item) => item.quantity > 5 && item.quantity < 10)
      .length,
    available: productItems.filter((item) => item.quantity >= 10).length,
  };

  // ===================== EXPORT FUNCTIONS =====================

  const exportToPDF = (parcelData = [], productData = []) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    doc.setFontSize(14);
    doc.text("Components Stock Status", 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [["Item Name", "Stock Quantity", "Status", "Date Added"]],
      body: parcelData.map((item) => [
        item.name,
        `${item.quantity} units`,
        getStatusLabel(item.quantity),
        item.date,
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text("Product Inventory Status", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Product Name", "Stock Quantity", "Status", "Date Added"]],
      body: productData.map((item) => [
        item.product_name,
        `${item.quantity} units`,
        getStatusLabel(item.quantity),
        item.date,
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save("inventory-report.pdf");
  };

  const exportToExcel = (parcelData = [], productData = []) => {
    const wb = XLSX.utils.book_new();

    const parcelRows = parcelData.map((item) => ({
      "Item Name": item.name,
      "Stock Quantity": item.quantity,
      Status: getStatusLabel(item.quantity),
      "Date Added": item.date,
    }));
    const parcelSheet = XLSX.utils.json_to_sheet(parcelRows);
    XLSX.utils.book_append_sheet(wb, parcelSheet, "Components Stock");

    const productRows = productData.map((item) => ({
      "Product Name": item.product_name,
      "Stock Quantity": item.quantity,
      Status: getStatusLabel(item.quantity),
      "Date Added": item.date,
    }));
    const productSheet = XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb, productSheet, "Product Inventory");

    XLSX.writeFile(wb, "inventory-report.xlsx");
  };

  const exportToCSV = (parcelData = [], productData = []) => {
    const parcelRows = parcelData.map(
      (item) =>
        `"${item.name}","${item.quantity}","${getStatusLabel(item.quantity)}","${item.date}"`,
    );
    const productRows = productData.map(
      (item) =>
        `"${item.product_name}","${item.quantity}","${getStatusLabel(item.quantity)}","${item.date}"`,
    );

    const csv = [
      "COMPONENTS STOCK STATUS",
      "Item Name,Stock Quantity,Status,Date Added",
      ...parcelRows,
      "",
      "PRODUCT INVENTORY STATUS",
      "Product Name,Stock Quantity,Status,Date Added",
      ...productRows,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (parcelData = [], productData = []) => {
    const data = {
      generated: new Date().toLocaleString(),
      components_stock: parcelData.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        status: getStatusLabel(item.quantity),
        date: item.date,
      })),
      product_inventory: productData.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        status: getStatusLabel(item.quantity),
        date: item.date,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToWord = (parcelData = [], productData = []) => {
    const parcelRows = parcelData
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.quantity} units</td><td>${getStatusLabel(item.quantity)}</td><td>${item.date}</td></tr>`,
      )
      .join("");

    const productRows = productData
      .map(
        (item) =>
          `<tr><td>${item.product_name}</td><td>${item.quantity} units</td><td>${getStatusLabel(item.quantity)}</td><td>${item.date}</td></tr>`,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>Inventory Report</title>
      <style>
        body { font-family: Calibri, sans-serif; }
        h1 { color: #1e40af; }
        h2 { color: #374151; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th { background-color: #1e40af; color: white; padding: 8px; text-align: left; }
        td { border: 1px solid #d1d5db; padding: 8px; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .generated { color: #6b7280; font-size: 12px; }
      </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
        <p class="generated">Generated: ${new Date().toLocaleString()}</p>
        <h2>Components Stock Status</h2>
        <table>
          <thead><tr><th>Item Name</th><th>Stock Quantity</th><th>Status</th><th>Date Added</th></tr></thead>
          <tbody>${parcelRows}</tbody>
        </table>
        <h2>Product Inventory Status</h2>
        <table>
          <thead><tr><th>Product Name</th><th>Stock Quantity</th><th>Status</th><th>Date Added</th></tr></thead>
          <tbody>${productRows}</tbody>
        </table>
      </body></html>
    `;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===================== HANDLERS =====================

  const handleExportClick = () => {
    if (!isAdmin) {
      setExportError("Only admin can run export and delete controls.");
      return;
    }
    setExportError("");
    setShowExportModal(true);
  };

  const handleExport = (format) => {
    const parcelSnapshot = [...parcelItems];
    const productSnapshot = [...productItems];

    switch (format) {
      case "pdf":
        exportToPDF(parcelSnapshot, productSnapshot);
        break;
      case "excel":
        exportToExcel(parcelSnapshot, productSnapshot);
        break;
      case "csv":
        exportToCSV(parcelSnapshot, productSnapshot);
        break;
      case "json":
        exportToJSON(parcelSnapshot, productSnapshot);
        break;
      case "word":
        exportToWord(parcelSnapshot, productSnapshot);
        break;
    }
    setShowExportModal(false);
  };

  const exportOptions = [
    {
      format: "pdf",
      label: "PDF Document",
      description: "Formatted report with tables",
      icon: <FileText className="w-5 h-5" />,
      color: "text-red-500",
      bg: darkMode ? "hover:bg-red-500/10" : "hover:bg-red-50",
      border: "hover:border-red-300",
    },
    {
      format: "excel",
      label: "Excel Spreadsheet",
      description: "Two sheets: Components & Products",
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: "text-green-500",
      bg: darkMode ? "hover:bg-green-500/10" : "hover:bg-green-50",
      border: "hover:border-green-300",
    },
    {
      format: "csv",
      label: "CSV File",
      description: "Comma-separated values",
      icon: <FileDown className="w-5 h-5" />,
      color: "text-blue-500",
      bg: darkMode ? "hover:bg-blue-500/10" : "hover:bg-blue-50",
      border: "hover:border-blue-300",
    },
    {
      format: "json",
      label: "JSON File",
      description: "Raw structured data",
      icon: <FileJson className="w-5 h-5" />,
      color: "text-yellow-500",
      bg: darkMode ? "hover:bg-yellow-500/10" : "hover:bg-yellow-50",
      border: "hover:border-yellow-300",
    },
    {
      format: "word",
      label: "Word Document",
      description: "Formatted .doc file",
      icon: <FileText className="w-5 h-5" />,
      color: "text-indigo-500",
      bg: darkMode ? "hover:bg-indigo-500/10" : "hover:bg-indigo-50",
      border: "hover:border-indigo-300",
    },
  ];

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />

        <div
          className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "ml-0"} pt-16`}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex flex-col items-center text-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Inventory Status
                </h1>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Monitor stock levels for components and products
                </p>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportClick}
                disabled={!isAdmin}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isAdmin
                    ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-xl hover:scale-105 active:scale-95"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                <FileDown className="w-4 h-4" />
                Export Inventory
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Alert Banner */}
            {(parcelStatusCounts.out > 0 ||
              parcelStatusCounts.critical > 0 ||
              productStatusCounts.out > 0 ||
              productStatusCounts.critical > 0) && (
              <div
                className={`p-4 rounded-xl mb-6 border-l-4 animate__animated animate__fadeInDown ${darkMode ? "bg-[#7f1d1d]/20 border-[#EF4444]" : "bg-[#FEE2E2] border-[#DC2626]"}`}
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
                          item{parcelStatusCounts.out > 1 ? "s" : ""} out of
                          stock
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                  onClick={() => setFilterParcelStatus("out")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterParcelStatus === "out" ? "ring-2 ring-[#EF4444] shadow-[#EF4444]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FEE2E2]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-5 h-5 text-[#EF4444]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#EF4444]/20" : "bg-[#FEE2E2]"} text-[#EF4444]`}
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
                <div
                  onClick={() => setFilterParcelStatus("critical")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterParcelStatus === "critical" ? "ring-2 ring-[#F97316] shadow-[#F97316]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FFEDD5]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#F97316]/20" : "bg-[#FFEDD5]"} text-[#F97316]`}
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
                <div
                  onClick={() => setFilterParcelStatus("low")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterParcelStatus === "low" ? "ring-2 ring-[#FACC15] shadow-[#FACC15]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FEF9C3]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-[#FACC15]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#FACC15]/20" : "bg-[#FEF9C3]"} text-[#FACC15]`}
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
                <div
                  onClick={() => setFilterParcelStatus("available")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterParcelStatus === "available" ? "ring-2 ring-[#22C55E] shadow-[#22C55E]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#DCFCE7]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Box className="w-5 h-5 text-[#22C55E]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#22C55E]/20" : "bg-[#DCFCE7]"} text-[#22C55E]`}
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

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Filter by Status:
                  </label>
                  <select
                    value={filterParcelStatus}
                    onChange={(e) => setFilterParcelStatus(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"}`}
                  >
                    <option value="all">
                      All Status ({parcelItems.length})
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
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Filter by Category:
                  </label>
                  <select
                    value={parcelCategoryFilter}
                    onChange={(e) => setParcelCategoryFilter(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"}`}
                  >
                    <option value="all">All Categories</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Search:
                  </label>
                  <input
                    type="text"
                    value={parcelSearch}
                    onChange={(e) => setParcelSearch(e.target.value)}
                    placeholder="Search by name, code, or SKU"
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#60A5FA] focus:border-[#60A5FA] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"}`}
                  />
                </div>
              </div>

              <div
                ref={parcelTableRef}
                className={`rounded-xl shadow-lg overflow-hidden border ${focusedSection === "parcel" ? "ring-2 ring-[#1e40af] ring-offset-2 ring-offset-transparent" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"}`}
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
                          "Category",
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
                      className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}
                    >
                      {filteredParcelItems.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Package
                                className={`w-12 h-12 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
                              />
                              <p
                                className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                              >
                                No parcels found
                              </p>
                              <p
                                className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}
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
                            className={`transition-colors ${darkMode ? "hover:bg-[#374151]" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full ${getIndicatorColor(item.quantity)}`}
                                />
                                <span className="break-words whitespace-normal">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildProductCode(item, "CMP")}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildSku(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildDescription(item) || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                              >
                                <span>{getCategoryIcon(item.category)}</span>
                                {item.category || "Uncategorized"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.quantity, darkMode)}`}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                  onClick={() => setFilterProductStatus("out")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterProductStatus === "out" ? "ring-2 ring-[#EF4444] shadow-[#EF4444]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FEE2E2]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-5 h-5 text-[#EF4444]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#EF4444]/20" : "bg-[#FEE2E2]"} text-[#EF4444]`}
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
                <div
                  onClick={() => setFilterProductStatus("critical")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterProductStatus === "critical" ? "ring-2 ring-[#F97316] shadow-[#F97316]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FFEDD5]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#F97316]/20" : "bg-[#FFEDD5]"} text-[#F97316]`}
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
                <div
                  onClick={() => setFilterProductStatus("low")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterProductStatus === "low" ? "ring-2 ring-[#FACC15] shadow-[#FACC15]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#FEF9C3]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.7s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-[#FACC15]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#FACC15]/20" : "bg-[#FEF9C3]"} text-[#FACC15]`}
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
                <div
                  onClick={() => setFilterProductStatus("available")}
                  className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${filterProductStatus === "available" ? "ring-2 ring-[#22C55E] shadow-[#22C55E]/30 shadow-lg scale-[1.03]" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : "bg-white border-[#E5E7EB] hover:bg-[#DCFCE7]"} animate__animated animate__fadeInUp`}
                  style={{ animationDelay: "0.8s" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Box className="w-5 h-5 text-[#22C55E]" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-[#22C55E]/20" : "bg-[#DCFCE7]"} text-[#22C55E]`}
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

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Filter by Status:
                  </label>
                  <select
                    value={filterProductStatus}
                    onChange={(e) => setFilterProductStatus(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"}`}
                  >
                    <option value="all">
                      All Status ({productItems.length})
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
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Filter by Category:
                  </label>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"}`}
                  >
                    <option value="all">All Categories</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Search:
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, code, or SKU"
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"}`}
                  />
                </div>
              </div>

              <div
                ref={productTableRef}
                className={`rounded-xl shadow-lg overflow-hidden border ${focusedSection === "product" ? "ring-2 ring-[#7c3aed] ring-offset-2 ring-offset-transparent" : ""} ${darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"}`}
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
                          "Category",
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
                      className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}
                    >
                      {filteredProductItems.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Box
                                className={`w-12 h-12 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
                              />
                              <p
                                className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                              >
                                No products found
                              </p>
                              <p
                                className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}
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
                            className={`transition-colors ${darkMode ? "hover:bg-[#374151]" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full ${getIndicatorColor(item.quantity)}`}
                                />
                                <span className="break-words whitespace-normal">
                                  {item.product_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildProductCode(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildSku(item)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildDescription(item) || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                              >
                                <span>{getCategoryIcon(item.category)}</span>
                                {item.category || "Uncategorized"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.quantity, darkMode)}`}
                              >
                                {getStatusIcon(item.quantity)}
                                {getStatusLabel(item.quantity)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.date}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.quantity === 0 ? (
                                <Link
                                  href={`/view/product-in?product=${encodeURIComponent(item.product_name)}`}
                                >
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

        {/* ============= EXPORT MODAL ============= */}
        {showExportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowExportModal(false)}
            />
            <div
              className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl p-6 ${darkMode ? "bg-[#1F2937] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-black"}`}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#7c3aed]/10">
                  <FileDown className="w-5 h-5 text-[#7c3aed]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Export Inventory</h3>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Choose your preferred format
                  </p>
                </div>
              </div>

              <div
                className={`h-px my-4 ${darkMode ? "bg-[#374151]" : "bg-[#E5E7EB]"}`}
              />

              {/* Export Options */}
              <div className="space-y-2">
                {exportOptions.map((option) => (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 text-left group ${darkMode ? `border-[#374151] ${option.bg}` : `border-[#E5E7EB] ${option.bg} ${option.border}`}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${darkMode ? "bg-[#374151]" : "bg-gray-100"} group-hover:scale-110 transition-transform ${option.color}`}
                    >
                      {option.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p
                        className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {option.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 ml-auto -rotate-90 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                    />
                  </button>
                ))}
              </div>

              {exportError && (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 text-sm ${darkMode ? "bg-red-900/20 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
                >
                  {exportError}
                </div>
              )}

              <button
                onClick={() => setShowExportModal(false)}
                className={`mt-4 w-full py-2 rounded-xl text-sm font-medium transition ${darkMode ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
