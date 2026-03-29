export const CATEGORIES = {
  ELECTRONICS: 'Electronics',
  MERCHANDISE: 'Merchandise',
  TOOLS: 'Tools',
  COMPONENTS: 'Components',
  EROV_PRODUCT: 'EROV_PRODUCT',
  JSUMO_PRODUCT: 'JSUMO_PRODUCT',
  ZM_ROBO_PRODUCT: 'ZM_ROBO_PRODUCT'
};

// Database mapping for constraint compatibility
export const DATABASE_CATEGORY_MAP = {
  'Electronics': 'Component',
  'Merchandise': 'Product',
  'Tools': 'Tool',
  'Components': 'Component',
  'EROV_PRODUCT': 'Component',
  'JSUMO_PRODUCT': 'Product',
  'ZM_ROBO_PRODUCT': 'Tool'
};

export const CATEGORY_OPTIONS = [
  { value: CATEGORIES.ELECTRONICS, label: 'Electronics (electronic devices and gadgets)' },
  { value: CATEGORIES.MERCHANDISE, label: 'Merchandise (jackets, T-shirts, etc.)' },
  { value: CATEGORIES.TOOLS, label: 'Tools (equipment and tools)' },
  { value: CATEGORIES.COMPONENTS, label: 'Components (electronic components)' },
  { value: CATEGORIES.EROV_PRODUCT, label: 'EROV PRODUCT' },
  { value: CATEGORIES.JSUMO_PRODUCT, label: 'JSUMO PRODUCT' },
  { value: CATEGORIES.ZM_ROBO_PRODUCT, label: 'ZM ROBO PRODUCT' }
];

// Helper to get display name from database value
export const getCategoryDisplayName = (category) => {
  const categoryMap = {
    'Component': 'Component',
    'Product': 'Product', 
    'Tool': 'Tool',
    'Others': 'Others'
  };
  return categoryMap[category] || category;
};

export const getCategoryColor = (category) => {
  switch (category) {
    case CATEGORIES.ELECTRONICS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case CATEGORIES.MERCHANDISE:
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case CATEGORIES.TOOLS:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case CATEGORIES.COMPONENTS:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case CATEGORIES.EROV_PRODUCT:
      return 'bg-red-100 text-red-800 border-red-200';
    case CATEGORIES.JSUMO_PRODUCT:
      return 'bg-green-100 text-green-800 border-green-200';
    case CATEGORIES.ZM_ROBO_PRODUCT:
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getCategoryIcon = (category) => {
  switch (category) {
    case CATEGORIES.ELECTRONICS:
      return '📱';
    case CATEGORIES.MERCHANDISE:
      return '👕';
    case CATEGORIES.TOOLS:
      return '🔧';
    case CATEGORIES.COMPONENTS:
      return '⚡';
    case CATEGORIES.EROV_PRODUCT:
      return '🤖';
    case CATEGORIES.JSUMO_PRODUCT:
      return '🦾';
    case CATEGORIES.ZM_ROBO_PRODUCT:
      return '🎯';
    default:
      return '📋';
  }
};
