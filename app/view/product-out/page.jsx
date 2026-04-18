/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import { logActivity } from "../../utils/logActivity";
import Sidebar from "../../components/Sidebar";
import {
  PackageCheck,
  Plus,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  fetchProductOutController,
  fetchProductInController,
  handleAddProductOut,
  handleAddMultipleProductsOut,
} from "../../controller/productController";
import AuthGuard from "../../components/AuthGuard";
import { buildProductCode, buildSku } from "../../utils/inventoryMeta";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";

export default function ProductOutPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMultipleOutInput, setShowMultipleOutInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(0);
  const [date, setDate] = useState("");
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");
  const [shippingMode, setShippingMode] = useState("");
  const [clientName, setClientName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(
    () => new Set(),
  );
  const [bulkOutItems, setBulkOutItems] = useState([
    { product_name: "", quantity: 1, unitPrice: "" },
  ]);
  const [bulkOutMessage, setBulkOutMessage] = useState("");
  const [bulkOutError, setBulkOutError] = useState("");
  const [isBulkOutSubmitting, setIsBulkOutSubmitting] = useState(false);
  const [showProductOutHistory, setShowProductOutHistory] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { role, displayName, userEmail } = useAuth();
  const isAdmin = isAdminRole(role);

  const DESCRIPTION_TRUNCATE_LIMIT = 120;
  const truncateText = (value, maxLength) => {
    const text = (value || "").toString().trim();
    if (!text) return { text: "", isTruncated: false };
    if (text.length <= maxLength) return { text, isTruncated: false };
    return { text: `${text.slice(0, maxLength).trimEnd()}...`, isTruncated: true };
  };

  const toggleDescriptionExpanded = (id) => {
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const price = parseFloat(unitPrice) || 0;
    const qty = parseInt(quantity) || 0;
    setTotalPrice(price * qty);
  }, [unitPrice, quantity]);
  
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

    const today = new Date().toISOString().split("T")[0];
    setDate(today);

    loadItems();
    loadAvailableProducts();
  }, []);

  const loadItems = async () => {
    const data = await fetchProductOutController();
    const sorted = (Array.isArray(data) ? data : []).sort((a, b) => b.id - a.id);
    setItems(sorted);
  };

  const loadAvailableProducts = async () => {
    const data = await fetchProductInController();
    const grouped = (data || []).reduce((acc, row) => {
      const key = row.product_name;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = {
          product_name: key,
          quantity: 0,
          totalPrice: 0,
        };
      }
      acc[key].quantity += Number(row.quantity || 0);
      acc[key].totalPrice += Number(row.price || 0);
      return acc;
    }, {});

    const aggregated = Object.values(grouped)
      .map((row) => ({
        ...row,
        price: row.totalPrice,
      }))
      .filter((row) => row.quantity > 0)
      .sort((a, b) => a.product_name.localeCompare(b.product_name));

    setAvailableProducts(aggregated);
  };

  const handleProductSelect = (e) => {
    const selectedProductName = e.target.value;
    setProductName(selectedProductName);
    const selectedProduct = availableProducts.find(
      (p) => p.product_name === selectedProductName,
    );
    if (selectedProduct) {
      setMaxQuantity(selectedProduct.quantity);
      setQuantity(1);
      if (selectedProduct.price && selectedProduct.quantity > 0) {
        setUnitPrice((selectedProduct.price / selectedProduct.quantity).toFixed(2));
      } else {
        setUnitPrice("0.00");
      }
    } else {
      setMaxQuantity(0);
      setQuantity(1);
      setUnitPrice("");
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!date) {
      alert("Please select a date");
      return;
    }
    if (!productName) {
      alert("Please select a product");
      return;
    }

    let hour = parseInt(timeHour);
    if (timeAMPM === "PM" && hour !== 12) hour += 12;
    if (timeAMPM === "AM" && hour === 12) hour = 0;
    const formattedTime = `${hour.toString().padStart(2, "0")}:${timeMinute}`;

    const result = await handleAddProductOut(
      productName,
      quantity,
      date,
      formattedTime,
      {
        shipping_mode: shippingMode,
        client_name: clientName,
        price: totalPrice,
      },
    );

    if (result) {
  await logActivity({
    userId: userEmail || null,
    userName: displayName || userEmail || "Unknown User",
    userType: role || "staff",
    action: "Product OUT",
    module: "Inventory",
    details: `Removed ${quantity}x ${productName}`,
  });

  setProductName("");
  setQuantity(1);
  setMaxQuantity(0);

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      setDate(today);

      let currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const ampm = currentHour >= 12 ? "PM" : "AM";
      currentHour = currentHour % 12;
      currentHour = currentHour ? currentHour : 12;
      const formattedMinute =
        currentMinute < 10 ? `0${currentMinute}` : `${currentMinute}`;

      setTimeHour(currentHour.toString());
      setTimeMinute(formattedMinute);
      setTimeAMPM(ampm);
      setShippingMode("");
      setClientName("");
      setUnitPrice("");

      loadItems();
      loadAvailableProducts();
    }
  };

  const addBulkOutRow = () => {
    setBulkOutItems((prev) => [...prev, { product_name: "", quantity: 1, unitPrice: "" }]);
  };

  const removeBulkOutRow = (indexToRemove) => {
    setBulkOutItems((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateBulkOutRow = (indexToUpdate, updates = {}) => {
    setBulkOutItems((prev) =>
      prev.map((row, index) => {
        if (index !== indexToUpdate) return row;
        const nextRow = { ...row, ...updates };

        if (Object.prototype.hasOwnProperty.call(updates, "product_name")) {
          const selected = availableProducts.find(
            (p) => p.product_name === updates.product_name,
          );
          if (selected) {
            const avgUnitPrice =
              selected.price && selected.quantity > 0
                ? (selected.price / selected.quantity).toFixed(2)
                : "0.00";
            nextRow.unitPrice = avgUnitPrice;
            nextRow.quantity = 1;
          } else {
            nextRow.unitPrice = "";
            nextRow.quantity = 1;
          }
        }

        return nextRow;
      }),
    );
  };

  const handleAddMultipleOutItems = async (e) => {
    e.preventDefault();
    setBulkOutMessage("");
    setBulkOutError("");

    if (!date) {
      setBulkOutError("Please select a date");
      return;
    }

    const validRows = bulkOutItems.filter((row) => row?.product_name);
    if (validRows.length === 0) {
      setBulkOutError("Add at least one product row.");
      return;
    }

    const confirmed = window.confirm(
      "Confirm Product OUT: Add multiple products to stock out?",
    );
    if (!confirmed) return;

    let hour = parseInt(timeHour);
    if (timeAMPM === "PM" && hour !== 12) hour += 12;
    if (timeAMPM === "AM" && hour === 12) hour = 0;
    const formattedTime = `${hour.toString().padStart(2, "0")}:${timeMinute}`;

    const payload = [];
    const validationErrors = [];

    validRows.forEach((row, index) => {
      const product_name = row.product_name;
      const qtyValue = Number(row.quantity || 0);
      const selected = availableProducts.find((p) => p.product_name === product_name);
      const max = selected?.quantity || 0;

      if (qtyValue <= 0) {
        validationErrors.push(`Row ${index + 1}: invalid quantity.`);
        return;
      }
      if (max > 0 && qtyValue > max) {
        validationErrors.push(`Row ${index + 1}: quantity exceeds stock.`);
        return;
      }

      const unit = Number(row.unitPrice || 0);
      payload.push({
        product_name,
        quantity: qtyValue,
        date,
        time_out: formattedTime,
        lineMeta: {
          price: unit * qtyValue,
        },
      });
    });

    if (payload.length === 0) {
      setBulkOutError(validationErrors.join(" "));
      return;
    }

    setIsBulkOutSubmitting(true);

    const result = await handleAddMultipleProductsOut(payload, {
      shipping_mode: shippingMode,
      client_name: clientName,
    });

    if (validationErrors.length > 0) {
      setBulkOutError(validationErrors.join(" "));
    }

    if (!result?.success) {
      setBulkOutError(result?.message || "Unable to add multiple products.");
    } else {
      setBulkOutMessage(result?.message || "Multiple products added.");
    }

    if (Array.isArray(result?.errors) && result.errors.length > 0) {
      const first = result.errors[0];
      setBulkOutError(
        `${result.message || "Some products failed."} First error: ${first.product} - ${first.error}`,
      );
    }

    setBulkOutItems([{ product_name: "", quantity: 1, unitPrice: "" }]);
    setIsBulkOutSubmitting(false);
    loadItems();
    loadAvailableProducts();

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "Product OUT (Multiple)",
      module: "Inventory",
      details: payload.map((p) => `${p.quantity}x ${p.product_name}`).join(", "),
    });
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

  const monthFilteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const itemMonth = (item.date || "").slice(0, 7);
      const monthMatch = !selectedMonth || itemMonth === selectedMonth;
      if (!monthMatch) return false;
      if (!keyword) return true;
      return (
        (item.product_name || "").toLowerCase().includes(keyword) ||
        buildProductCode(item).toLowerCase().includes(keyword) ||
        buildSku(item).toLowerCase().includes(keyword) ||
        (item.description || "").toLowerCase().includes(keyword)
      );
    });
  }, [items, selectedMonth, searchTerm]);

  const monthlyCount = monthFilteredItems.length;
  const shippingModeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => (item.shipping_mode || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const printReceipt = (item) => {
    const receiptWindow = window.open("", "_blank", "width=700,height=900");
    if (!receiptWindow) return;
    const amount =
      item.price !== null && item.price !== undefined
        ? Number(item.price).toFixed(2)
        : "0.00";
    const code = buildProductCode(item);
    const sku = buildSku(item);
    receiptWindow.document.write(`
      <html>
        <head><title>Product OUT Receipt</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Product OUT Receipt</h2>
          <p><strong>Product:</strong> ${item.product_name}</p>
          <p><strong>Product Code:</strong> ${code}</p>
          <p><strong>SKU:</strong> ${sku}</p>
          <p><strong>Quantity:</strong> ${item.quantity}</p>
          <p><strong>Date:</strong> ${item.date || "-"}</p>
          <p><strong>Time Out:</strong> ${formatTo12Hour(item.time_out)}</p>
          <p><strong>Shipping:</strong> ${item.shipping_mode || "-"}</p>
          <p><strong>Client:</strong> ${item.client_name || "-"}</p>
          <p><strong>Description:</strong> ${item.description || "-"}</p>
          <p><strong>Total Amount:</strong> ${amount}</p>
          <hr />
          <p style="font-size: 12px;">Generated by Inventory System</p>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = monthFilteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(
    1,
    Math.ceil(monthFilteredItems.length / itemsPerPage),
  );

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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, searchTerm]);

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`flex flex-col w-full h-screen overflow-hidden ${
          darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
        }`}
      >
        {/* Navbar */}
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

        {/* Main */}
        <main
          className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : ""
          } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div
                  className={`flex-1 h-[2px] ${darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"}`}
                ></div>
                <div className="flex items-center gap-2 px-3">
                  <PackageCheck
                    className={`w-6 h-6 ${darkMode ? "text-[#EF4444]" : "text-[#DC2626]"}`}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">
                    Product OUT
                  </h1>
                </div>
                <div
                  className={`flex-1 h-[2px] ${darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"}`}
                ></div>
              </div>
              <p
                className={`text-center text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
              >
                Record items leaving your inventory
              </p>
            </div>

            {/* Form */}
            {!showMultipleOutInput && (
            <form
              onSubmit={handleAddItem}
              className={`p-6 rounded-xl shadow-lg mb-8 border ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center gap-2 mb-6">
                <Plus
                  className={`w-5 h-5 ${darkMode ? "text-[#3B82F6]" : "text-[#1E3A8A]"}`}
                />
                <h2 className="text-lg font-semibold">Add Product OUT</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                {/* Product Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Product Name
                  </label>
                  <select
                    value={productName}
                    onChange={handleProductSelect}
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                    required
                  >
                    <option value="">Select a product</option>
                    {availableProducts.map((product) => (
                      <option key={product.product_name} value={product.product_name}>
                        {product.product_name} (Stock: {product.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Quantity
                    {maxQuantity > 0 && (
                      <span
                        className={`ml-2 text-xs ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                      >
                        (Max: {maxQuantity})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity || 1}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value <= maxQuantity) setQuantity(value);
                    }}
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                    required
                    disabled={!productName}
                  />
                  {productName && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Price: ₱{totalPrice.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                    required
                  />
                </div>

                {/* Time */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Time
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className={`border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className={`border rounded-lg px-2 py-2 w-full focus:outline-none focus:ring-2 ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    >
                      {Array.from({ length: 60 }, (_, i) =>
                        i.toString().padStart(2, "0"),
                      ).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timeAMPM}
                      onChange={(e) => setTimeAMPM(e.target.value)}
                      className={`border rounded-lg px-2 py-2 w-20 focus:outline-none focus:ring-2 ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Shipping Mode
                  </label>
                  <input
                    type="text"
                    value={shippingMode}
                    onChange={(e) => setShippingMode(e.target.value)}
                    placeholder="Shopee (J&T)"
                    list="shipping-mode-options"
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                  <datalist id="shipping-mode-options">
                    {shippingModeOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name"
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}
                  >
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMultipleOutInput(true)}
                  className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 bg-[#38b559] text-white hover:bg-[#42d469] shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Multiple Product OUT
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!productName || availableProducts.length === 0}
                >
                  <Plus className="w-5 h-5" /> Add Product OUT
                </button>
              </div>

              {availableProducts.length === 0 && (
                <div
                  className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-yellow-900/20 border border-yellow-800" : "bg-yellow-50 border border-yellow-200"}`}
                >
                  <p
                    className={`text-sm ${darkMode ? "text-yellow-300" : "text-yellow-800"}`}
                  >
                    ⚠️ No products available in inventory. Please add products
                    first in Product IN.
                  </p>
                </div>
              )}
            </form>
            )}

            {/* Multiple Product OUT */}
            {showMultipleOutInput && (
            <form
              onSubmit={handleAddMultipleOutItems}
              className={`p-6 rounded-xl shadow-lg mb-8 border ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Multiple Product OUT</h2>
                  <p
                    className={`text-xs ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}
                  >
                    Add multiple products in one submission (uses Date/Time and
                    Shipping/Client fields above).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMultipleOutInput(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-[#38b559] text-white hover:bg-[#42d469] shadow-sm hover:shadow-md"
                  >
                    Back to Single Product OUT
                  </button>
                  <button
                    type="button"
                    onClick={addBulkOutRow}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 inline-block mr-1" />
                    Add Row
                  </button>
                </div>
              </div>

              {bulkOutError && (
                <div
                  className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                    darkMode
                      ? "bg-red-900/20 border-red-800 text-red-300"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {bulkOutError}
                </div>
              )}

              {bulkOutMessage && (
                <div
                  className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                    darkMode
                      ? "bg-green-900/20 border-green-800 text-green-300"
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}
                >
                  {bulkOutMessage}
                </div>
              )}

              <div className="space-y-3">
                {bulkOutItems.map((row, index) => {
                  const selected = availableProducts.find(
                    (p) => p.product_name === row.product_name,
                  );
                  const max = selected?.quantity || 0;
                  const unit = Number(row.unitPrice || 0);
                  const qtyValue = Number(row.quantity || 0);
                  const total = unit * qtyValue;

                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-xl border ${
                        darkMode
                          ? "border-[#374151] bg-[#111827]/40"
                          : "border-[#E5E7EB] bg-[#F9FAFB]"
                      }`}
                    >
                      <div className="lg:col-span-5">
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                          }`}
                        >
                          Product
                        </label>
                        <select
                          value={row.product_name}
                          onChange={(e) =>
                            updateBulkOutRow(index, {
                              product_name: e.target.value,
                            })
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        >
                          <option value="">Select a product</option>
                          {availableProducts.map((product) => (
                            <option
                              key={product.product_name}
                              value={product.product_name}
                            >
                              {product.product_name} (Stock: {product.quantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                          }`}
                        >
                          Qty {max > 0 ? `(Max: ${max})` : ""}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={max || 999999}
                          value={row.quantity}
                          onChange={(e) =>
                            updateBulkOutRow(index, {
                              quantity: Number(e.target.value || 1),
                            })
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                          }`}
                        >
                          Unit Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateBulkOutRow(index, { unitPrice: e.target.value })
                          }
                          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                            darkMode
                              ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                              : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          }`}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                          }`}
                        >
                          Total
                        </label>
                        <div
                          className={`px-3 py-2 rounded-lg border text-sm ${
                            darkMode
                              ? "border-[#374151] bg-[#111827] text-white"
                              : "border-[#D1D5DB] bg-white text-black"
                          }`}
                        >
                          {isNaN(total) ? "-" : `₱${total.toFixed(2)}`}
                        </div>
                      </div>

                      <div className="lg:col-span-1 flex items-end justify-end">
                        {bulkOutItems.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeBulkOutRow(index)}
                            className={`p-2 rounded-lg border transition ${
                              darkMode
                                ? "border-[#374151] hover:bg-[#374151]/60 text-[#D1D5DB]"
                                : "border-[#E5E7EB] hover:bg-gray-50 text-[#374151]"
                            }`}
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={isBulkOutSubmitting || availableProducts.length === 0}
                  className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? "bg-[#EF4444] hover:bg-[#DC2626] text-white"
                      : "bg-[#EF4444] hover:bg-[#DC2626] text-white"
                  }`}
                >
                  <Plus className="w-5 h-5" /> Add Multiple Product OUT
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
                  onClick={() => setShowProductOutHistory((prev) => !prev)}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    darkMode
                      ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#1F2937]"
                      : "bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {showProductOutHistory ? "hide" : "show"}
                </button>
              </div>
            )}

            {isAdmin && showProductOutHistory && (
            <div
              className={`rounded-xl border p-4 mb-4 ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Filter Product OUT by Month
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Search (Name / Code / SKU / Description)
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name/code/sku/description"
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                    }`}
                  />
                </div>
                <div className="flex items-end">
                  <p
                    className={`text-sm ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}
                  >
                    Monthly Product OUT Count:{" "}
                    <span className="font-semibold">{monthlyCount}</span>
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Table */}
            {isAdmin && showProductOutHistory && (
            <div
              className={`rounded-xl shadow-xl overflow-hidden border ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151]"
                  : "bg-white border-[#E5E7EB]"
              }`}
            >
              <table className="w-full table-fixed">
                <thead
                  className={
                    darkMode
                      ? "bg-[#111827] text-[#D1D5DB]"
                      : "bg-[#F9FAFB] text-[#374151]"
                  }
                >
                    <tr>
                      {[
                        "Code",
                        "Product",
                        "SKU",
                        "Quantity",
                        "Date",
                        "Time Out",
                      "Shipping",
                      "Client",
                      "Description",
                      "Price",
                      "Receipt",
                    ].map((head) => (
                      <th
                        key={head}
                        className={`p-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                          head === "Description"
                            ? "text-left min-w-[22rem] w-[28rem]"
                            : "text-center"
                        }`}
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
                        colSpan="11"
                        className={`text-center p-8 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                      >
                        <PackageCheck
                          className={`w-12 h-12 mx-auto mb-3 ${darkMode ? "text-[#6B7280]" : "text-[#D1D5DB]"}`}
                        />
                        <p className="text-base font-medium">
                          No products out yet
                        </p>
                        <p className="text-xs opacity-75">
                          Add your first product using the form above
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t ${
                          darkMode
                            ? "border-[#374151] hover:bg-[#374151]/40"
                            : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                        } transition-colors`}
                      >
                        <td className="p-3 text-center align-middle">{buildProductCode(item)}</td>
                        <td className="p-3 text-center align-middle font-medium">{item.product_name}</td>
                        <td className="p-3 text-center align-middle">{buildSku(item)}</td>
                        <td className="p-3 text-center align-middle">
                          <span
                            className={`px-3 py-1 rounded-lg font-bold text-xs ${
                              darkMode
                                ? "bg-[#F87171]/20 text-[#F87171]"
                                : "bg-[#FEE2E2] text-[#B91C1C]"
                            }`}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="p-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 opacity-50" />
                            {item.date}
                          </div>
                        </td>
                        <td className="p-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 opacity-50" />
                            {formatTo12Hour(item.time_out)}
                          </div>
                        </td>
                        <td className="p-3 text-center align-middle">{item.shipping_mode || "-"}</td>
                        <td className="p-3 text-center align-middle">{item.client_name || "-"}</td>
                        <td className="p-3 align-middle text-left min-w-[22rem] w-[28rem]">
                          {(() => {
                            const raw = (item.description || "").toString().trim();
                            if (!raw) {
                              return (
                                <span className={darkMode ? "text-gray-500" : "text-gray-400"}>
                                  -
                                </span>
                              );
                            }

                            const isExpanded = expandedDescriptionIds.has(item.id);
                            const truncated = truncateText(raw, DESCRIPTION_TRUNCATE_LIMIT);
                            const canToggle = isExpanded || truncated.isTruncated;

                            return (
                              <button
                                type="button"
                                className={`w-full text-left leading-snug ${canToggle ? "cursor-pointer" : "cursor-default"}`}
                                onClick={() => {
                                  if (!canToggle) return;
                                  toggleDescriptionExpanded(item.id);
                                }}
                                title={isExpanded ? "Click to collapse" : "Click to expand"}
                              >
                                <span className="whitespace-pre-wrap">
                                  {isExpanded ? raw : truncated.text}
                                </span>
                                {!isExpanded && truncated.isTruncated ? (
                                  <span
                                    className={`ml-2 text-[11px] font-semibold ${
                                      darkMode ? "text-blue-300" : "text-blue-600"
                                    }`}
                                  >
                                    View more
                                  </span>
                                ) : null}
                                {isExpanded && truncated.isTruncated ? (
                                  <span
                                    className={`ml-2 text-[11px] font-semibold ${
                                      darkMode ? "text-blue-300" : "text-blue-600"
                                    }`}
                                  >
                                    View less
                                  </span>
                                ) : null}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center align-middle">
                          {item.price !== null && item.price !== undefined
                            ? Number(item.price).toFixed(2)
                            : "-"}
                        </td>
                        <td className="p-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => printReceipt(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {monthFilteredItems.length > itemsPerPage && (
                <div
                  className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}
                >
                  <div
                    className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                  >
                    Showing {indexOfFirstItem + 1} to{" "}
                    {Math.min(indexOfLastItem, monthFilteredItems.length)} of{" "}
                    {monthFilteredItems.length}{" "}
                    entries
                  </div>

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
                            className={`px-3 py-2 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`px-3 py-2 rounded-lg font-medium transition-all ${
                              currentPage === pageNum
                                ? "bg-red-600 text-white shadow-md"
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
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
