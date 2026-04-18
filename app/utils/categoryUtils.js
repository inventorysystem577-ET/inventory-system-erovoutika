export const CATEGORIES = {
  COMPONENT: "Component",
  PRODUCT: "Product",
  TOOL: "Tool",
  OTHERS: "Others",
};

export const PRODUCT_CATEGORIES = {
  EROV_PRODUCT: "EROV PRODUCT",
  JSUMO_PRODUCT: "JSUMO PRODUCT",
  ZM_ROBO_PRODUCT: "ZM ROBO PRODUCT",
  OTHER: "OTHER",
};

// Custom categories storage key
const CUSTOM_STOCK_CATEGORIES_KEY = "custom-stock-categories-v1";
const CUSTOM_PRODUCT_CATEGORIES_KEY = "custom-product-categories-v1";

// Get custom stock categories from localStorage
export const getCustomStockCategories = () => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CUSTOM_STOCK_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading custom stock categories:", error);
    return [];
  }
};

// Save custom stock categories to localStorage
export const saveCustomStockCategories = (categories) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_STOCK_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("Error saving custom stock categories:", error);
  }
};

// Get custom product categories from localStorage
export const getCustomProductCategories = () => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CUSTOM_PRODUCT_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading custom product categories:", error);
    return [];
  }
};

// Save custom product categories to localStorage
export const saveCustomProductCategories = (categories) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_PRODUCT_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("Error saving custom product categories:", error);
  }
};

// Add a new custom stock category
export const addCustomStockCategory = (name, icon = "📦") => {
  const custom = getCustomStockCategories();
  if (!custom.find(c => c.value === name)) {
    custom.push({ value: name, label: name, icon });
    saveCustomStockCategories(custom);
  }
  return custom;
};

// Add a new custom product category
export const addCustomProductCategory = (name, icon = "📦") => {
  const custom = getCustomProductCategories();
  if (!custom.find(c => c.value === name)) {
    custom.push({ value: name, label: name, icon });
    saveCustomProductCategories(custom);
  }
  return custom;
};

// Delete a custom stock category
export const deleteCustomStockCategory = (name) => {
  const custom = getCustomStockCategories().filter(c => c.value !== name);
  saveCustomStockCategories(custom);
  return custom;
};

// Delete a custom product category
export const deleteCustomProductCategory = (name) => {
  const custom = getCustomProductCategories().filter(c => c.value !== name);
  saveCustomProductCategories(custom);
  return custom;
};

// Get all stock categories (default + custom)
export const getAllStockCategories = () => {
  const custom = getCustomStockCategories();
  return [
    { value: CATEGORIES.COMPONENT, label: "Component (electronic components)" },
    { value: CATEGORIES.PRODUCT, label: "Product (finished products)" },
    { value: CATEGORIES.TOOL, label: "Tool (equipment and tools)" },
    { value: CATEGORIES.OTHERS, label: "Others (miscellaneous items)" },
    ...custom,
  ];
};

// Get all product categories (default + custom)
export const getAllProductCategories = () => {
  const custom = getCustomProductCategories();
  return [
    { value: PRODUCT_CATEGORIES.EROV_PRODUCT, label: "EROV PRODUCT" },
    { value: PRODUCT_CATEGORIES.JSUMO_PRODUCT, label: "JSUMO PRODUCT" },
    { value: PRODUCT_CATEGORIES.ZM_ROBO_PRODUCT, label: "ZM ROBO PRODUCT" },
    { value: PRODUCT_CATEGORIES.OTHER, label: "OTHER" },
    ...custom,
  ];
};

// Legacy exports for backward compatibility
export const CATEGORY_OPTIONS = getAllStockCategories();
export const PRODUCT_CATEGORY_OPTIONS = getAllProductCategories();

export const getCategoryColor = (category) => {
  switch (category) {
    case PRODUCT_CATEGORIES.EROV_PRODUCT:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case PRODUCT_CATEGORIES.JSUMO_PRODUCT:
      return "bg-orange-100 text-orange-800 border-orange-200";
    case PRODUCT_CATEGORIES.ZM_ROBO_PRODUCT:
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case PRODUCT_CATEGORIES.OTHER:
      return "bg-gray-100 text-gray-800 border-gray-200";
    case CATEGORIES.COMPONENT:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case CATEGORIES.PRODUCT:
      return "bg-green-100 text-green-800 border-green-200";
    case CATEGORIES.TOOL:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case CATEGORIES.OTHERS:
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getCategoryIcon = (category) => {
  switch (category) {
    case PRODUCT_CATEGORIES.EROV_PRODUCT:
      return "🚤";
    case PRODUCT_CATEGORIES.JSUMO_PRODUCT:
      return "🤖";
    case PRODUCT_CATEGORIES.ZM_ROBO_PRODUCT:
      return "🛸";
    case PRODUCT_CATEGORIES.OTHER:
      return "📦";
    case CATEGORIES.COMPONENT:
      return "⚡";
    case CATEGORIES.PRODUCT:
      return "📦";
    case CATEGORIES.TOOL:
      return "🔧";
    case CATEGORIES.OTHERS:
    default:
      return "📋";
  }
};

