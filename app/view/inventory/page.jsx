/* eslint-disable react-hooks/rules-of-hooks */
"use client";

// Force dynamic rendering to avoid pre-rendering issues with useSearchParams
export const dynamic = "force-dynamic";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import TopNavbar from "../../components/TopNavbar";
import { logActivity } from "../../utils/logActivity";
import AuthGuard from "../../components/AuthGuard";
import StockHistoryModal from "../../components/StockHistoryModal";
import StockThresholdModal from "../../components/StockThresholdModal";
import {
  Box,
  AlertTriangle,
  TrendingDown,
  XCircle,
  Package,
  Search,
  BarChart3,
  PencilLine,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import "animate.css";

// Import controllers
import {
  fetchProductInController,
  fetchProductOutController,
  clearProductInInventory,
  clearProductOutHistory,
  updateProductInDescriptionController,
} from "../../controller/productController";
import { fetchParcelItems } from "../../utils/parcelShippedHelper";
import { fetchParcelOutItems } from "../../utils/parcelOutHelper";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole, isStaffRole } from "../../utils/roleHelper";
import { saveAdminUndoAction } from "../../utils/adminUndo";
import {
  buildDescription,
  buildProductCode,
  buildSku,
} from "../../utils/inventoryMeta";
import {
  CATEGORIES,
  PRODUCT_CATEGORIES,
  getCategoryColor,
  getCategoryIcon,
  getAllStockCategories,
  getAllProductCategories,
  addCustomStockCategory,
  addCustomProductCategory,
  deleteCustomStockCategory,
  deleteCustomProductCategory,
} from "../../utils/categoryUtils";
import {
  addParcelInItem,
  updateParcelInItem,
  getParcelInItems,
  deleteParcelInItem,
} from "../../models/parcelShippedModel";
import {
  upsertProductIn,
  getProductIn,
  updateProductInQuantity,
  updateProductIn,
  deleteProductInByName,
} from "../../models/productModel";
import {
  getDefectiveItems,
  markDefectiveItemAsFixed,
  getDefectiveItemsStats,
} from "../../utils/defectiveItemsHelper";

// Default thresholds are now 0-0 (manual input required)
// Users must set their own thresholds per item
const DEFAULT_STOCK_THRESHOLDS = {
  critical: 0,
  low: 0,
};

// Changed to v2 - thresholds now default to 0-0 (manual input required)
const STOCK_THRESHOLDS_STORAGE_KEY = "inventory-item-thresholds-v2";

