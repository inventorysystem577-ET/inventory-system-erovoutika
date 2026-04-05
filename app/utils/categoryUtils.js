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

export const CATEGORY_OPTIONS = [
  { value: CATEGORIES.COMPONENT, label: "Component (electronic components)" },
  { value: CATEGORIES.PRODUCT, label: "Product (finished products)" },
  { value: CATEGORIES.TOOL, label: "Tool (equipment and tools)" },
  { value: CATEGORIES.OTHERS, label: "Others (miscellaneous items)" },
];

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: PRODUCT_CATEGORIES.EROV_PRODUCT, label: "EROV PRODUCT" },
  { value: PRODUCT_CATEGORIES.JSUMO_PRODUCT, label: "JSUMO PRODUCT" },
  { value: PRODUCT_CATEGORIES.ZM_ROBO_PRODUCT, label: "ZM ROBO PRODUCT" },
  { value: PRODUCT_CATEGORIES.OTHER, label: "OTHER" },
];

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

