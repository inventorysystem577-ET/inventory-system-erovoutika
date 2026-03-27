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
  X,
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
  
  const [itemSuggestions, setItemSuggestions] = useState([]);

  useEffect(() => {
    if (itemParam) {
      setParcelRows(prev => prev.map(row => 
        row.id === 1 ? { ...row, name: itemParam } : row
      ));
    }
  }, [itemParam]);

  // Calculate total price for all parcels
  const calculateTotalPrice = () => {
    return parcelRows.reduce((total, row) => {
      const quantity = parseInt(row.quantity) || 0;
      const price = parseFloat(row.price) || 0;
      return total + (price * quantity);
    }, 0);
  };

  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    setTotalPrice(calculateTotalPrice());
  }, [parcelRows]);

  // Calculate unique items (count of distinct item names)
  const getUniqueItemCount = (itemsList) => {
    const uniqueNames = new Set(itemsList.map(item => item.name).filter(Boolean));
    return uniqueNames.size;
  };

  const uniqueItemCount = getUniqueItemCount(items);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

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
    setItems(
      data
        .map((item) => ({ ...item, quantity: Number(item.quantity || 0) }))
        .filter((item) => item.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity),
    );

    const existingNames = data.map((item) => item.name).filter(Boolean);
    const unique = Array.from(new Set(existingNames)).sort();
    setItemSuggestions(unique);
  };

  // Functions to manage parcel rows
  const addParcelRow = () => {
    const newId = Math.max(...parcelRows.map(row => row.id), 0) + 1;
    setParcelRows(prev => [...prev, {
      id: newId,
      name: "",
      quantity: 1,
      price: "",
      category: CATEGORIES.ELECTRONICS,
      shippingMode: "",
      clientName: "",
    }]);
  };

  const removeParcelRow = (idToRemove) => {
    if (parcelRows.length > 1) {
      setParcelRows(prev => prev.filter(row => row.id !== idToRemove));
    }
  };

  const updateParcelRow = (id, field, value) => {
    setParcelRows(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
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

    // Process each parcel
    for (const row of validParcels) {
      const quantityToAdd = parseInt(row.quantity);
      const computedTotalPrice = (parseFloat(row.price) || 0) * quantityToAdd;

      await handleAddParcelIn({
        name: row.name,
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
    
    setDate("");
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    
    alert(`${validParcels.length} Stock In record(s) added successfully.`);
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

  const getClassName = (darkMode, darkClass, lightClass) => {
    return darkMode ? darkClass : lightClass;
  };

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={getClassName(
          darkMode,
          "flex flex-col w-full h-screen overflow-hidden dark bg-[#0B0B0B] text-white",
          "flex flex-col w-full h-screen overflow-hidden bg-[#F9FAFB] text-black"
        )}
      >
        {/* Navbar */}
        <div
          className={getClassName(
            darkMode,
            "fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-sm animate__animated animate__fadeInDown animate__faster bg-[#111827]/90 border-[#374151]",
            "fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-sm animate__animated animate__fadeInDown animate__faster bg-white/90 border-[#E5E7EB]"
          )}
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
          className={getClassName(
            darkMode,
            "flex-1 overflow-y-auto pt-20 transition-all duration-300 bg-[#0B0B0B]",
            "flex-1 overflow-y-auto pt-20 transition-all duration-300 bg-[#F9FAFB]"
          )}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-10 animate__animated animate__fadeInDown animate__faster">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div
                  className={getClassName(
                    darkMode,
                    "flex-1 h-[2px] bg-[#374151]",
                    "flex-1 h-[2px] bg-[#D1D5DB]"
                  )}
                ></div>
                <div className="flex items-center gap-2 px-3">
                  <PackageCheck
                    className={getClassName(
                      darkMode,
                      "w-6 h-6 text-[#3B82F6]",
                      "w-6 h-6 text-[#1E3A8A]"
                    )}
                  />
                  <h1 className="text-3xl font-bold tracking-wide">Stock In</h1>
                </div>
                <div
                  className={getClassName(
                    darkMode,
                    "flex-1 h-[2px] bg-[#374151]",
                    "flex-1 h-[2px] bg-[#D1D5DB]"
                  )}
                ></div>
              </div>
              <p
                className={getClassName(
                  darkMode,
                  "text-center text-sm text-[#9CA3AF]",
                  "text-center text-sm text-[#6B7280]"
                )}
              >
                Record new items delivered to your inventory
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Plus
                    className={getClassName(
                      darkMode,
                      "w-5 h-5 text-[#3B82F6]",
                      "w-5 h-5 text-[#1E3A8A]"
                    )}
                  />
                  <h2 className="text-lg font-semibold">Items to Add</h2>
                </div>
                <button
                  type="button"
                  onClick={addParcelRow}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Item Row
                </button>
              </div>

              {/* Parcel Rows */}
              <div className="space-y-4">
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
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Item Name */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                          )}
                        >
                          <Package className="w-4 h-4" /> Item Name
                        </label>
                        <input
                          type="text"
                          placeholder="Item name"
                          value={row.name}
                          onChange={(e) => updateParcelRow(row.id, 'name', e.target.value)}
                          list="stock-in-suggestions"
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          )}
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                          )}
                        >
                          <Package className="w-4 h-4" /> Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => updateParcelRow(row.id, 'quantity', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          )}
                          required
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                          )}
                        >
                          <Package className="w-4 h-4" /> Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(e) => updateParcelRow(row.id, 'price', e.target.value)}
                          placeholder="0.00"
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          )}
                          required
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                          )}
                        >
                          <Package className="w-4 h-4" /> Category
                        </label>
                        <select
                          value={row.category}
                          onChange={(e) => updateParcelRow(row.id, 'category', e.target.value)}
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Shipping Mode */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 text-[#374151]"
                          )}
                        >
                          Shipping Mode
                        </label>
                        <input
                          type="text"
                          value={row.shippingMode}
                          onChange={(e) => updateParcelRow(row.id, 'shippingMode', e.target.value)}
                          placeholder="Shopee (J&T)"
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          )}
                        />
                      </div>

                      {/* Client Name */}
                      <div>
                        <label
                          className={getClassName(
                            darkMode,
                            "text-sm font-medium mb-2 text-[#D1D5DB]",
                            "text-sm font-medium mb-2 text-[#374151]"
                          )}
                        >
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={row.clientName}
                          onChange={(e) => updateParcelRow(row.id, 'clientName', e.target.value)}
                          placeholder="Client name"
                          className={getClassName(
                            darkMode,
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                            "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Common Date and Time Section */}
              <div className="mb-6">
                <h3 className={getClassName(
                  darkMode,
                  "text-lg font-semibold mb-4 text-white",
                  "text-lg font-semibold mb-4 text-gray-900"
                )}>
                  Date and Time (applies to all items)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label
                      className={getClassName(
                        darkMode,
                        "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                        "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                      )}
                    >
                      <Calendar className="w-4 h-4" /> Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={getClassName(
                        darkMode,
                        "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white min-w-[180px]",
                        "border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black min-w-[180px]"
                      )}
                      required
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label
                      className={getClassName(
                        darkMode,
                        "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#D1D5DB]",
                        "text-sm font-medium mb-2 flex items-center gap-1.5 text-[#374151]"
                      )}
                    >
                      <Clock className="w-4 h-4" /> Time In
                    </label>
                    <div className="flex gap-3">
                      <select
                        value={timeHour}
                        onChange={(e) => setTimeHour(e.target.value)}
                        className={getClassName(
                          darkMode,
                          "border rounded-lg px-3 py-2 flex-1 min-w-[72px] focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                          "border rounded-lg px-3 py-2 flex-1 min-w-[72px] focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                        )}
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
                        className={getClassName(
                          darkMode,
                          "border rounded-lg px-3 py-2 flex-1 min-w-[72px] focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                          "border rounded-lg px-3 py-2 flex-1 min-w-[72px] focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                        )}
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
                        className={getClassName(
                          darkMode,
                          "border rounded-lg px-3 py-2 w-[88px] min-w-[88px] shrink-0 focus:outline-none focus:ring-2 transition-all border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white",
                          "border rounded-lg px-3 py-2 w-[88px] min-w-[88px] shrink-0 focus:outline-none focus:ring-2 transition-all border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                        )}
                      >
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </div>
                </div>
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
                    ₱{totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" /> Add All Items ({parcelRows.filter(row => row.name && row.quantity).length})
                </button>
              </div>
            </form>

            {/* Product Suggestions Datalist */}
            <datalist id="stock-in-suggestions">
              {itemSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>

            {/* Stats */}
            <div
              className={getClassName(
                darkMode,
                "mb-6 flex justify-between p-4 rounded-lg shadow animate__animated animate__fadeInUp animate__fast bg-[#1F2937] text-white border border-[#374151]",
                "mb-6 flex justify-between p-4 rounded-lg shadow animate__animated animate__fadeInUp animate__fast bg-white text-[#111827] border border-[#E5E7EB]"
              )}
            >
              <div className="font-medium">
                Unique Items: <span className="font-bold">{uniqueItemCount}</span>
              </div>
              <div className="font-medium">
                Total Quantity:{" "}
                <span className="font-bold">
                  {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div
              className={getClassName(
                darkMode,
                "rounded-xl shadow-lg overflow-hidden animate__animated animate__fadeInUp animate__fast bg-[#1F2937] border border-[#374151]",
                "rounded-xl shadow-lg overflow-hidden animate__animated animate__fadeInUp animate__fast bg-white border border-[#E5E7EB]"
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className={getClassName(
                      darkMode,
                      "bg-[#374151] text-white",
                      "bg-gray-50 text-gray-900"
                    )}
                  >
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Shipping Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={getClassName(
                      darkMode,
                      "divide-y divide-[#374151] text-white",
                      "divide-y divide-gray-200 text-gray-900"
                    )}
                  >
                    {currentItems.map((item, index) => (
                      <tr
                        key={index}
                        className={getClassName(
                          darkMode,
                          "transition-colors hover:bg-[#374151]/20",
                          "transition-colors hover:bg-gray-50"
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package
                              className={getClassName(
                                darkMode,
                                "w-4 h-4 mr-2 text-[#3B82F6]",
                                "w-4 h-4 mr-2 text-[#1E3A8A]"
                              )}
                            />
                            {item.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={getClassName(
                              darkMode,
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300",
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            )}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatTo12Hour(item.time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.shipping_mode || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.client_name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          ₱{Number(item.price || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className={getClassName(
                    darkMode,
                    "px-6 py-4 border-t border-[#374151] bg-[#1F2937]",
                    "px-6 py-4 border-t border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span
                        className={getClassName(
                          darkMode,
                          "text-gray-400",
                          "text-gray-700"
                        )}
                      >
                        Showing {indexOfFirstItem + 1} to{" "}
                        {Math.min(indexOfLastItem, items.length)} of{" "}
                        {items.length} results
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg border transition-colors ${
                          currentPage === 1
                            ? getClassName(
                                darkMode,
                                "border-gray-700 text-gray-600 cursor-not-allowed",
                                "border-gray-300 text-gray-400 cursor-not-allowed"
                              )
                            : getClassName(
                                darkMode,
                                "border-gray-600 text-gray-300 hover:bg-gray-700",
                                "border-gray-300 text-gray-700 hover:bg-gray-100"
                              )
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex space-x-1">
                        {getPageNumbers().map((pageNum, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              pageNum !== "..." && paginate(pageNum)
                            }
                            disabled={pageNum === "..."}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              pageNum === "..."
                                ? getClassName(
                                    darkMode,
                                    "text-gray-600 cursor-default",
                                    "text-gray-500 cursor-default"
                                  )
                                : pageNum === currentPage
                                ? getClassName(
                                    darkMode,
                                    "bg-blue-600 text-white",
                                    "bg-blue-600 text-white"
                                  )
                                : getClassName(
                                    darkMode,
                                    "text-gray-300 hover:bg-gray-700",
                                    "text-gray-700 hover:bg-gray-100"
                                  )
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg border transition-colors ${
                          currentPage === totalPages
                            ? getClassName(
                                darkMode,
                                "border-gray-700 text-gray-600 cursor-not-allowed",
                                "border-gray-300 text-gray-400 cursor-not-allowed"
                              )
                            : getClassName(
                                darkMode,
                                "border-gray-600 text-gray-300 hover:bg-gray-700",
                                "border-gray-300 text-gray-700 hover:bg-gray-100"
                              )
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