const normalizeItemKey = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const sanitizeThresholds = (value = {}) => {
  const criticalRaw = Number(value.critical);
  const lowRaw = Number(value.low);

  // Allow 0 as valid value (manual input mode)
  const critical = Number.isFinite(criticalRaw)
    ? Math.max(0, Math.floor(criticalRaw))
    : DEFAULT_STOCK_THRESHOLDS.critical;

  let low = Number.isFinite(lowRaw)
    ? Math.max(0, Math.floor(lowRaw))
    : DEFAULT_STOCK_THRESHOLDS.low;

  // Only enforce low > critical if both are > 0
  if (critical > 0 && low > 0 && low <= critical) {
    low = critical + 1;
  }

  return { critical, low };
};

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
  const [parcelSortOrder, setParcelSortOrder] = useState("default");
  const [productSortOrder, setProductSortOrder] = useState("default");
  const [parcelCurrentPage, setParcelCurrentPage] = useState(1);
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const { role, displayName, userEmail } = useAuth();
  const isAdmin = isAdminRole(role);
  const canViewHistory = isAdmin || isStaffRole(role);
  const [isUpdatingCategoryId, setIsUpdatingCategoryId] = useState(null);
  const [categoryTransferError, setCategoryTransferError] = useState("");
  const [descriptionUpdateError, setDescriptionUpdateError] = useState("");
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(
    () => new Set(),
  );
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [parcelOutItems, setParcelOutItems] = useState([]);
  const [productOutItems, setProductOutItems] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [timeframePreview, setTimeframePreview] = useState(null);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdTarget, setThresholdTarget] = useState(null);
  const [itemThresholds, setItemThresholds] = useState({});
  const [isThresholdsHydrated, setIsThresholdsHydrated] = useState(false);
  
  // Custom categories state
  const [stockCategories, setStockCategories] = useState(getAllStockCategories());
  const [productCategories, setProductCategories] = useState(getAllProductCategories());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState("stock"); // "stock" or "product"
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");

  // Defective items state
  const [defectiveItems, setDefectiveItems] = useState([]);
  const [defectiveItemsStats, setDefectiveItemsStats] = useState({
    activeDefectiveCount: 0,
    totalDefectiveQuantity: 0,
  });
  const [isMarkingFixed, setIsMarkingFixed] = useState(null);

  const DESCRIPTION_TRUNCATE_LIMIT = 140;
  const truncateText = (value, maxLength) => {
    const text = (value || "").toString().trim();
    if (!text) return { text: "", isTruncated: false };
    if (text.length <= maxLength) return { text, isTruncated: false };
    return {
      text: `${text.slice(0, maxLength).trimEnd()}...`,
      isTruncated: true,
    };
  };

  const toggleDescriptionExpanded = (id) => {
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditingDescription = (item) => {
    setDescriptionUpdateError("");
    setEditingDescriptionId(item.id);
    setEditingDescriptionValue((item.description || "").toString());
  };

  const cancelEditingDescription = () => {
    setEditingDescriptionId(null);
    setEditingDescriptionValue("");
  };

  const saveEditingDescription = async (id) => {
    setDescriptionUpdateError("");
    setIsSavingDescription(true);

    const result = await updateProductInDescriptionController(
      id,
      editingDescriptionValue,
    );

    if (!result?.success) {
      setDescriptionUpdateError(
        result?.message || "Failed to update description.",
      );
      setIsSavingDescription(false);
      return;
    }

    setProductItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, description: result?.data?.description ?? editingDescriptionValue }
          : row,
      ),
    );
    cancelEditingDescription();
    setIsSavingDescription(false);
  };

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState({
    components: [],
    products: [],
  });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const parcelTableRef = useRef(null);
  const productTableRef = useRef(null);

  const getThresholdKey = (type, item) => {
    const baseName = type === "parcel" ? item?.name : item?.product_name;
    return `${type}:${normalizeItemKey(baseName)}`;
  };

  const getItemThreshold = (type, item) => {
    const key = getThresholdKey(type, item);
    return sanitizeThresholds(itemThresholds[key]);
  };

  const getStockStatus = (quantity, threshold = DEFAULT_STOCK_THRESHOLDS) => {
    const qty = Number(quantity || 0);
    const normalizedThreshold = sanitizeThresholds(threshold);

    // If thresholds are both 0 (not set), only show out of stock or available
    if (normalizedThreshold.critical === 0 && normalizedThreshold.low === 0) {
      return qty <= 0 ? "out" : "available";
    }

    if (qty <= 0) return "out";
    if (normalizedThreshold.critical > 0 && qty <= normalizedThreshold.critical) return "critical";
    if (normalizedThreshold.low > 0 && qty < normalizedThreshold.low) return "low";
    return "available";
  };

  const getStatusLabel = (
    quantity,
    threshold = DEFAULT_STOCK_THRESHOLDS,
  ) => {
    const status = getStockStatus(quantity, threshold);
    if (status === "out") return "Out of Stock";
    if (status === "critical") return "Critical Level";
    if (status === "low") return "Low Stock";
    return "Well Stocked";
  };

  const getStatusColor = (
    quantity,
    darkMode,
    threshold = DEFAULT_STOCK_THRESHOLDS,
  ) => {
    const status = getStockStatus(quantity, threshold);
    if (status === "out") {
      return darkMode
        ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
        : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]";
    }
    if (status === "critical") {
      return darkMode
        ? "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30"
        : "bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]";
    }
    if (status === "low") {
      return darkMode
        ? "bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30"
        : "bg-[#FEF9C3] text-[#EAB308] border border-[#FEF08A]";
    }
    return darkMode
      ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
      : "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]";
  };

  const getStatusIcon = (quantity, threshold = DEFAULT_STOCK_THRESHOLDS) => {
    const status = getStockStatus(quantity, threshold);
    if (status === "out") return <XCircle className="w-4 h-4" />;
    if (status === "critical")
      return <AlertTriangle className="w-4 h-4 animate-pulse" />;
    if (status === "low") return <TrendingDown className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

  const getIndicatorColor = (
    quantity,
    threshold = DEFAULT_STOCK_THRESHOLDS,
  ) => {
    const status = getStockStatus(quantity, threshold);
    if (status === "out") return "bg-[#EF4444]";
    if (status === "critical") return "bg-[#F97316]";
    if (status === "low") return "bg-[#FACC15]";
    return "bg-[#22C55E]";
  };

  const matchesStatusFilter = (quantity, threshold, filterValue) => {
    const qty = Number(quantity || 0);
    if (filterValue === "all") return true;
    if (filterValue === "available") return qty > 0;
    if (filterValue === "out") return qty <= 0;

    const status = getStockStatus(qty, threshold);
    return status === filterValue;
  };

  const getDisplayedQuantity = (type, item) => {
    if (
      !timeframePreview ||
      timeframePreview.type !== type ||
      timeframePreview.id !== item?.id
    ) {
      return Number(item?.quantity || 0);
    }
    return timeframePreview.quantity;
  };

  const openHistoryModal = (type, item) => {
    setHistoryTarget({ type, item });
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryTarget(null);
    setTimeframePreview(null);
  };

  // Category management functions
  const openCategoryModal = (type) => {
    setCategoryModalType(type);
    setShowCategoryModal(true);
    setNewCategoryName("");
    setNewCategoryIcon("📦");
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setNewCategoryName("");
    setNewCategoryIcon("📦");
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Category name is required");
      return;
    }
    
    if (categoryModalType === "stock") {
      addCustomStockCategory(newCategoryName.trim(), newCategoryIcon);
      setStockCategories(getAllStockCategories());
    } else {
      addCustomProductCategory(newCategoryName.trim(), newCategoryIcon);
      setProductCategories(getAllProductCategories());
    }
    
    setNewCategoryName("");
    setNewCategoryIcon("📦");
  };

  const handleDeleteCategory = (categoryName) => {
    if (categoryModalType === "stock") {
      deleteCustomStockCategory(categoryName);
      setStockCategories(getAllStockCategories());
    } else {
      deleteCustomProductCategory(categoryName);
      setProductCategories(getAllProductCategories());
    }
  };

  const loadItems = async () => {
    const parcelData = await fetchParcelItems();
    const parcelOutData = await fetchParcelOutItems();
    const productData = await fetchProductInController();
    const productOutData = await fetchProductOutController();
    setParcelItems(parcelData || []);
    setParcelOutItems(parcelOutData || []);
    setProductItems(productData || []);
    setProductOutItems(productOutData || []);
  };

  // Load defective items
  const loadDefectiveItems = () => {
    const items = getDefectiveItems();
    // Filter out fixed items for display
    const activeItems = items.filter(item => item.status !== "fixed");
    setDefectiveItems(activeItems);
    setDefectiveItemsStats(getDefectiveItemsStats());
  };

  // Handle marking defective item as fixed
  const handleMarkAsFixed = async (recordId) => {
    const confirmed = window.confirm(
      "Mark this item as fixed?\n\n" +
      "This will return the quantity to inventory."
    );
    
    if (!confirmed) return;
    
    setIsMarkingFixed(recordId);
    
    try {
      const result = await markDefectiveItemAsFixed(recordId);
      
      if (result.success) {
        alert(result.message);
        loadDefectiveItems();
        loadItems(); // Reload inventory to show updated quantities
      } else {
        alert(result.error || "Failed to mark item as fixed");
      }
    } catch (error) {
      console.error("Error marking as fixed:", error);
      alert("An error occurred while processing");
    } finally {
      setIsMarkingFixed(null);
    }
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");
    loadItems();
    loadDefectiveItems();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOCK_THRESHOLDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setItemThresholds(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load stock thresholds:", error);
    } finally {
      setIsThresholdsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isThresholdsHydrated) return;
    try {
      localStorage.setItem(
        STOCK_THRESHOLDS_STORAGE_KEY,
        JSON.stringify(itemThresholds || {}),
      );
    } catch (error) {
      console.error("Failed to save stock thresholds:", error);
    }
  }, [itemThresholds, isThresholdsHydrated]);

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
    const threshold = getItemThreshold("parcel", item);
    const statusMatch = matchesStatusFilter(
      item.quantity,
      threshold,
      filterParcelStatus,
    );
    const categoryMatch =
      parcelCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        parcelCategoryFilter.toLowerCase();
    const keyword = parcelSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const manualCode = (item.item_code || "").toLowerCase();
    const autoCode = buildProductCode(item, "CMP").toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        manualCode.includes(keyword) ||
        autoCode.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const filteredProductItems = productItems.filter((item) => {
    const threshold = getItemThreshold("product", item);
    const statusMatch = matchesStatusFilter(
      item.quantity,
      threshold,
      filterProductStatus,
    );
    const categoryMatch =
      productCategoryFilter === "all" ||
      (item.category || "").toLowerCase() ===
        productCategoryFilter.toLowerCase();
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return statusMatch && categoryMatch;
    const manualCode = (item.product_code || "").toLowerCase();
    const autoCode = buildProductCode(item).toLowerCase();
    const sku = buildSku(item).toLowerCase();
    const name = (item.product_name || "").toLowerCase();
    return (
      statusMatch &&
      categoryMatch &&
      (name.includes(keyword) ||
        manualCode.includes(keyword) ||
        autoCode.includes(keyword) ||
        sku.includes(keyword))
    );
  });

  const getHistoryTimestamp = (row) => {
    const createdAt = Date.parse(row?.created_at || "");
    if (!Number.isNaN(createdAt)) return createdAt;

    const dateTime = Date.parse(
      `${row?.date || ""} ${row?.time_in || row?.time || ""}`,
    );
    if (!Number.isNaN(dateTime)) return dateTime;

    return 0;
  };

  const sortByHistoryDate = (items = [], sortOrder = "default") => {
    if (sortOrder === "default") return [...items];
    return [...items].sort((a, b) => {
      if (sortOrder === "newest") {
        return getHistoryTimestamp(b) - getHistoryTimestamp(a);
      }
      if (sortOrder === "oldest") {
        return getHistoryTimestamp(a) - getHistoryTimestamp(b);
      }
      return 0;
    });
  };

  const sortedParcelItems = sortByHistoryDate(filteredParcelItems, parcelSortOrder);
  const sortedProductItems = sortByHistoryDate(
    filteredProductItems,
    productSortOrder,
  );

  const PARCEL_ITEMS_PER_PAGE = 10;
  const PRODUCT_ITEMS_PER_PAGE = 5;

  const parcelTotalPages =
    Math.ceil(sortedParcelItems.length / PARCEL_ITEMS_PER_PAGE) || 1;
  const productTotalPages =
    Math.ceil(sortedProductItems.length / PRODUCT_ITEMS_PER_PAGE) || 1;

  const parcelIndexOfFirstItem = (parcelCurrentPage - 1) * PARCEL_ITEMS_PER_PAGE;
  const parcelIndexOfLastItem = parcelIndexOfFirstItem + PARCEL_ITEMS_PER_PAGE;
  const paginatedParcelItems = sortedParcelItems.slice(
    parcelIndexOfFirstItem,
    parcelIndexOfLastItem,
  );

  const productIndexOfFirstItem =
    (productCurrentPage - 1) * PRODUCT_ITEMS_PER_PAGE;
  const productIndexOfLastItem =
    productIndexOfFirstItem + PRODUCT_ITEMS_PER_PAGE;
  const paginatedProductItems = sortedProductItems.slice(
    productIndexOfFirstItem,
    productIndexOfLastItem,
  );

  const getPageNumbers = (currentPage, totalPages) => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i += 1) pageNumbers.push(i);
      return pageNumbers;
    }

    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i += 1) pageNumbers.push(i);
      pageNumbers.push("...");
      pageNumbers.push(totalPages);
      return pageNumbers;
    }

    if (currentPage >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push("...");
      for (let i = totalPages - 3; i <= totalPages; i += 1) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }

    pageNumbers.push(1);
    pageNumbers.push("...");
    pageNumbers.push(currentPage - 1);
    pageNumbers.push(currentPage);
    pageNumbers.push(currentPage + 1);
    pageNumbers.push("...");
    pageNumbers.push(totalPages);
    return pageNumbers;
  };

  useEffect(() => {
    setParcelCurrentPage(1);
  }, [filterParcelStatus, parcelCategoryFilter, parcelSearch, parcelSortOrder]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [
    filterProductStatus,
    productCategoryFilter,
    productSearch,
    productSortOrder,
  ]);

  useEffect(() => {
    if (parcelCurrentPage > parcelTotalPages) setParcelCurrentPage(parcelTotalPages);
  }, [parcelCurrentPage, parcelTotalPages]);

  useEffect(() => {
    if (productCurrentPage > productTotalPages) {
      setProductCurrentPage(productTotalPages);
    }
  }, [productCurrentPage, productTotalPages]);

  const transferCategory = async ({ type, id, nextCategory }) => {
  setCategoryTransferError("");
  setIsUpdatingCategoryId(id);
  const categoryValue =
    nextCategory ||
    (type === "product" ? PRODUCT_CATEGORIES.OTHER : CATEGORIES.OTHERS);

  try {
    if (type === "parcel") {
      const result = await updateParcelInItem(id, { category: categoryValue });
      if (result?.error) throw result.error;

      setParcelItems((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, category: categoryValue } : row,
        ),
      );

      await logActivity({
        userId: userEmail || null,
        userName: displayName || userEmail || "Unknown User",
        userType: role || "staff",
        action: "UPDATE CATEGORY",
        module: "Inventory",
        details: `Changed parcel category to ${categoryValue}`,
      });
    }

    if (type === "product") {
      const result = await updateProductIn(id, { category: categoryValue });
      if (result?.error) throw result.error;

      setProductItems((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, category: categoryValue } : row,
        ),
      );

      await logActivity({
        userId: userEmail || null,
        userName: displayName || userEmail || "Unknown User",
        userType: role || "staff",
        action: "UPDATE_CATEGORY",
        module: "Inventory",
        details: `Changed product category to ${categoryValue}`,
      });
    }
  } catch (err) {
    setCategoryTransferError(
      err?.message || "Failed to transfer category. Please try again.",
    );
  } finally {
    setIsUpdatingCategoryId(null);
  }
};

  const countByStatus = (items = [], type) => {
    return items.reduce(
      (acc, item) => {
        const qty = Number(item.quantity || 0);
        const threshold = getItemThreshold(type, item);
        const status = getStockStatus(qty, threshold);

        if (qty <= 0) acc.out += 1;
        if (qty > 0) acc.available += 1;
        if (status === "critical") acc.critical += 1;
        if (status === "low") acc.low += 1;

        return acc;
      },
      { out: 0, critical: 0, low: 0, available: 0 },
    );
  };

  const parcelStatusCounts = countByStatus(parcelItems, "parcel");
  const productStatusCounts = countByStatus(productItems, "product");

  const openThresholdModal = (type, item) => {
    setThresholdTarget({ type, item });
    setShowThresholdModal(true);
  };

  const closeThresholdModal = () => {
    setShowThresholdModal(false);
    setThresholdTarget(null);
  };

  const saveThresholdForTarget = ({ critical, low }) => {
    if (!thresholdTarget?.item) return;
    const key = getThresholdKey(thresholdTarget.type, thresholdTarget.item);
    const safe = sanitizeThresholds({ critical, low });
    setItemThresholds((prev) => ({
      ...prev,
      [key]: safe,
    }));
    closeThresholdModal();
  };

  const resetThresholdForTarget = () => {
    if (!thresholdTarget?.item) return;
    const key = getThresholdKey(thresholdTarget.type, thresholdTarget.item);
    setItemThresholds((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    closeThresholdModal();
  };

  // ===================== IMPORT FUNCTIONS =====================

  const parseExcelDate = (value) => {
    if (!value && value !== 0) return new Date().toISOString().split("T")[0];
    if (typeof value === "string" && value.includes("-")) return value;
    if (typeof value === "string" && value.includes("/")) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
    const num = Number(value);
    if (!isNaN(num) && num > 1000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const handleImportFile = (file) => {
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      let components = [];
      let products = [];

      wb.SheetNames.forEach((sheetName) => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
          defval: "",
          raw: true,
        });
        const key = sheetName.toLowerCase();
        if (key.includes("component") || key.includes("comp")) {
          components = rows.map((row) => ({
            name: row["Item Name"] || row["item_name"] || row["name"] || "",
            quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
            status: row["Status"] || "",
            date: parseExcelDate(row["Date Added"] || row["date"]),
            category: row["Category"] || row["category"] || "",
          }));
        } else if (key.includes("product") || key.includes("prod")) {
          products = rows.map((row) => ({
            product_name: row["Product Name"] || row["product_name"] || "",
            quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
            status: row["Status"] || "",
            date: parseExcelDate(row["Date Added"] || row["date"]),
            category: row["Category"] || row["category"] || "",
          }));
        } else {
          if (!components.length) {
            components = rows.map((row) => ({
              name: row["Item Name"] || row["item_name"] || row["name"] || "",
              quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
              status: row["Status"] || "",
              date: parseExcelDate(row["Date Added"] || row["date"]),
              category: row["Category"] || row["category"] || "",
            }));
          } else {
            products = rows.map((row) => ({
              product_name: row["Product Name"] || row["product_name"] || "",
              quantity: parseInt(row["Stock Quantity"] || row["quantity"] || 0),
              status: row["Status"] || "",
              date: parseExcelDate(row["Date Added"] || row["date"]),
              category: row["Category"] || row["category"] || "",
            }));
          }
        }
      });

      setImportPreview({ components, products });
      setShowImportModal(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImportLoading(true);
    setImportResult(null);

    const today = new Date().toISOString().split("T")[0];
    const timeNow = new Date().toTimeString().split(" ")[0];

    let compAdded = 0;
    let compUpdated = 0;
    let compDeleted = 0;
    let prodAdded = 0;
    let prodUpdated = 0;
    let prodDeleted = 0;
    const errors = [];

    if (errors.length === 0) {
      await logActivity({
        userId: userEmail || null,
        userName: displayName || userEmail || "Unknown User",
        userType: role || "staff",
        action: "IMPORT INVENTORY",
        module: "Inventory",
        details: `Imported inventory:
    Components -> +${compAdded} / ~${compUpdated} / -${compDeleted}
    Products -> +${prodAdded} / ~${prodUpdated} / -${prodDeleted}`,
      });
    }

    // ===== COMPONENTS — FULL SYNC (parcel_in table) =====
    const { data: existingParcels } = await getParcelInItems();
    const existingParcelList = existingParcels || [];

    // Build a map of unique names in Excel (lowercase)
    const excelCompNames = new Set(
      importPreview.components
        .filter((i) => i.name)
        .map((i) => i.name.toLowerCase()),
    );

    // DELETE: items in DB but not in Excel
    // Group by item_name — only delete once per unique name
    const deletedCompNames = new Set();
    for (const existing of existingParcelList) {
      const nameKey = (existing.item_name || "").toLowerCase();
      if (!excelCompNames.has(nameKey) && !deletedCompNames.has(nameKey)) {
        const result = await deleteParcelInItem(existing.id);
        if (result.error) {
          errors.push(`Failed to delete component: ${existing.item_name}`);
        } else {
          deletedCompNames.add(nameKey);
          compDeleted++;
        }
      } else if (
        !excelCompNames.has(nameKey) &&
        deletedCompNames.has(nameKey)
      ) {
        // Delete duplicate rows with same name
        await deleteParcelInItem(existing.id);
      }
    }

    // ADD / UPDATE
    for (const item of importPreview.components) {
      if (!item.name) continue;

      // Re-fetch to get fresh list after deletes
      const match = existingParcelList.find(
        (e) => (e.item_name || "").toLowerCase() === item.name.toLowerCase(),
      );

      if (match) {
        const result = await updateParcelInItem(match.id, {
          quantity: Number(item.quantity),
        });
        if (result.error) {
          errors.push(`Failed to update component: ${item.name}`);
        } else {
          compUpdated++;
        }
      } else {
        const result = await addParcelInItem({
          item_name: item.name,
          quantity: Number(item.quantity),
          date: item.date || today,
          time_in: timeNow,
          category: item.category || "Others",
          shipping_mode: null,
          client_name: null,
          price: null,
        });
        if (result.error) {
          errors.push(
            `Failed to add component: ${item.name} — ${result.error.message || "unknown error"}`,
          );
        } else {
          compAdded++;
        }
      }
    }

    // ===== PRODUCTS — FULL SYNC (product_in table) =====
    const allProducts = await getProductIn();
    const existingProductList = Array.isArray(allProducts) ? allProducts : [];

    // Build unique product names from Excel
    const excelProdNames = new Set(
      importPreview.products
        .filter((i) => i.product_name)
        .map((i) => i.product_name.toLowerCase()),
    );

    // DELETE: products in DB but not in Excel
    const deletedProdNames = new Set();
    for (const existing of existingProductList) {
      const nameKey = (existing.product_name || "").toLowerCase();
      if (!excelProdNames.has(nameKey) && !deletedProdNames.has(nameKey)) {
        const result = await deleteProductInByName(existing.product_name);
        if (!result.success) {
          errors.push(`Failed to delete product: ${existing.product_name}`);
        } else {
          deletedProdNames.add(nameKey);
          prodDeleted++;
        }
      }
    }

    // ADD / UPDATE
    for (const item of importPreview.products) {
      if (!item.product_name) continue;

      const existing = existingProductList.find(
        (e) =>
          (e.product_name || "").toLowerCase() ===
          item.product_name.toLowerCase(),
      );

      if (existing) {
        const result = await updateProductInQuantity(
          existing.id,
          item.quantity,
        );
        if (!result.success) {
          errors.push(`Failed to update product: ${item.product_name}`);
        } else {
          prodUpdated++;
        }
      } else {
        const result = await upsertProductIn({
          product_name: item.product_name,
          quantity: Number(item.quantity),
          date: item.date || today,
          time_in: timeNow,
          category: item.category || "Others",
          components: [],
          shipping_mode: null,
          client_name: null,
          description: null,
          price: null,
        });
        if (result?.__error) {
          errors.push(
            `Failed to add product: ${item.product_name} — ${result.__error}`,
          );
        } else {
          prodAdded++;
        }
      }
    }

    // Reload fresh data from Supabase
    await loadItems();

    setImportLoading(false);
    setImportResult({
      compAdded,
      compUpdated,
      compDeleted,
      prodAdded,
      prodUpdated,
      prodDeleted,
      errors,
    });

    // Auto-close after 2.5 seconds if no errors
    if (errors.length === 0) {
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview({ components: [], products: [] });
        setImportResult(null);
      }, 2500);
    }
  };

  // ===================== EXPORT FUNCTIONS =====================

  const exportToPDF = (parcelData = [], productData = []) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    doc.setFontSize(14);
    doc.text("Stock Status", 14, 40);
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
    doc.text("Product Status", 14, finalY + 15);
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
      "STOCK STATUS",
      "Item Name,Stock Quantity,Status,Date Added",
      ...parcelRows,
      "",
      "PRODUCT STATUS",
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
        <h2>Stock Status</h2>
        <table>
          <thead><tr><th>Item Name</th><th>Stock Quantity</th><th>Status</th><th>Date Added</th></tr></thead>
          <tbody>${parcelRows}</tbody>
        </table>
        <h2>Product Status</h2>
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

              {/* Export + Import Buttons */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
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

                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-[#0f766e] to-[#0d9488] text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleImportFile(e.target.files[0])}
                  />
                </label>
              </div>
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

            {categoryTransferError && (
              <div
                className={`p-3 rounded-xl mb-6 border animate__animated animate__fadeInDown ${
                  darkMode
                    ? "bg-red-900/20 border-red-800 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {categoryTransferError}
              </div>
            )}

            {descriptionUpdateError && (
              <div
                className={`p-3 rounded-xl mb-6 border animate__animated animate__fadeInDown ${
                  darkMode
                    ? "bg-red-900/20 border-red-800 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {descriptionUpdateError}
              </div>
            )}

            {/* ============= PARCEL SECTION ============= */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-6 h-6 text-[#1e40af]" />
                <h2 className="text-xl font-bold">Stock Status</h2>
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
                      In-Stock
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

              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
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
                    {stockCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div className="flex items-end">
                    <button
                      onClick={() => openCategoryModal("stock")}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        darkMode
                          ? "bg-[#374151] text-gray-300 hover:bg-[#4B5563]"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      + Manage Categories
                    </button>
                  </div>
                )}
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
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Sort by Date:
                  </label>
                  <select
                    value={parcelSortOrder}
                    onChange={(e) => setParcelSortOrder(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#60A5FA] focus:border-[#60A5FA] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#1e40af] focus:border-[#1e40af] bg-white text-black"}`}
                  >
                    <option value="default">Default</option>
                    <option value="newest">Newest to Oldest</option>
                    <option value="oldest">Oldest to Newest</option>
                  </select>
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
                          "Code",
                          "Product",
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
                      {sortedParcelItems.length === 0 ? (
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
                        paginatedParcelItems.map((item, index) => (
                          <tr
                            key={index}
                            className={`transition-colors ${darkMode ? "hover:bg-[#374151]" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-3 text-sm">
                              {item.item_code || buildProductCode(item, "CMP")}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                {(() => {
                                  const parcelQty = getDisplayedQuantity("parcel", item);
                                  const parcelThreshold = getItemThreshold("parcel", item);
                                  return (
                                    <div
                                      className={`w-2 h-2 rounded-full ${getIndicatorColor(parcelQty, parcelThreshold)}`}
                                    />
                                  );
                                })()}
                                <span className="break-words whitespace-normal">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildSku(item)}
                            </td>
                            <td className="px-4 py-3 text-sm min-w-[22rem] w-[28rem] align-top">
                              {(() => {
                                const raw = buildDescription(item);
                                if (!raw) return "-";

                                const expanded = expandedDescriptionIds.has(
                                  `parcel-${item.id}`,
                                );
                                if (expanded) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleDescriptionExpanded(`parcel-${item.id}`)
                                      }
                                      className={`text-left whitespace-pre-wrap break-words ${
                                        darkMode
                                          ? "text-gray-200 hover:text-white"
                                          : "text-gray-800 hover:text-black"
                                      }`}
                                      title="Click to collapse"
                                    >
                                      {raw}
                                    </button>
                                  );
                                }

                                const truncated = truncateText(
                                  raw,
                                  DESCRIPTION_TRUNCATE_LIMIT,
                                );
                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleDescriptionExpanded(`parcel-${item.id}`)
                                    }
                                    className={`text-left break-words ${
                                      darkMode
                                        ? "text-gray-200 hover:text-white"
                                        : "text-gray-800 hover:text-black"
                                    }`}
                                    title="Click to expand"
                                  >
                                    {truncated.text}
                                    {truncated.isTruncated ? (
                                      <span
                                        className={`ml-2 text-[11px] font-semibold ${
                                          darkMode
                                            ? "text-blue-300"
                                            : "text-blue-600"
                                        }`}
                                      >
                                        View more
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isAdmin ? (
                                <div className="flex flex-col gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                                  >
                                    <span>{getCategoryIcon(item.category)}</span>
                                    {item.category || "Others"}
                                  </span>
                                  <select
                                    value={item.category || CATEGORIES.OTHERS}
                                    onChange={(e) =>
                                      transferCategory({
                                        type: "parcel",
                                        id: item.id,
                                        nextCategory: e.target.value,
                                      })
                                    }
                                    disabled={isUpdatingCategoryId === item.id}
                                    className={`w-fit text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 ${
                                      darkMode
                                        ? "bg-[#111827] border-[#374151] text-white focus:ring-[#3B82F6]"
                                        : "bg-white border-[#D1D5DB] text-black focus:ring-[#1E3A8A]"
                                    }`}
                                    aria-label="Transfer category"
                                  >
                                    {stockCategories.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                                >
                                  <span>{getCategoryIcon(item.category)}</span>
                                  {item.category || "Others"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {getDisplayedQuantity("parcel", item)} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(() => {
                                const parcelQty = getDisplayedQuantity("parcel", item);
                                const parcelThreshold = getItemThreshold("parcel", item);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(parcelQty, darkMode, parcelThreshold)}`}
                                  >
                                    {getStatusIcon(parcelQty, parcelThreshold)}
                                    {getStatusLabel(parcelQty, parcelThreshold)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm">{item.date}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {canViewHistory ? (
                                  <button
                                    type="button"
                                    onClick={() => openHistoryModal("parcel", item)}
                                    className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                                      darkMode
                                        ? "border-[#374151] hover:bg-[#374151] text-blue-300"
                                        : "border-[#D1D5DB] hover:bg-[#EFF6FF] text-[#1D4ED8]"
                                    }`}
                                    title="View stock history"
                                    aria-label="View stock history"
                                  >
                                    <Search className="w-4 h-4" />
                                  </button>
                                ) : null}
                                {isAdmin ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openThresholdModal("parcel", item)}
                                      className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                                        darkMode
                                          ? "border-[#374151] hover:bg-[#374151] text-amber-300"
                                          : "border-[#D1D5DB] hover:bg-[#FFFBEB] text-[#B45309]"
                                      }`}
                                      title="Set stock thresholds"
                                      aria-label="Set stock thresholds"
                                    >
                                      <BarChart3 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : null}
                                {item.quantity === 0 ? (
                                  <Link
                                    href={`/view/stock-in?item=${encodeURIComponent(item.name)}`}
                                  >
                                    <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer w-fit">
                                      Add Stock
                                    </div>
                                  </Link>
                                ) : null}
                                {!canViewHistory && item.quantity !== 0 ? "-" : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {sortedParcelItems.length > 0 && (
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-t ${
                      darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                    }`}
                  >
                    <div
                      className={`text-sm ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Showing {parcelIndexOfFirstItem + 1} to{" "}
                      {Math.min(parcelIndexOfLastItem, sortedParcelItems.length)} of{" "}
                      {sortedParcelItems.length} entries
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setParcelCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={parcelCurrentPage === 1}
                        className={`p-2 rounded-lg transition-all ${
                          parcelCurrentPage === 1
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
                        {getPageNumbers(parcelCurrentPage, parcelTotalPages).map(
                          (pageNum, idx) =>
                            pageNum === "..." ? (
                              <span
                                key={`parcel-ellipsis-${idx}`}
                                className={`px-3 py-2 ${
                                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                                }`}
                              >
                                ...
                              </span>
                            ) : (
                              <button
                                key={`parcel-page-${pageNum}`}
                                type="button"
                                onClick={() => setParcelCurrentPage(pageNum)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                                  parcelCurrentPage === pageNum
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
                        type="button"
                        onClick={() =>
                          setParcelCurrentPage((prev) =>
                            Math.min(prev + 1, parcelTotalPages),
                          )
                        }
                        disabled={parcelCurrentPage === parcelTotalPages}
                        className={`p-2 rounded-lg transition-all ${
                          parcelCurrentPage === parcelTotalPages
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

            {/* ============= PRODUCT SECTION ============= */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-6 h-6 text-[#7c3aed]" />
                <h2 className="text-xl font-bold">Product Status</h2>
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
                      In-Stock
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

              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
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
                    {productCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div className="flex items-end">
                    <button
                      onClick={() => openCategoryModal("product")}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        darkMode
                          ? "bg-[#374151] text-gray-300 hover:bg-[#4B5563]"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      + Manage Categories
                    </button>
                  </div>
                )}
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
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Sort by Date:
                  </label>
                  <select
                    value={productSortOrder}
                    onChange={(e) => setProductSortOrder(e.target.value)}
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${darkMode ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white" : "border-[#D1D5DB] focus:ring-[#7c3aed] focus:border-[#7c3aed] bg-white text-black"}`}
                  >
                    <option value="default">Default</option>
                    <option value="newest">Newest to Oldest</option>
                    <option value="oldest">Oldest to Newest</option>
                  </select>
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
                          "Code",
                          "Product",
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
                      {sortedProductItems.length === 0 ? (
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
                        paginatedProductItems.map((item, index) => (
                          <tr
                            key={index}
                            className={`transition-colors ${darkMode ? "hover:bg-[#374151]" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-3 text-sm">
                              {item.product_code || buildProductCode(item)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium align-top">
                              <div className="flex items-start gap-2 min-w-0">
                                {(() => {
                                  const productQty = getDisplayedQuantity("product", item);
                                  const productThreshold = getItemThreshold("product", item);
                                  return (
                                    <div
                                      className={`w-2 h-2 rounded-full ${getIndicatorColor(productQty, productThreshold)}`}
                                    />
                                  );
                                })()}
                                <span className="break-words whitespace-normal">
                                  {item.product_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {buildSku(item)}
                            </td>
                            <td className="px-4 py-3 text-sm min-w-[22rem] w-[28rem] align-top">
                              {editingDescriptionId === item.id ? (
                                <div className="flex flex-col gap-2">
                                  <textarea
                                    value={editingDescriptionValue}
                                    onChange={(e) =>
                                      setEditingDescriptionValue(e.target.value)
                                    }
                                    rows={3}
                                    className={`w-full rounded-lg p-2 text-xs sm:text-sm border ${
                                      darkMode
                                        ? "bg-[#111827] border-[#374151] text-white"
                                        : "bg-white border-[#E5E7EB] text-black"
                                    }`}
                                    placeholder="Type a description..."
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isSavingDescription}
                                      onClick={() => saveEditingDescription(item.id)}
                                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                                        isSavingDescription
                                          ? darkMode
                                            ? "bg-[#374151] text-[#9CA3AF] cursor-not-allowed"
                                            : "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                                          : "bg-[#16A34A] text-white hover:bg-[#15803D]"
                                      }`}
                                    >
                                      <Check className="w-4 h-4" /> Save
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSavingDescription}
                                      onClick={cancelEditingDescription}
                                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                                        darkMode
                                          ? "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                                      }`}
                                    >
                                      <X className="w-4 h-4" /> Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    className={`text-left break-words leading-relaxed ${
                                      darkMode
                                        ? "text-gray-200 hover:text-white"
                                        : "text-gray-800 hover:text-black"
                                    }`}
                                    onClick={() => {
                                      if (!buildDescription(item)) return;
                                      toggleDescriptionExpanded(`product-${item.id}`);
                                    }}
                                    title={
                                      expandedDescriptionIds.has(`product-${item.id}`)
                                        ? "Click to collapse"
                                        : "Click to expand"
                                    }
                                  >
                                    {(() => {
                                      const raw = buildDescription(item);
                                      if (!raw) {
                                        return (
                                          <span
                                            className={
                                              darkMode
                                                ? "text-gray-500"
                                                : "text-gray-400"
                                            }
                                          >
                                            No description
                                          </span>
                                        );
                                      }

                                      const expanded = expandedDescriptionIds.has(
                                        `product-${item.id}`,
                                      );
                                      if (expanded) {
                                        return (
                                          <span className="whitespace-pre-wrap">
                                            {raw}
                                          </span>
                                        );
                                      }

                                      const truncated = truncateText(
                                        raw,
                                        DESCRIPTION_TRUNCATE_LIMIT,
                                      );
                                      return (
                                        <span>
                                          {truncated.text}
                                          {truncated.isTruncated ? (
                                            <span
                                              className={`ml-2 text-[11px] font-semibold ${
                                                darkMode
                                                  ? "text-blue-300"
                                                  : "text-blue-600"
                                              }`}
                                            >
                                              View more
                                            </span>
                                          ) : null}
                                        </span>
                                      );
                                    })()}
                                  </button>
                                  {isAdmin ? (
                                    <button
                                      type="button"
                                      onClick={() => startEditingDescription(item)}
                                      className={`p-2 rounded-lg border transition ${
                                        darkMode
                                          ? "border-[#374151] hover:bg-[#374151]/60"
                                          : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                      }`}
                                      title="Edit description"
                                    >
                                      <PencilLine className="w-4 h-4" />
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isAdmin ? (
                                <div className="flex flex-col gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                                  >
                                    <span>{getCategoryIcon(item.category)}</span>
                                    {item.category || "Others"}
                                  </span>
                                  <select
                                    value={item.category || PRODUCT_CATEGORIES.OTHER}
                                    onChange={(e) =>
                                      transferCategory({
                                        type: "product",
                                        id: item.id,
                                        nextCategory: e.target.value,
                                      })
                                    }
                                    disabled={isUpdatingCategoryId === item.id}
                                    className={`w-fit text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 ${
                                      darkMode
                                        ? "bg-[#111827] border-[#374151] text-white focus:ring-[#3B82F6]"
                                        : "bg-white border-[#D1D5DB] text-black focus:ring-[#1E3A8A]"
                                    }`}
                                    aria-label="Transfer category"
                                  >
                                    {productCategories.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}
                                >
                                  <span>{getCategoryIcon(item.category)}</span>
                                  {item.category || "Others"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {getDisplayedQuantity("product", item)} units
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(() => {
                                const productQty = getDisplayedQuantity("product", item);
                                const productThreshold = getItemThreshold("product", item);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(productQty, darkMode, productThreshold)}`}
                                  >
                                    {getStatusIcon(productQty, productThreshold)}
                                    {getStatusLabel(productQty, productThreshold)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm">{item.date}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {canViewHistory ? (
                                  <button
                                    type="button"
                                    onClick={() => openHistoryModal("product", item)}
                                    className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                                      darkMode
                                        ? "border-[#374151] hover:bg-[#374151] text-violet-300"
                                        : "border-[#D1D5DB] hover:bg-[#F5F3FF] text-[#6D28D9]"
                                    }`}
                                    title="View stock history"
                                    aria-label="View stock history"
                                  >
                                    <Search className="w-4 h-4" />
                                  </button>
                                ) : null}
                                {isAdmin ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openThresholdModal("product", item)}
                                      className={`inline-flex items-center justify-center p-2 rounded-lg border transition ${
                                        darkMode
                                          ? "border-[#374151] hover:bg-[#374151] text-amber-300"
                                          : "border-[#D1D5DB] hover:bg-[#FFFBEB] text-[#B45309]"
                                      }`}
                                      title="Set stock thresholds"
                                      aria-label="Set stock thresholds"
                                    >
                                      <BarChart3 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : null}
                                {item.quantity === 0 ? (
                                  <Link
                                    href={`/view/product-in?product=${encodeURIComponent(item.product_name)}`}
                                  >
                                    <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
                                      Add Stock
                                    </div>
                                  </Link>
                                ) : null}
                                {!canViewHistory && item.quantity !== 0 ? "-" : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {sortedProductItems.length > 0 && (
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-t ${
                      darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                    }`}
                  >
                    <div
                      className={`text-sm ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Showing {productIndexOfFirstItem + 1} to{" "}
                      {Math.min(productIndexOfLastItem, sortedProductItems.length)} of{" "}
                      {sortedProductItems.length} entries
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setProductCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={productCurrentPage === 1}
                        className={`p-2 rounded-lg transition-all ${
                          productCurrentPage === 1
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
                        {getPageNumbers(productCurrentPage, productTotalPages).map(
                          (pageNum, idx) =>
                            pageNum === "..." ? (
                              <span
                                key={`product-ellipsis-${idx}`}
                                className={`px-3 py-2 ${
                                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                                }`}
                              >
                                ...
                              </span>
                            ) : (
                              <button
                                key={`product-page-${pageNum}`}
                                type="button"
                                onClick={() => setProductCurrentPage(pageNum)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                                  productCurrentPage === pageNum
                                    ? "bg-[#6D28D9] text-white shadow-md"
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
                        type="button"
                        onClick={() =>
                          setProductCurrentPage((prev) =>
                            Math.min(prev + 1, productTotalPages),
                          )
                        }
                        disabled={productCurrentPage === productTotalPages}
                        className={`p-2 rounded-lg transition-all ${
                          productCurrentPage === productTotalPages
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
          </div>
        </div>

        <StockHistoryModal
          open={showHistoryModal && Boolean(historyTarget)}
          darkMode={darkMode}
          historyTarget={historyTarget}
          parcelItems={parcelItems}
          parcelOutItems={parcelOutItems}
          productItems={productItems}
          productOutItems={productOutItems}
          onClose={closeHistoryModal}
          onPreviewChange={setTimeframePreview}
        />

        <StockThresholdModal
          open={showThresholdModal && Boolean(thresholdTarget)}
          darkMode={darkMode}
          thresholdTarget={thresholdTarget}
          defaultThresholds={DEFAULT_STOCK_THRESHOLDS}
          currentThreshold={
            thresholdTarget
              ? getItemThreshold(thresholdTarget.type, thresholdTarget.item)
              : DEFAULT_STOCK_THRESHOLDS
          }
          onClose={closeThresholdModal}
          onSave={saveThresholdForTarget}
          onReset={resetThresholdForTarget}
        />

        {/* ============= DEFECTIVE ITEMS TABLE ============= */}
        {defectiveItems.length > 0 && (
          <div className={`mt-10 rounded-xl shadow-xl overflow-hidden border transition animate__animated animate__fadeInUp ${
            darkMode
              ? "bg-[#1F2937] border-[#374151]"
              : "bg-white border-[#E5E7EB]"
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-red-500/20" : "bg-red-100"}`}>
                    <Wrench className={`w-5 h-5 ${darkMode ? "text-red-400" : "text-red-600"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Defective Items
                    </h3>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {defectiveItemsStats.activeDefectiveCount} active item(s) requiring repair or disposal
                    </p>
                  </div>
                </div>
                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Total Quantity: <span className="font-semibold text-red-500">{defectiveItemsStats.totalDefectiveQuantity}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className={`${
                  darkMode
                    ? "bg-[#111827] text-[#D1D5DB]"
                    : "bg-[#F9FAFB] text-[#374151]"
                }`}>
                  <tr>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">DATE</th>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">ITEM NAME</th>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">CATEGORY</th>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">QUANTITY</th>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">REASON</th>
                    <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className={
                  darkMode ? "divide-y divide-[#374151]" : "divide-y divide-[#E5E7EB]"
                }>
                  {defectiveItems.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`transition ${
                        darkMode ? "hover:bg-[#374151]/40" : "hover:bg-[#F3F4F6]"
                      }`}
                    >
                      <td className="p-3 sm:p-4 text-sm whitespace-nowrap text-center align-middle">
                        {record.date}
                      </td>
                      <td className="p-3 sm:p-4 font-semibold text-sm whitespace-nowrap text-center align-middle">
                        {record.itemName}
                      </td>
                      <td className="p-3 sm:p-4 text-sm whitespace-nowrap text-center align-middle">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          darkMode
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {record.category || "Others"}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-center align-middle">
                        <span className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                          darkMode
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-red-100 text-red-700 border border-red-200"
                        }`}>
                          {record.quantity}
                        </span>
                      </td>
                      <td className={`p-3 sm:p-4 text-sm text-center align-middle max-w-xs truncate ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}>
                        {record.reason || "-"}
                      </td>
                      <td className="p-3 sm:p-4 text-center align-middle">
                        <button
                          onClick={() => handleMarkAsFixed(record.id)}
                          disabled={isMarkingFixed === record.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isMarkingFixed === record.id
                              ? "bg-gray-400 cursor-not-allowed text-white"
                              : darkMode
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                          title="Mark as fixed and return to inventory"
                        >
                          {isMarkingFixed === record.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark as Fixed
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowExportModal(false)}
            />
            <div
              className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl p-6 ${darkMode ? "bg-[#1F2937] border-[#374151] text-white" : "bg-white border-[#E5E7EB] text-black"}`}
            >
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

        {/* ============= IMPORT MODAL ============= */}
        {showImportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowImportModal(false)}
            />
            <div
              className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl p-6 max-h-[80vh] overflow-y-auto ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151] text-white"
                  : "bg-white border-[#E5E7EB] text-black"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Upload className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Import Preview</h3>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Review data before importing
                  </p>
                </div>
              </div>

              <div
                className={`h-px mb-4 ${darkMode ? "bg-[#374151]" : "bg-[#E5E7EB]"}`}
              />

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className={`p-3 rounded-xl ${darkMode ? "bg-[#374151]" : "bg-gray-50"}`}
                >
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Components
                  </p>
                  <p className="text-xl font-bold text-blue-500">
                    {importPreview.components.length}
                  </p>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    items found
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${darkMode ? "bg-[#374151]" : "bg-gray-50"}`}
                >
                  <p
                    className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Products
                  </p>
                  <p className="text-xl font-bold text-purple-500">
                    {importPreview.products.length}
                  </p>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    items found
                  </p>
                </div>
              </div>

              {/* Components Preview Table */}
              {importPreview.components.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2 text-blue-500">
                    Components
                  </p>
                  <div
                    className={`rounded-xl overflow-hidden border ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}
                  >
                    <table className="w-full text-xs">
                      <thead
                        className={
                          darkMode
                            ? "bg-[#374151] text-gray-300"
                            : "bg-[#1e40af] text-white"
                        }
                      >
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Qty</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}
                      >
                        {importPreview.components.slice(0, 5).map((item, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              {item.product_name ? buildProductCode(item) : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {item.name ? buildProductCode(item, "CMP") : "-"}
                            </td>
                            <td className="px-3 py-2">{item.name || "—"}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.quantity, darkMode)}`}
                              >
                                {getStatusLabel(item.quantity)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {importPreview.components.length > 5 && (
                          <tr>
                            <td
                              colSpan={4}
                              className={`px-3 py-2 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              +{importPreview.components.length - 5} more items
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products Preview Table */}
              {importPreview.products.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2 text-purple-500">
                    Products
                  </p>
                  <div
                    className={`rounded-xl overflow-hidden border ${darkMode ? "border-[#374151]" : "border-[#E5E7EB]"}`}
                  >
                    <table className="w-full text-xs">
                      <thead
                        className={
                          darkMode
                            ? "bg-[#374151] text-gray-300"
                            : "bg-[#7c3aed] text-white"
                        }
                      >
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Qty</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${darkMode ? "divide-[#374151]" : "divide-[#E5E7EB]"}`}
                      >
                        {importPreview.products.slice(0, 5).map((item, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              {item.product_name || "—"}
                            </td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.quantity, darkMode)}`}
                              >
                                {getStatusLabel(item.quantity)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {importPreview.products.length > 5 && (
                          <tr>
                            <td
                              colSpan={4}
                              className={`px-3 py-2 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              +{importPreview.products.length - 5} more items
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p
                className={`text-xs mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Existing items will be updated. New items will be added.
              </p>

              {/* Result Message */}
              {importResult && (
                <div
                  className={`mb-4 p-3 rounded-xl text-sm ${
                    importResult.errors.length > 0
                      ? darkMode
                        ? "bg-red-900/20 border border-red-800 text-red-300"
                        : "bg-red-50 border border-red-200 text-red-700"
                      : darkMode
                        ? "bg-green-900/20 border border-green-800 text-green-300"
                        : "bg-green-50 border border-green-200 text-green-700"
                  }`}
                >
                  {importResult.errors.length === 0 ? (
                    <div>
                      <p className="font-semibold mb-1">Import successful!</p>
                      <p className="text-xs">
                        Components: {importResult.compAdded} added,{" "}
                        {importResult.compUpdated} updated,{" "}
                        {importResult.compDeleted} deleted
                      </p>
                      <p className="text-xs">
                        Products: {importResult.prodAdded} added,{" "}
                        {importResult.prodUpdated} updated,{" "}
                        {importResult.prodDeleted} deleted
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-1">
                        Completed with errors:
                      </p>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs">
                          • {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={confirmImport}
                  disabled={importLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0f766e] to-[#0d9488] text-white hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    "Confirm Import"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                  disabled={importLoading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60 ${
                    darkMode
                      ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============= CATEGORY MANAGEMENT MODAL ============= */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeCategoryModal}
            />
            <div
              className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl p-6 max-h-[80vh] overflow-y-auto ${
                darkMode
                  ? "bg-[#1F2937] border-[#374151] text-white"
                  : "bg-white border-[#E5E7EB] text-black"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <span className="text-xl">📁</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Manage {categoryModalType === "stock" ? "Stock" : "Product"} Categories
                  </h3>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Add or remove custom categories
                  </p>
                </div>
              </div>

              {/* Add New Category */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Add New Category:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name (e.g., Electronics)"
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white focus:ring-blue-500"
                        : "border-[#D1D5DB] bg-white text-black focus:ring-blue-500"
                    }`}
                  />
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 ${
                      darkMode
                        ? "border-[#374151] bg-[#111827] text-white focus:ring-blue-500"
                        : "border-[#D1D5DB] bg-white text-black focus:ring-blue-500"
                    }`}
                  >
                    <option value="📦">📦</option>
                    <option value="⚡">⚡</option>
                    <option value="🔧">🔧</option>
                    <option value="💻">💻</option>
                    <option value="📱">📱</option>
                    <option value="🔌">🔌</option>
                    <option value="🤖">🤖</option>
                    <option value="🚤">🚤</option>
                    <option value="🛸">🛸</option>
                    <option value="📋">📋</option>
                  </select>
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Existing Categories */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Current Categories:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(categoryModalType === "stock" ? stockCategories : productCategories).map((cat) => {
                    const isDefault = ["Component", "Product", "Tool", "Others", "EROV PRODUCT", "JSUMO PRODUCT", "ZM ROBO PRODUCT", "OTHER"].includes(cat.value);
                    return (
                      <div
                        key={cat.value}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          darkMode ? "bg-[#374151]" : "bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{cat.icon || "📦"}</span>
                          <span className="text-sm">{cat.label}</span>
                        </div>
                        {!isDefault && (
                          <button
                            onClick={() => handleDeleteCategory(cat.value)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Delete category"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={closeCategoryModal}
                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-medium transition ${
                  darkMode
                    ? "bg-[#374151] hover:bg-[#4B5563] text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
