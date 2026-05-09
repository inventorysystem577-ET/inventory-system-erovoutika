/* eslint-disable react-hooks/rules-of-hooks */
"use client";

// Force dynamic rendering to avoid pre-rendering issues with useSearchParams
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import TopNavbar from "../../components/TopNavbar";
import { logActivity } from "../../utils/logActivity";
import Sidebar from "../../components/Sidebar";
import {
  PackageCheck,
  Plus,
  Clock,
  Calendar,
  Package,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Check,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import "animate.css";
import {
  fetchProductInController,
  handleAddProductIn,
  handleAddMultipleProductsIn,
  updateProductInDescriptionController,
} from "../../controller/productController";
import { products } from "../../utils/productsData";
import AuthGuard from "../../components/AuthGuard";
import MissingComponentsModal from "../../components/MissingComponentsModal";
import MultipleProductInput from "../../components/MultipleProductInput";
import {
  fetchParcelItems,
  handleAddParcelIn,
} from "../../utils/parcelShippedHelper";
import { useAuth } from "../../hook/useAuth";
import { isAdminRole } from "../../utils/roleHelper";
import { buildProductCode, buildSku } from "../../utils/inventoryMeta";
import {
  CATEGORIES,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_OPTIONS,
} from "../../utils/categoryUtils";

export default function ProductInPage() {
  const buildDefaultBulkRow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    const hour24 = now.getHours();
    const hour12 = hour24 % 12 || 12;
    const minute = `${now.getMinutes()}`.padStart(2, "0");
    const ampm = hour24 >= 12 ? "PM" : "AM";

    return {
      product_name: "",
      quantity: 1,
      date: `${year}-${month}-${day}`,
      timeHour: `${hour12}`,
      timeMinute: minute,
      timeAMPM: ampm,
      description: "",
      price: 0,
      category: PRODUCT_CATEGORIES.OTHER,
      components: [],
      customComponents: [{ name: "", quantity: "", unit_price: "" }],
    };
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("product-in");
  const [showMultipleInput, setShowMultipleInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const searchParams = useSearchParams();
  const productParam = searchParams.get("product");

  const [items, setItems] = useState([]);
  const [stockInItems, setStockInItems] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [singleCategory, setSingleCategory] = useState(
    PRODUCT_CATEGORIES.OTHER,
  );
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [productCode, setProductCode] = useState("");
  const [date, setDate] = useState("");
  const [timeHour, setTimeHour] = useState("1");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAMPM, setTimeAMPM] = useState("AM");

  useEffect(() => {
    if (productParam) {
      setSelectedProduct(productParam);
    }
  }, [productParam]);

  useEffect(() => {
    if (selectedProduct) {
      const totalStock = items
        .filter(
          (item) =>
            normalizeName(item.product_name) === normalizeName(selectedProduct),
        )
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0);
      setCurrentStock(totalStock);
    } else {
      setCurrentStock(0);
      setPrice(0);
    }
  }, [selectedProduct, items]);

  useEffect(() => {
    const quantity = parseInt(qty) || 0;
    setTotalPrice(price * quantity);
  }, [qty, price]);

  const [totalPrice, setTotalPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [errorBar, setErrorBar] = useState("");
  const [successBar, setSuccessBar] = useState("");
  const [alternativeRequest, setAlternativeRequest] = useState(null);
  const [missing, setMissing] = useState([]);
  const [showMissingComponentsModal, setShowMissingComponentsModal] =
    useState(false);
  const [isAddingMissingStock, setIsAddingMissingStock] = useState(false);
  const [pendingProductInRequest, setPendingProductInRequest] = useState(null);
  const [isRetryingPendingProductIn, setIsRetryingPendingProductIn] =
    useState(false);
  const [showComponentStockModal, setShowComponentStockModal] = useState(false);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [missingComponentsForSelected, setMissingComponentsForSelected] =
    useState([]);
  const [showCustomComponentsModal, setShowCustomComponentsModal] =
    useState(false);
  const [customComponents, setCustomComponents] = useState([
    { name: "", quantity: "" },
  ]);
  const [bulkProducts, setBulkProducts] = useState(() => [
    buildDefaultBulkRow(),
  ]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [customComponentsError, setCustomComponentsError] = useState("");
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(
    () => new Set(),
  );
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [showProductHistory, setShowProductHistory] = useState(false);
  const [productHistorySort, setProductHistorySort] = useState("default");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { role, displayName, userEmail } = useAuth();
  const isAdmin = isAdminRole(role);

  const normalizeName = (value = "") =>
    value.toString().trim().toLowerCase().replace(/\s+/g, " ");
  const descriptionSuggestions = Array.from(
    new Set(
      items.map((item) => (item.description || "").trim()).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const computeComponentAvailability = (
    productName,
    quantityToBuild,
    availableStockRows,
  ) => {
    const selected = products.find((p) => p.name === productName);
    if (!selected) {
      return { available: [], missing: [] };
    }

    const quantityMultiplier = Math.max(parseInt(quantityToBuild) || 1, 1);

    const rows = (availableStockRows || []).map((row) => ({
      ...row,
      quantity: Number(row.quantity || 0),
    }));

    const list = selected.components.map((component) => {
      const required = Number(component.baseQty || 0) * quantityMultiplier;
      const candidates = (component.name || "")
        .split(/\s+or\s+/i)
        .map((item) => item.trim())
        .filter(Boolean);

      const available = rows
        .filter((row) =>
          candidates.some(
            (candidate) => normalizeName(candidate) === normalizeName(row.name),
          ),
        )
        .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

      return {
        name: component.name,
        required,
        available,
      };
    });

    return {
      available: list.filter((item) => item.available >= item.required),
      missing: list.filter((item) => item.available < item.required),
    };
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");

    // Only set current time if not coming from URL params (no productParam)
    if (!productParam) {
      const now = new Date();
      let hour = now.getHours();
      const minute = now.getMinutes();
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      setTimeHour(hour.toString());
      setTimeMinute(minute < 10 ? `0${minute}` : `${minute}`);
      setTimeAMPM(ampm);
    }

    loadItems();
    loadStockInItems();
  }, [productParam]);

  const loadItems = async () => {
    const data = await fetchProductInController();
    const sanitizedData = data
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        components: Array.isArray(item.components) ? item.components : [],
      }))
      .filter((item) => item.quantity > 0);
    setItems(
      sanitizedData.sort((a, b) =>
        (a.product_name || "").localeCompare(b.product_name || ""),
      ),
    );

    const existingNames = sanitizedData
      .map((item) => item.product_name)
      .filter(Boolean);
    const predefinedNames = products
      .map((product) => product.name)
      .filter(Boolean);
    const unique = Array.from(
      new Set([...predefinedNames, ...existingNames]),
    ).sort();
    setProductSuggestions(unique);
  };

  const DESCRIPTION_TRUNCATE_LIMIT = 120;
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
    setEditingDescriptionId(item.id);
    setEditingDescriptionValue((item.description || "").toString());
  };

  const cancelEditingDescription = () => {
    setEditingDescriptionId(null);
    setEditingDescriptionValue("");
  };

  const saveEditingDescription = async (id) => {
    if (!id) return;
    setIsSavingDescription(true);
    setErrorBar("");
    setSuccessBar("");

    try {
      const result = await updateProductInDescriptionController(
        id,
        editingDescriptionValue,
      );

      if (!result?.success) {
        setErrorBar(result?.message || "Failed to update description.");
        return;
      }

      const updated = result?.data || null;
      setItems((prev) =>
        (prev || []).map((row) =>
          row.id === id
            ? {
                ...row,
                description: updated?.description ?? editingDescriptionValue,
              }
            : row,
        ),
      );

      setSuccessBar("Description updated.");
      cancelEditingDescription();
    } finally {
      setIsSavingDescription(false);
    }
  };

  const loadStockInItems = async () => {
    const data = await fetchParcelItems();
    setStockInItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!selectedProduct) return;
    const selected = products.find(
      (p) => normalizeName(p.name) === normalizeName(selectedProduct),
    );
    if (!selected) {
      setAvailableComponents([]);
      setMissingComponentsForSelected([]);
      setShowComponentStockModal(false);
      return;
    }

    const computed = computeComponentAvailability(
      selectedProduct,
      qty,
      stockInItems,
    );
    setAvailableComponents(computed.available);
    setMissingComponentsForSelected(computed.missing);
    setShowComponentStockModal(true);
  }, [selectedProduct, qty, stockInItems]);

  useEffect(() => {
    const selected = products.find(
      (p) => normalizeName(p.name) === normalizeName(selectedProduct),
    );
    if (selected) {
      setShowCustomComponentsModal(false);
      setCustomComponentsError("");
    }
  }, [selectedProduct]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !qty || !date) return;
    const confirmed = window.confirm(
      "Confirm Product In: Are you sure you want to add this product to stock in?",
    );
    if (!confirmed) return;

    const quantityToAdd = parseInt(qty);
    const normalizedSelectedProduct = selectedProduct.trim();
    const product = products.find(
      (p) => normalizeName(p.name) === normalizeName(normalizedSelectedProduct),
    );

    const time_in = `${timeHour}:${timeMinute} ${timeAMPM}`;
    if (!product) {
      if (!isAdmin) {
        setErrorBar("Only admin can add a new/custom product.");
        return;
      }
      setCustomComponentsError("");
      setShowCustomComponentsModal(true);
      return;
    }

    const components = product.components.map((c) => ({
      name: c.name,
      quantity: c.baseQty * quantityToAdd,
    }));
    await submitProductIn({
      productName: normalizedSelectedProduct,
      quantityToAdd,
      dateValue: date,
      timeInValue: time_in,
      components,
    });
  };

  const handleAddCustomComponentRow = () => {
    setCustomComponents((prev) => [...prev, { name: "", quantity: "" }]);
  };

  const handleRemoveCustomComponentRow = (indexToRemove) => {
    setCustomComponents((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleCustomComponentChange = (indexToUpdate, field, value) => {
    setCustomComponents((prev) =>
      prev.map((component, index) =>
        index === indexToUpdate ? { ...component, [field]: value } : component,
      ),
    );
  };

  const handleSubmitCustomProduct = async () => {
    if (!isAdmin) {
      setCustomComponentsError("Only admin can add a new/custom product.");
      return;
    }
    if (!selectedProduct || !qty || !date) {
      setCustomComponentsError("Fill all required Product In fields first.");
      return;
    }

    const quantityToAdd = parseInt(qty);
    const normalizedSelectedProduct = selectedProduct.trim();
    const time_in = `${timeHour}:${timeMinute} ${timeAMPM}`;
    const components = sanitizeCustomComponents();

    if (components.length === 0) {
      setCustomComponentsError(
        "At least one valid component is required for custom products.",
      );
      return;
    }

    setCustomComponentsError("");
    await submitProductIn({
      productName: normalizedSelectedProduct,
      quantityToAdd,
      dateValue: date,
      timeInValue: time_in,
      components,
    });
  };

  const handleUseAlternatives = async () => {
    if (!alternativeRequest) return;

    setErrorBar("");
    setSuccessBar("");

    const result = await handleAddProductIn(
      alternativeRequest.product_name,
      alternativeRequest.quantity,
      alternativeRequest.date,
      alternativeRequest.time_in,
      alternativeRequest.components,
      {
        description: alternativeRequest.description || description,
        price: totalPrice,
        category: alternativeRequest.category || singleCategory,
      },
      { allowAlternatives: true },
    );

    if (!result?.success) {
      if (result?.missingComponents?.length > 0) {
        setMissing(result.missingComponents);
        setPendingProductInRequest({
          productName: alternativeRequest.product_name,
          quantityToAdd: alternativeRequest.quantity,
          dateValue: alternativeRequest.date,
          timeInValue: alternativeRequest.time_in,
          components: alternativeRequest.components,
          categoryValue: alternativeRequest.category || singleCategory,
        });
        setShowMissingComponentsModal(true);
        setErrorBar("");
        return;
      }
      setErrorBar(result?.message || "Unable to add Product In.");
      return;
    }

    const altText =
      result.usedAlternatives?.length > 0
        ? ` Used alternatives: ${result.usedAlternatives
            .map(
              (item) =>
                `${item.alternative} for ${item.forComponent} (${item.quantity})`,
            )
            .join(", ")}`
        : "";
    setSuccessBar(`Product IN added using alternative materials.${altText}`);
    setAlternativeRequest(null);
    setPendingProductInRequest(null);

    await loadItems();
    await loadStockInItems();

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "Product IN",
      module: "Inventory",
      details: `Added ${alternativeRequest.quantity}x ${alternativeRequest.product_name}`,
    });

    setSelectedProduct("");
    setSingleCategory(PRODUCT_CATEGORIES.OTHER);
    setDescription("");
    setQty(1);
    setPrice(0);
    setProductCode("");
    setDate("");
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    setCustomComponents([{ name: "", quantity: "" }]);
    setCustomComponentsError("");
    setShowCustomComponentsModal(false);
  };

  const handleAddMissingToStockIn = async (payload) => {
    if (
      !payload?.item_name ||
      !payload?.date ||
      Number(payload?.quantity) <= 0
    ) {
      return;
    }

    setIsAddingMissingStock(true);
    try {
      const [timeValue = "1", minuteValue = "00", ampmValue = "AM"] = (
        payload.time_in || "1:00 AM"
      ).split(/[: ]/);

      const result = await handleAddParcelIn({
        name: payload.item_name,
        date: payload.date,
        quantity: Number(payload.quantity),
        timeHour: timeValue,
        timeMinute: minuteValue,
        timeAMPM: ampmValue,
        shipping_mode: payload.shipping_mode || "",
        client_name: payload.client_name || "",
        price: payload.price ?? "",
      });

      if (!result?.newItem) {
        setErrorBar("Unable to add missing component to Stock In.");
        return;
      }

      await loadStockInItems();
      setSuccessBar(
        `Added ${payload.quantity} of ${payload.item_name} to Stock In.`,
      );
    } finally {
      setIsAddingMissingStock(false);
    }
  };

  const retryPendingProductInSubmission = async () => {
    if (!pendingProductInRequest) return;

    setIsRetryingPendingProductIn(true);
    setErrorBar("");
    setSuccessBar("");

    try {
      await submitProductIn(pendingProductInRequest);
    } finally {
      setIsRetryingPendingProductIn(false);
    }
  };

  const getHistoryTimestamp = (row) => {
    const createdAt = Date.parse(row?.created_at || "");
    if (!Number.isNaN(createdAt)) return createdAt;

    const dateTime = Date.parse(`${row?.date || ""} ${row?.time_in || ""}`);
    if (!Number.isNaN(dateTime)) return dateTime;

    return 0;
  };

  const sortedHistoryItems = [...items].sort((a, b) => {
    if (productHistorySort === "newest") {
      return getHistoryTimestamp(b) - getHistoryTimestamp(a);
    }

    if (productHistorySort === "oldest") {
      return getHistoryTimestamp(a) - getHistoryTimestamp(b);
    }

    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedHistoryItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedHistoryItems.length / itemsPerPage);

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

  const formatTo12Hour = (time) => {
    if (!time) return "";
    if (time.includes("AM") || time.includes("PM")) return time;
    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const sanitizeCustomComponents = () =>
    (customComponents || [])
      .map((component) => ({
        name: (component?.name || "").trim(),
        quantity: Number(component?.quantity),
      }))
      .filter((component) => component.name && component.quantity > 0);

  const sanitizeBulkCustomComponents = (rows = []) =>
    (rows || [])
      .map((component) => ({
        name: (component?.name || "").trim(),
        quantity: Number(component?.quantity),
        unit_price:
          component?.unit_price === "" ||
          component?.unit_price === null ||
          component?.unit_price === undefined
            ? 0
            : Number(component?.unit_price),
      }))
      .filter((component) => component.name && component.quantity > 0);

  const submitProductIn = async ({
    productName,
    quantityToAdd,
    dateValue,
    timeInValue,
    components,
    categoryValue,
  }) => {
    setErrorBar("");
    setSuccessBar("");
    setAlternativeRequest(null);

    const result = await handleAddProductIn(
      productName,
      quantityToAdd,
      dateValue,
      timeInValue,
      components,
      {
        description: description.trim(),
        price: totalPrice,
        category: categoryValue || singleCategory,
        product_code: productCode.trim() || null,
      },
    );

    if (!result?.success) {
      if (result?.requiresAlternativeApproval) {
        setAlternativeRequest({
          product_name: productName,
          quantity: quantityToAdd,
          date: dateValue,
          time_in: timeInValue,
          components,
          description: description.trim(),
          category: categoryValue || singleCategory,
          alternatives: result.alternativeOptions || [],
        });
        return;
      }

      if (result?.missingComponents?.length > 0) {
        setMissing(result.missingComponents);
        setPendingProductInRequest({
          productName,
          quantityToAdd,
          dateValue,
          timeInValue,
          components,
          categoryValue: categoryValue || singleCategory,
        });
        setShowMissingComponentsModal(true);
        setErrorBar("");
        return;
      }

      setErrorBar(result?.message || "Unable to add Product In.");
      return;
    }

    const altText =
      result.usedAlternatives?.length > 0
        ? ` Used alternatives: ${result.usedAlternatives
            .map(
              (item) =>
                `${item.alternative} for ${item.forComponent} (${item.quantity})`,
            )
            .join(", ")}`
        : "";
    setSuccessBar(
      `Product IN added and components deducted from Stock In.${altText}`,
    );
    setPendingProductInRequest(null);
    setShowMissingComponentsModal(false);

    await loadItems();
    await loadStockInItems();

    await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "Product IN",
      module: "Inventory",
      details: `Added ${quantityToAdd}x ${productName}`,
    });

    setSelectedProduct("");
    setSingleCategory(PRODUCT_CATEGORIES.OTHER);
    setDescription("");
    setQty(1);
    setPrice(0);
    setProductCode("");
    setDate("");
    setTimeHour("1");
    setTimeMinute("00");
    setTimeAMPM("AM");
    setCustomComponents([{ name: "", quantity: "" }]);
    setCustomComponentsError("");
    setShowCustomComponentsModal(false);
  };

  const handleAddMultipleItems = async (e) => {
    e?.preventDefault?.();
    if (!Array.isArray(bulkProducts) || bulkProducts.length === 0) {
      setErrorBar("Add at least one product row.");
      return;
    }

    const confirmed = window.confirm(
      "Confirm Product In: Add multiple products to stock in?",
    );
    if (!confirmed) return;

    setErrorBar("");
    setSuccessBar("");
    setAlternativeRequest(null);
    setIsBulkSubmitting(true);

    try {
      const payload = [];
      const validationErrors = [];
      const customComponentTopUpMeta = new Map();

      bulkProducts.forEach((row, index) => {
        const productName = (row?.product_name || "").toString().trim();
        const quantityToAdd = Number(row?.quantity || 0);
        const rowDate = (row?.date || "").toString().trim();
        const rowTimeHour = (row?.timeHour || "").toString().trim();
        const rowTimeMinute = (row?.timeMinute || "").toString().trim();
        const rowTimeAMPM = (row?.timeAMPM || "").toString().trim();
        const rowTimeIn = `${rowTimeHour}:${rowTimeMinute} ${rowTimeAMPM}`;

        if (!productName) {
          validationErrors.push(`Row ${index + 1}: missing product name.`);
          return;
        }

        if (!rowDate) {
          validationErrors.push(`Row ${index + 1}: missing date.`);
          return;
        }

        if (!rowTimeHour || !rowTimeMinute || !rowTimeAMPM) {
          validationErrors.push(`Row ${index + 1}: missing time.`);
          return;
        }

        if (quantityToAdd <= 0) {
          validationErrors.push(`Row ${index + 1}: invalid quantity.`);
          return;
        }

        const config = products.find(
          (p) => normalizeName(p.name) === normalizeName(productName),
        );

        let components = [];

        if (config) {
          components = (config.components || []).map((c) => ({
            name: c.name,
            quantity: Number(c.baseQty || 0) * quantityToAdd,
          }));
        } else {
          if (!isAdmin) {
            validationErrors.push(
              `Row ${index + 1}: only admin can add a new/custom product (${productName}).`,
            );
            return;
          }

          const custom = sanitizeBulkCustomComponents(row?.customComponents);
          if (custom.length === 0) {
            validationErrors.push(
              `Row ${index + 1}: custom product needs at least one component (${productName}).`,
            );
            return;
          }

          components = custom.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          }));

          custom.forEach((item) => {
            const key = normalizeName(item.name);
            if (!key || Number(item.unit_price || 0) <= 0) return;
            if (!customComponentTopUpMeta.has(key)) {
              customComponentTopUpMeta.set(key, {
                name: item.name,
                unitPrice: Number(item.unit_price || 0),
                date: rowDate,
                timeHour: rowTimeHour,
                timeMinute: rowTimeMinute,
                timeAMPM: rowTimeAMPM,
              });
            }
          });
        }

        const unitPrice = Number(row?.price || 0);
        const lineTotalPrice = unitPrice * quantityToAdd;

        payload.push({
          product_name: productName,
          quantity: quantityToAdd,
          date: rowDate,
          time_in: rowTimeIn,
          components,
          meta: {
            description: (row?.description || "").toString().trim() || null,
            price: lineTotalPrice,
            category: row?.category || PRODUCT_CATEGORIES.OTHER,
          },
        });
      });

      if (payload.length === 0) {
        setErrorBar(validationErrors.join(" "));
        return;
      }

      const requiredByComponent = new Map();
      payload.forEach((row) => {
        (row.components || []).forEach((component) => {
          const key = normalizeName(component?.name);
          if (!key) return;
          const current = Number(requiredByComponent.get(key) || 0);
          requiredByComponent.set(
            key,
            current + Number(component?.quantity || 0),
          );
        });
      });

      const availableByComponent = (stockInItems || []).reduce((map, row) => {
        const key = normalizeName(row?.name);
        if (!key) return map;
        const current = Number(map.get(key) || 0);
        map.set(key, current + Number(row?.quantity || 0));
        return map;
      }, new Map());

      let autoTopUpCount = 0;
      for (const [componentKey, requiredQty] of requiredByComponent.entries()) {
        const availableQty = Number(availableByComponent.get(componentKey) || 0);
        const missingQty = requiredQty - availableQty;
        if (missingQty <= 0) continue;

        const topUpMeta = customComponentTopUpMeta.get(componentKey);
        if (!topUpMeta) continue;

        const topUpResult = await handleAddParcelIn({
          name: topUpMeta.name,
          date: topUpMeta.date,
          quantity: missingQty,
          timeHour: topUpMeta.timeHour,
          timeMinute: topUpMeta.timeMinute,
          timeAMPM: topUpMeta.timeAMPM,
          shipping_mode: "Auto top-up (bulk custom)",
          client_name: "",
          price: Number(topUpMeta.unitPrice || 0) * Number(missingQty),
          category: CATEGORIES.COMPONENT,
        });

        if (topUpResult?.newItem) {
          availableByComponent.set(componentKey, availableQty + missingQty);
          autoTopUpCount += 1;
        }
      }

      if (autoTopUpCount > 0) {
        await loadStockInItems();
      }

      const result = await handleAddMultipleProductsIn(payload);

      if (validationErrors.length > 0) {
        setErrorBar(validationErrors.join(" "));
      }

      if (!result?.success) {
        setErrorBar(result?.message || "Unable to add multiple products.");
      } else {
        setSuccessBar(result?.message || "Multiple products added.");
      }

      if (Array.isArray(result?.errors) && result.errors.length > 0) {
        const first = result.errors[0];
        const extra =
          first?.missingComponents?.length > 0
            ? ` Missing: ${first.missingComponents
                .map((c) => c?.component || c?.name)
                .filter(Boolean)
                .join(", ")}.`
            : "";
        setErrorBar(
          `${result.message || "Some products failed."} First error: ${first.product} - ${first.error}.${extra}`,
        );
      }

      await loadItems();
      await loadStockInItems();

      await logActivity({
      userId: userEmail || null,
      userName: displayName || userEmail || "Unknown User",
      userType: role || "staff",
      action: "Product IN (Multiple)",
      module: "Inventory",
      details: payload.map((p) => `${p.quantity}x ${p.product_name}`).join(", "),
    });

      setBulkProducts([buildDefaultBulkRow()]);
    } catch (error) {
      console.error("handleAddMultipleItems error:", error);
      setErrorBar("Multiple Product In failed unexpectedly. Please try again.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const selectedProductConfig = products.find(
    (p) => normalizeName(p.name) === normalizeName(selectedProduct),
  );
  const noDefinedComponents =
    (selectedProductConfig?.components || []).length === 0;

  const TABLE_COLUMNS = [
    { label: "PRODUCT CODE", thClass: "text-center w-[140px] min-w-[140px]" },
    { label: "PRODUCT NAME", thClass: "text-center w-[150px] min-w-[150px]" },
    { label: "SKU", thClass: "text-center w-[130px] min-w-[130px]" },
    { label: "DESCRIPTION", thClass: "text-left  w-[320px] min-w-[280px]" },
    { label: "QUANTITY", thClass: "text-center w-[100px] min-w-[100px]" },
    { label: "DATE", thClass: "text-center w-[120px] min-w-[120px]" },
    { label: "TIME IN", thClass: "text-center w-[110px] min-w-[110px]" },
    { label: "COMPONENTS", thClass: "text-center w-[180px] min-w-[150px]" },
  ];

  return (
    <AuthGuard darkMode={darkMode}>
      <div
        className={`flex flex-col w-full h-screen overflow-hidden ${
          darkMode ? "dark bg-[#0B0B0B] text-white" : "bg-[#F9FAFB] text-black"
        }`}
      >
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

        <Sidebar
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 overflow-y-auto pt-20 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : ""
          } ${darkMode ? "bg-[#0B0B0B]" : "bg-[#F9FAFB]"}`}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-8">
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
                  <h1 className="text-3xl font-bold tracking-wide">
                    Product In
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
                Record new products added to your inventory
              </p>
            </div>

            {!showMultipleInput && (
              <form
                onSubmit={handleAddItem}
                className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                {errorBar && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-[#D1D5DB]"
                        : "bg-[#F9FAFB] border-[#E5E7EB] text-[#374151]"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>{errorBar}</span>
                  </div>
                )}

                {successBar && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      darkMode
                        ? "bg-green-900/20 border-green-800 text-green-300"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {successBar}
                  </div>
                )}

                {alternativeRequest && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      darkMode
                        ? "bg-yellow-900/20 border-yellow-800 text-yellow-300"
                        : "bg-yellow-50 border-yellow-200 text-yellow-700"
                    }`}
                  >
                    <p className="mb-2 font-semibold">
                      Alternative material available in Stock In.
                    </p>
                    <p className="mb-3">
                      {alternativeRequest.alternatives
                        .map((item) => {
                          const suggestions = item.suggestions
                            .map((alt) => `${alt.name} (${alt.available})`)
                            .join(", ");
                          return `${item.component}: ${suggestions}`;
                        })
                        .join(" | ")}
                    </p>
                    <button
                      type="button"
                      onClick={handleUseAlternatives}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Use Alternatives
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-6">
                  <Plus className={`w-5 h-5 ${darkMode ? "text-[#3B82F6]" : "text-[#1E3A8A]"}`} />
                  <h2 className="text-lg font-semibold">Add Product IN</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Product Name
                    </label>
                    <input
                      type="text"
                      placeholder="Type or select product"
                      value={selectedProduct}
                      onChange={(e) => {
                        setSelectedProduct(e.target.value);
                        setPrice(0);
                      }}
                      list="product-in-suggestions"
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                    <datalist id="product-in-suggestions">
                      {productSuggestions.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                    {selectedProduct && (
                      <p
                        className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                      >
                        Current Stock: {currentStock}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Enter product description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      list="product-in-description-suggestions"
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    />
                    <datalist id="product-in-description-suggestions">
                      {descriptionSuggestions.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Product Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      } min-w-[120px]`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Category
                    </label>
                    <select
                      value={singleCategory}
                      onChange={(e) => setSingleCategory(e.target.value)}
                      className={`border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    >
                      {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
                      }`}
                    >
                      Time In
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={timeHour}
                        onChange={(e) => setTimeHour(e.target.value)}
                        className={`border rounded-lg px-2 py-2 flex-1 min-w-[50px] focus:outline-none focus:ring-2 transition-all ${
                          darkMode
                            ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                            : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
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
                        className={`border rounded-lg px-2 py-2 flex-1 min-w-[50px] focus:outline-none focus:ring-2 transition-all ${
                          darkMode
                            ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                            : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
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
                        className={`border rounded-lg px-2 py-2 w-[60px] min-w-[60px] shrink-0 focus:outline-none focus:ring-2 transition-all ${
                          darkMode
                            ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                            : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                        }`}
                      >
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMultipleInput(true)}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Multiple Product Input
                  </button>
                  <button
                    type="submit"
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" /> Add Product
                  </button>
                </div>
              </form>
            )}

            {showMultipleInput && (
              <div
                className={`p-6 rounded-xl shadow-lg mb-8 border transition animate__animated animate__fadeInUp animate__faster ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Multiple Product Input
                    </h2>
                    <p
                      className={`text-xs ${
                        darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                      }`}
                    >
                      Add multiple products in one submission with per-row date
                      and time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMultipleInput(false)}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Back to Single Product
                  </button>
                </div>

                <MultipleProductInput
                  products={bulkProducts}
                  setProducts={setBulkProducts}
                  productSuggestions={productSuggestions}
                  items={items}
                  normalizeName={normalizeName}
                  computeComponentAvailability={computeComponentAvailability}
                  darkMode={darkMode}
                />

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={handleAddMultipleItems}
                    disabled={isBulkSubmitting}
                    className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all duration-200 hover:shadow-lg ${
                      isBulkSubmitting
                        ? darkMode
                          ? "bg-[#374151] text-[#9CA3AF] cursor-not-allowed"
                          : "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                        : "bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white"
                    }`}
                  >
                    <Plus className="w-5 h-5" /> Add Multiple Products
                  </button>
                </div>
              </div>
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
                  onClick={() => setShowProductHistory((prev) => !prev)}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    darkMode
                      ? "bg-[#111827] text-[#D1D5DB] hover:bg-[#1F2937]"
                      : "bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {showProductHistory ? "hide" : "show"}
                </button>
              </div>
            )}

            {isAdmin && showProductHistory && (
              <div
                className={`rounded-xl shadow-xl overflow-hidden border transition animate__animated animate__fadeInUp animate__fast ${
                  darkMode
                    ? "bg-[#1F2937] border-[#374151]"
                    : "bg-white border-[#E5E7EB]"
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse">
                    <thead
                      className={`${
                        darkMode
                          ? "bg-[#111827] text-[#D1D5DB]"
                          : "bg-[#F9FAFB] text-[#374151]"
                      }`}
                    >
                      <tr>
                        {TABLE_COLUMNS.map(({ label, thClass }) => (
                          <th
                            key={label}
                            className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${thClass}`}
                          >
                            {label}
                          </th>
                        ))}
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
                            colSpan={TABLE_COLUMNS.length}
                            className={`text-center p-8 sm:p-12 ${
                              darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                            } animate__animated animate__fadeIn`}
                          >
                            <PackageCheck
                              className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 animate__animated animate__fadeIn ${
                                darkMode ? "text-[#6B7280]" : "text-[#D1D5DB]"
                              }`}
                            />
                            <p className="text-base sm:text-lg font-medium mb-1">
                              No products added yet
                            </p>
                            <p className="text-xs sm:text-sm opacity-75">
                              Add your first product using the form above
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
                            <td className="px-4 py-3 text-center align-middle text-xs sm:text-sm whitespace-nowrap w-[140px] min-w-[140px]">
                              {item.product_code || buildProductCode(item)}
                            </td>

                            <td className="px-4 py-3 text-center align-middle font-semibold text-sm sm:text-base whitespace-nowrap w-[150px] min-w-[150px]">
                              {item.product_name}
                            </td>

                            <td className="px-4 py-3 text-center align-middle text-xs sm:text-sm whitespace-nowrap w-[130px] min-w-[130px]">
                              {buildSku(item)}
                            </td>

                            <td className="px-4 py-3 align-middle text-xs sm:text-sm w-[320px] min-w-[280px]">
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
                                      onClick={() =>
                                        saveEditingDescription(item.id)
                                      }
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
                                    className={`flex-1 text-left leading-snug ${
                                      (item.description || "").toString().trim()
                                        ? "cursor-pointer"
                                        : "cursor-default"
                                    }`}
                                    onClick={() => {
                                      const text = (item.description || "")
                                        .toString()
                                        .trim();
                                      if (!text) return;
                                      toggleDescriptionExpanded(item.id);
                                    }}
                                    title={
                                      expandedDescriptionIds.has(item.id)
                                        ? "Click to collapse"
                                        : "Click to expand"
                                    }
                                  >
                                    {(() => {
                                      const raw = (item.description || "")
                                        .toString()
                                        .trim();
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

                                      if (
                                        expandedDescriptionIds.has(item.id)
                                      ) {
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
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditingDescription(item)
                                    }
                                    className={`p-2 rounded-lg border transition ${
                                      darkMode
                                        ? "border-[#374151] hover:bg-[#374151]/60"
                                        : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                    }`}
                                    title="Edit description"
                                  >
                                    <PencilLine className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center align-middle w-[100px] min-w-[100px]">
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

                            <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm w-[120px] min-w-[120px]">
                              {item.date}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-center align-middle text-xs sm:text-sm w-[110px] min-w-[110px]">
                              <div className="flex items-center justify-center gap-1.5">
                                <Clock size={13} />
                                {formatTo12Hour(item.time_in)}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center align-middle w-[180px] min-w-[150px]">
                              {item.components.length > 0 ? (
                                <div className="flex flex-wrap justify-center gap-1">
                                  {item.components.map((c, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        darkMode
                                          ? "bg-blue-800 text-blue-100"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {c.quantity} - {c.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span
                                  className={
                                    darkMode ? "text-gray-500" : "text-gray-400"
                                  }
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {sortedHistoryItems.length > itemsPerPage && (
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-t ${
                      darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-sm ${
                          darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                        }`}
                      >
                        Showing {indexOfFirstItem + 1} to{" "}
                        {Math.min(indexOfLastItem, sortedHistoryItems.length)} of{" "}
                        {sortedHistoryItems.length} entries
                      </div>
                      <select
                        value={productHistorySort}
                        onChange={(e) => {
                          setProductHistorySort(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`text-xs border rounded-lg px-2 py-1.5 ${
                          darkMode
                            ? "bg-[#111827] border-[#374151] text-white"
                            : "bg-white border-[#D1D5DB] text-[#111827]"
                        }`}
                      >
                        <option value="default">Default</option>
                        <option value="newest">Newest to Oldest</option>
                        <option value="oldest">Oldest to Newest</option>
                      </select>
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
            )}
          </div>
        </main>
      </div>

      <MissingComponentsModal
        show={showMissingComponentsModal}
        onClose={() => setShowMissingComponentsModal(false)}
        missingComponents={missing}
        darkMode={darkMode}
        onAddToStockIn={handleAddMissingToStockIn}
        isAdding={isAddingMissingStock}
        onRetryProductIn={retryPendingProductInSubmission}
        hasPendingProductIn={Boolean(pendingProductInRequest)}
        isRetryingProductIn={isRetryingPendingProductIn}
      />

      {showCustomComponentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCustomComponentsModal(false)}
          ></div>
          <div
            className={`relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl ${
              darkMode
                ? "bg-[#1F2937] border-[#374151] text-white"
                : "bg-white border-[#E5E7EB] text-black"
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}
            >
              <h2 className="text-lg font-semibold">
                Add Components for {selectedProduct}
              </h2>
              <button
                type="button"
                onClick={() => setShowCustomComponentsModal(false)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  darkMode
                    ? "bg-[#374151] hover:bg-[#4B5563]"
                    : "bg-[#F3F4F6] hover:bg-[#E5E7EB]"
                }`}
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p
                className={`text-sm ${
                  darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                }`}
              >
                Custom product detected. Add required components before submit.
              </p>
              {customComponentsError && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    darkMode
                      ? "bg-red-900/20 border-red-800 text-red-300"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {customComponentsError}
                </div>
              )}
              <div className="space-y-2">
                {customComponents.map((component, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={component.name}
                      onChange={(e) =>
                        handleCustomComponentChange(
                          index,
                          "name",
                          e.target.value,
                        )
                      }
                      placeholder="Component name"
                      className={`col-span-7 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    />
                    <input
                      type="number"
                      min="1"
                      value={component.quantity}
                      onChange={(e) =>
                        handleCustomComponentChange(
                          index,
                          "quantity",
                          e.target.value,
                        )
                      }
                      placeholder="Qty"
                      className={`col-span-3 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all ${
                        darkMode
                          ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
                          : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomComponentRow(index)}
                      disabled={customComponents.length === 1}
                      className={`col-span-2 rounded-lg px-2 py-2 text-sm font-medium ${
                        customComponents.length === 1
                          ? darkMode
                            ? "bg-[#374151] text-[#6B7280] cursor-not-allowed"
                            : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                          : darkMode
                            ? "bg-red-900/30 text-red-200 hover:bg-red-900/40"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddCustomComponentRow}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    darkMode
                      ? "bg-[#374151] hover:bg-[#4B5563]"
                      : "bg-[#F3F4F6] hover:bg-[#E5E7EB]"
                  }`}
                >
                  + Add Component
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCustomProduct}
                  className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-lg font-medium"
                >
                  Save and Submit Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showComponentStockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowComponentStockModal(false)}
          ></div>
          <div
            className={`relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl ${
              darkMode
                ? "bg-[#1F2937] border-[#374151] text-white"
                : "bg-white border-[#E5E7EB] text-black"
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={darkMode ? "/logo.png" : "/logo2.png"}
                  alt="Logo"
                  className="w-9 h-9 object-contain rounded-md"
                />
                <h2 className="text-lg font-semibold">
                  {selectedProduct} Components Availability
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowComponentStockModal(false)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  darkMode
                    ? "bg-[#374151] hover:bg-[#4B5563]"
                    : "bg-[#F3F4F6] hover:bg-[#E5E7EB]"
                }`}
              >
                Close
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2 text-green-600">
                  Available Stocks
                </h3>
                {availableComponents.length === 0 ? (
                  <p
                    className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                  >
                    No fully available components.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableComponents.map((item) => (
                      <div
                        key={item.name}
                        className={`rounded-lg border p-2 text-sm ${
                          darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                        }`}
                      >
                        <div
                          className={`font-medium ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {item.name}
                        </div>
                        <div
                          className={
                            darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          }
                        >
                          {item.available}/{item.required}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-red-500">
                  Missing / Kulang Stocks
                </h3>
                {missingComponentsForSelected.length === 0 ? (
                  <p
                    className={`text-sm ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                  >
                    {noDefinedComponents
                      ? "No predefined components for this product."
                      : "Complete lahat ng components."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missingComponentsForSelected.map((item) => (
                      <div
                        key={item.name}
                        className={`rounded-lg border p-2 text-sm ${
                          darkMode ? "border-[#374151]" : "border-[#E5E7EB]"
                        }`}
                      >
                        <div
                          className={`font-medium ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {item.name}
                        </div>
                        <div
                          className={
                            darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"
                          }
                        >
                          {item.available}/{item.required}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}