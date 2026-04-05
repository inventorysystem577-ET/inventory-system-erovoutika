"use client";

import React, { useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import Sidebar from "../../components/Sidebar";
import {
  ArrowRightLeft,
  Plus,
  Calendar,
  Package,
  User,
  FileText,
  MessageSquare,
  Check,
  X,
  Edit2,
  Save,
  AlertTriangle,
  Search,
} from "lucide-react";
import "animate.css";
import AuthGuard from "../../components/AuthGuard";
import { showErrorAlert, showSuccessAlert } from "../../utils/errorHandler";
import { fetchProductInController } from "../../controller/productController";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";

export default function StockTransferPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stock-transfer");
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [itemName, setItemName] = useState("");
  const [totalQty, setTotalQty] = useState(1);
  const [description, setDescription] = useState("");
  const [dateOfRelease, setDateOfRelease] = useState("");
  const [dateOfReturned, setDateOfReturned] = useState("");
  const [receiver, setReceiver] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [action, setAction] = useState("transferred"); // transferred or returned

  // Inventory state
  const [availableItems, setAvailableItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Table data
  const [transfers, setTransfers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingRemarks, setEditingRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Inventory management
  const [inventoryQuantities, setInventoryQuantities] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");
    
    // Set today's date as default for date of release
    const today = new Date().toISOString().split('T')[0];
    setDateOfRelease(today);
    
    loadTransfers();
    loadInventoryItems();
  }, [inventoryQuantities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchOpen && !event.target.closest('.inventory-search-container')) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  const loadInventoryItems = async () => {
    try {
      const [productData, parcelData] = await Promise.all([
        fetchProductInController(),
        fetchParcelItems()
      ]);
      
      // Debug: Log the raw data
      console.log('Product data:', productData);
      console.log('Parcel data:', parcelData);
      
      // Combine and format inventory items
      const allItems = [
        ...(productData || []).map(item => ({
          ...item,
          type: 'product',
          availableQuantity: parseInt(item.quantity) || 0,
          name: item.product_name || item.name
        })),
        ...(parcelData || []).map(item => ({
          ...item,
          type: 'parcel',
          availableQuantity: parseInt(item.quantity) || 0,
          name: item.name || item.item_name
        }))
      ].filter(item => item.availableQuantity > 0); // Only show items with available quantity
      
      console.log('All items before filter:', allItems);
      console.log('Items after filter:', allItems.filter(item => item.availableQuantity > 0));
      
      setAvailableItems(allItems);
      setFilteredItems(allItems);
      
      // Initialize inventory quantities
      const initialQuantities = {};
      allItems.forEach(item => {
        const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
        initialQuantities[`${item.type}_${sanitizedName}`] = item.availableQuantity;
      });
      console.log('Initial inventory quantities:', initialQuantities);
      setInventoryQuantities(initialQuantities);
    } catch (error) {
      console.error("Failed to load inventory items:", error);
      showErrorAlert("Failed to load inventory items");
    }
  };

  useEffect(() => {
    // Filter items based on search term
    const filtered = availableItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredItems(filtered);
  }, [searchTerm, availableItems]);

  const handleItemSelect = (item) => {
    setSelectedInventoryItem(item);
    setItemName(item.name);
    setDescription(item.description || "");
    setSearchOpen(false);
    setSearchTerm("");
    const sanitizedName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const currentQty = inventoryQuantities[`${item.type}_${sanitizedName}`] || item.availableQuantity;
    setTotalQty(Math.min(currentQty, item.availableQuantity)); // Don't exceed available quantity
  };

  const handleQuantityChange = (value) => {
    const qty = Math.max(1, parseInt(value) || 1);
    if (selectedInventoryItem) {
      const sanitizedName = selectedInventoryItem.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const currentQty = inventoryQuantities[`${selectedInventoryItem.type}_${sanitizedName}`] || selectedInventoryItem.availableQuantity;
      if (qty > currentQty) {
        showErrorAlert(`Only ${currentQty} items available`);
        return;
      }
    }
    setTotalQty(qty);
  };

  const loadTransfers = async () => {
    // Load from API - currently empty until API is implemented
    setTransfers([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!itemName || !totalQty || !dateOfRelease || !receiver || !purpose) {
      showErrorAlert("Please fill in all required fields");
      return;
    }

    if (action === "returned" && !dateOfReturned) {
      showErrorAlert("Date of returned is required for returned items");
      return;
    }

    setIsLoading(true);

    try {
      const newTransfer = {
        id: Date.now(),
        itemName,
        totalQty: parseInt(totalQty),
        description,
        dateOfRelease,
        dateOfReturned: action === "returned" ? dateOfReturned : "",
        receiver,
        purpose,
        remarks,
        action,
        itemType: selectedInventoryItem?.type || 'product'
      };

      // Check inventory availability
      const sanitizedName = (selectedInventoryItem?.name || itemName).replace(/[^a-zA-Z0-9_]/g, '_');
      const itemKey = `${selectedInventoryItem?.type || 'product'}_${sanitizedName}`;
      const currentQuantity = inventoryQuantities[itemKey] || selectedInventoryItem?.availableQuantity || 0;
      
      console.log('Inventory check:', {
        itemKey,
        currentQuantity,
        inventoryQuantities,
        selectedInventoryItem,
        itemName,
        totalQty
      });
      
      if (action === "transferred" && currentQuantity < parseInt(totalQty)) {
        showErrorAlert(`Insufficient inventory. Only ${currentQuantity} ${selectedInventoryItem?.name || itemName} available.`);
        setIsLoading(false);
        return;
      }

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTransfers(prev => [newTransfer, ...prev]);
      
      // Update inventory quantities
      if (action === "transferred") {
        const sanitizedName = (selectedInventoryItem?.name || itemName).replace(/[^a-zA-Z0-9_]/g, '_');
        const itemKey = `${selectedInventoryItem?.type || 'product'}_${sanitizedName}`;
        const newQuantity = currentQuantity - parseInt(totalQty);
        setInventoryQuantities(prev => ({
          ...prev,
          [itemKey]: newQuantity
        }));
        showSuccessAlert(`Deducted ${totalQty} ${selectedInventoryItem?.name || itemName} from inventory`);
      }
      
      // Reset form
      setItemName("");
      setTotalQty(1);
      setDescription("");
      setDateOfRelease(new Date().toISOString().split('T')[0]);
      setDateOfReturned("");
      setReceiver("");
      setPurpose("");
      setRemarks("");
      setAction("transferred");
      
      showSuccessAlert("Stock transfer recorded successfully!");
    } catch (error) {
      showErrorAlert("Failed to record stock transfer");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingRemarks = (transfer) => {
    setEditingId(transfer.id);
    setEditingRemarks(transfer.remarks);
  };

  const saveRemarks = async (id) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTransfers(prev => prev.map(transfer => 
        transfer.id === id ? { ...transfer, remarks: editingRemarks } : transfer
      ));
      
      setEditingId(null);
      setEditingRemarks("");
      showSuccessAlert("Remarks updated successfully!");
    } catch (error) {
      showErrorAlert("Failed to update remarks");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingRemarks("");
  };

  const toggleAction = async (transfer) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Toggle action status
      const newAction = transfer.action === "transferred" ? "returned" : "transferred";
      const updatedTransfer = {
        ...transfer,
        action: newAction,
        // Clear dateOfReturned if switching to transferred
        dateOfReturned: newAction === "transferred" ? "" : (transfer.dateOfReturned || new Date().toISOString().split('T')[0])
      };
      
      // Update inventory quantities
      const itemKey = `${transfer.itemType}_${transfer.itemName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const currentQuantity = inventoryQuantities[itemKey] || 0;
      
      if (transfer.action === "transferred" && newAction === "returned") {
        // Returning: Add quantity back to inventory
        const newQuantity = currentQuantity + transfer.totalQty;
        setInventoryQuantities(prev => ({
          ...prev,
          [itemKey]: newQuantity
        }));
        showSuccessAlert(`Added ${transfer.totalQty} ${transfer.itemName} back to inventory`);
      } else if (transfer.action === "returned" && newAction === "transferred") {
        // Transferring again: Deduct quantity from inventory
        const newQuantity = currentQuantity - transfer.totalQty;
        if (newQuantity >= 0) {
          setInventoryQuantities(prev => ({
            ...prev,
            [itemKey]: newQuantity
          }));
          showSuccessAlert(`Deducted ${transfer.totalQty} ${transfer.itemName} from inventory`);
        } else {
          showErrorAlert('Insufficient inventory quantity for this transfer');
          return;
        }
      }
      
      // Update the transfer in the array
      setTransfers(prevTransfers => 
        prevTransfers.map(t => t.id === transfer.id ? updatedTransfer : t)
      );
      
      showSuccessAlert(`Action changed to ${newAction}`);
    } catch (error) {
      console.error('Error toggling action:', error);
      showErrorAlert('Failed to update action');
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = transfers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(transfers.length / itemsPerPage);

  return (
    <AuthGuard darkMode={darkMode}>
      <div className={`flex flex-col w-full h-screen overflow-hidden ${
        darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
      }`}>
        {/* Navbar */}
        <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-sm animate__animated animate__fadeInDown animate__faster ${
          darkMode ? "bg-[#111827]/90 border-[#374151]" : "bg-white/90 border-[#E5E7EB]"
        }`}>
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : ""
        } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}>
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-10 animate__animated animate__fadeInDown animate__faster">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className={`flex-1 h-[2px] ${darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"}`}></div>
                <div className="flex items-center gap-2 px-3">
                  <ArrowRightLeft className={`w-6 h-6 ${darkMode ? "text-[#3B82F6]" : "text-[#1E3A8A]"}`} />
                  <h1 className="text-3xl font-bold tracking-wide">Stock Transfer</h1>
                </div>
                <div className={`flex-1 h-[2px] ${darkMode ? "bg-[#374151]" : "bg-[#D1D5DB]"}`}></div>
              </div>
              <p className={`text-center text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                Manage stock transfers and returns
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
              darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
            }`}>
              {/* Transfer Details */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
                  Transfer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Date of release */}
                  <div>
                    <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}>
                      <Calendar className="w-4 h-4" /> Date of release *
                    </label>
                    <input
                      type="date"
                      value={dateOfRelease}
                      onChange={(e) => setDateOfRelease(e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  {/* Date of returned */}
                  {action === "returned" && (
                    <div>
                      <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}>
                        <Calendar className="w-4 h-4" /> Date of returned *
                      </label>
                      <input
                        type="date"
                        value={dateOfReturned}
                        onChange={(e) => setDateOfReturned(e.target.value)}
                        className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                          darkMode
                            ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                            : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                        }`}
                        required={action === "returned"}
                      />
                    </div>
                  )}

                  {/* Receiver */}
                  <div>
                    <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}>
                      <User className="w-4 h-4" /> Receiver *
                    </label>
                    <input
                      type="text"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="Enter receiver name"
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  {/* Action */}
                  <div>
                    <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}>
                      <Check className="w-4 h-4" /> Action *
                    </label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                      }`}
                    >
                      <option value="transferred">Transferred</option>
                      <option value="returned">Returned</option>
                    </select>
                  </div>
                </div>

                {/* Purpose */}
                <div className="mt-4">
                  <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                    darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                  }`}>
                    <FileText className="w-4 h-4" /> Purpose *
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Enter purpose of transfer"
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Item Details */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
                  Item Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Name of item */}
                  <div className="md:col-span-2">
                    <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}>
                      <Package className="w-4 h-4" /> Name of item *
                    </label>
                    <div className="relative inventory-search-container">
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => {
                          setItemName(e.target.value);
                          setSearchTerm(e.target.value);
                          setSearchOpen(true);
                          setSelectedInventoryItem(null);
                        }}
                        onFocus={() => setSearchOpen(true)}
                        placeholder="Search and select item from inventory"
                        className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                          darkMode
                            ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                            : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                        }`}
                        required
                      />
                    {searchOpen && (
                      <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 ${
                        darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
                      }`}>
                        {filteredItems.length === 0 ? (
                          <div className={`px-3 py-2 text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                            No items found
                          </div>
                        ) : (
                          filteredItems.map((item, index) => (
                            <div
                              key={index}
                              onClick={() => handleItemSelect(item)}
                              className={`px-3 py-2 cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 border-b last:border-b-0 ${
                                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className={`font-medium text-sm ${darkMode ? "text-white" : "text-black"}`}>
                                    {item.name}
                                  </div>
                                  <div className={`text-xs ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                                    {item.type} • {inventoryQuantities[`${item.type}_${item.name}`]} available
                                  </div>
                                  {item.description && (
                                    <div className={`text-xs ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                                <Package className="w-4 h-4 text-blue-500" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedInventoryItem && (
                    <div className={`mt-2 text-xs ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                      Selected: {inventoryQuantities[`${selectedInventoryItem.type}_${selectedInventoryItem.name}`] || selectedInventoryItem.availableQuantity} items available
                    </div>
                  )}
                </div>

                {/* Total QTY */}
                <div>
                  <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                    darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                  }`}>
                    <Plus className="w-4 h-4" /> Total QTY *
                  </label>
                  <input
                    type="number"
                    value={totalQty}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="Enter quantity"
                    min="1"
                    max={inventoryQuantities[`${selectedInventoryItem?.type || 'product'}_${selectedInventoryItem?.name || itemName}`] || selectedInventoryItem?.availableQuantity || ""}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                      darkMode
                        ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                        : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                    }`}
                    required
                  />
                  {selectedInventoryItem && (
                    <div className={`mt-1 text-xs ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                      Max: {selectedInventoryItem.availableQuantity}
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${
                      darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                    }`}>
                      <MessageSquare className="w-4 h-4" /> Remarks
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks"
                      rows={3}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#3B82F6] bg-white text-black"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Record Transfer
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Table */}
          <div className={`rounded-xl shadow-lg border overflow-hidden animate__animated animate__fadeInUp animate__faster ${
            darkMode ? "bg-[#1F2937] border-[#374151]" : "bg-white border-[#E5E7EB]"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? "bg-[#111827]" : "bg-gray-50"}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>Item Name</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>QTY</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>Receiver</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>Purpose</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>Action</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                    }`}>Remarks</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}>
                  {currentItems.map((transfer) => (
                    <tr key={transfer.id} className={darkMode ? "hover:bg-[#111827]" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-2 text-blue-500" />
                          <span className={`text-sm font-medium ${darkMode ? "text-white" : "text-black"}`}>
                            {transfer.itemName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                          {transfer.totalQty}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-green-500" />
                            <span className={`text-sm ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                              {transfer.receiver}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                            {transfer.purpose}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleAction(transfer)}
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                              transfer.action === "transferred"
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                                : "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                            }`}
                            title={`Click to change to ${transfer.action === "transferred" ? "returned" : "transferred"}`}
                          >
                            {transfer.action}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {editingId === transfer.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingRemarks}
                                onChange={(e) => setEditingRemarks(e.target.value)}
                                className={`flex-1 px-2 py-1 text-sm border rounded ${
                                  darkMode
                                    ? "border-[#374151] bg-[#111827] text-white"
                                    : "border-[#D1D5DB] bg-white text-black"
                                }`}
                              />
                              <button
                                onClick={() => saveRemarks(transfer.id)}
                                className="text-green-500 hover:text-green-600"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                                {transfer.remarks || "-"}
                              </span>
                              <button
                                onClick={() => startEditingRemarks(transfer)}
                                className="text-blue-500 hover:text-blue-600 ml-2"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}>
                              {transfer.dateOfRelease}
                            </span>
                            {transfer.dateOfReturned && (
                              <>
                                <span className="text-gray-400">→</span>
                                <span className={darkMode ? "text-[#D1D5DB]" : "text-[#374151]"}>
                                  {transfer.dateOfReturned}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={`px-6 py-4 border-t ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, transfers.length)} of {transfers.length} results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === 1
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : darkMode
                              ? "bg-[#374151] text-white hover:bg-[#4B5563]"
                              : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                      >
                        Previous
                      </button>
                      <span className={`px-3 py-1 text-sm ${darkMode ? "text-white" : "text-black"}`}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === totalPages
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : darkMode
                              ? "bg-[#374151] text-white hover:bg-[#4B5563]"
                              : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                      >
                        Next
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
