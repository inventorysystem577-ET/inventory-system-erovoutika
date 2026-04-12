export const DEFAULT_STOCK_THRESHOLDS = {
  critical: 5,
  low: 10,
};

export const STOCK_THRESHOLDS_STORAGE_KEY = "inventory-item-thresholds-v1";

export const normalizeItemKey = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const sanitizeThresholds = (value = {}) => {
  const criticalRaw = Number(value.critical);
  const lowRaw = Number(value.low);

  const critical = Number.isFinite(criticalRaw)
    ? Math.max(1, Math.floor(criticalRaw))
    : DEFAULT_STOCK_THRESHOLDS.critical;

  let low = Number.isFinite(lowRaw)
    ? Math.max(2, Math.floor(lowRaw))
    : DEFAULT_STOCK_THRESHOLDS.low;

  if (low <= critical) low = critical + 1;

  return { critical, low };
};

export const getThresholdKey = (type, item) => {
  const baseName = type === "parcel" ? item?.name : item?.product_name;
  return `${type}:${normalizeItemKey(baseName)}`;
};

export const getStockStatus = (
  quantity,
  threshold = DEFAULT_STOCK_THRESHOLDS,
) => {
  const qty = Number(quantity || 0);
  const normalizedThreshold = sanitizeThresholds(threshold);

  if (qty <= 0) return "out";
  if (qty <= normalizedThreshold.critical) return "critical";
  if (qty < normalizedThreshold.low) return "low";
  return "available";
};

export const getStatusLabel = (
  quantity,
  threshold = DEFAULT_STOCK_THRESHOLDS,
) => {
  const status = getStockStatus(quantity, threshold);
  if (status === "out") return "Out of Stock";
  if (status === "critical") return "Critical Level";
  if (status === "low") return "Low Stock";
  return "Well Stocked";
};

export const getStatusColor = (
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

export const getIndicatorColor = (
  quantity,
  threshold = DEFAULT_STOCK_THRESHOLDS,
) => {
  const status = getStockStatus(quantity, threshold);
  if (status === "out") return "bg-[#EF4444]";
  if (status === "critical") return "bg-[#F97316]";
  if (status === "low") return "bg-[#FACC15]";
  return "bg-[#22C55E]";
};

export const matchesStatusFilter = (quantity, threshold, filterValue) => {
  const qty = Number(quantity || 0);
  if (filterValue === "all") return true;
  if (filterValue === "available") return qty > 0;
  if (filterValue === "out") return qty <= 0;

  const status = getStockStatus(qty, threshold);
  return status === filterValue;
};
