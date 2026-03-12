export const CATEGORIES = {
  COMPONENT: 'Component',
  PRODUCT: 'Product', 
  TOOL: 'Tool',
  OTHERS: 'Others'
};

export const CATEGORY_OPTIONS = [
  { value: CATEGORIES.COMPONENT, label: 'Component (electronic components)' },
  { value: CATEGORIES.PRODUCT, label: 'Product (full package)' },
  { value: CATEGORIES.TOOL, label: 'Tool (electronic tools and machines)' },
  { value: CATEGORIES.OTHERS, label: 'Others (items lacking specific category)' }
];

export const getCategoryColor = (category) => {
  switch (category) {
    case CATEGORIES.COMPONENT:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case CATEGORIES.PRODUCT:
      return 'bg-green-100 text-green-800 border-green-200';
    case CATEGORIES.TOOL:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case CATEGORIES.OTHERS:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getCategoryIcon = (category) => {
  switch (category) {
    case CATEGORIES.COMPONENT:
      return '⚡';
    case CATEGORIES.PRODUCT:
      return '📦';
    case CATEGORIES.TOOL:
      return '🔧';
    case CATEGORIES.OTHERS:
      return '📋';
    default:
      return '📋';
  }
};
