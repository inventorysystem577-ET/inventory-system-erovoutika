import React, { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { CATEGORIES, PRODUCT_CATEGORY_OPTIONS } from "../utils/categoryUtils";

const MultipleProductInput = ({ 
  products, 
  setProducts, 
  productSuggestions, 
  items, 
  normalizeName,
  computeComponentAvailability 
}) => {
  const addProductField = () => {
    setProducts([...products, {
      product_name: "",
      quantity: 1,
      description: "",
      price: 0,
      category: CATEGORIES.OTHERS,
      components: [],
      customComponents: [{ name: "", quantity: "" }]
    }]);
  };

  const removeProductField = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const updateProductField = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    // Auto-populate price and description based on existing items
    if (field === "product_name" && value) {
      const existingItem = items.find(
        (item) => normalizeName(item.product_name) === normalizeName(value)
      );
      
      if (existingItem) {
        newProducts[index].price = existingItem.price || 0;
        newProducts[index].description = existingItem.description || "";
        newProducts[index].category = existingItem.category || CATEGORIES.OTHERS;
      }
    }
    
    setProducts(newProducts);
  };

  const updateCustomComponent = (productIndex, compIndex, field, value) => {
    const newProducts = [...products];
    newProducts[productIndex].customComponents[compIndex] = {
      ...newProducts[productIndex].customComponents[compIndex],
      [field]: value
    };
    setProducts(newProducts);
  };

  const addCustomComponent = (productIndex) => {
    const newProducts = [...products];
    newProducts[productIndex].customComponents.push({ name: "", quantity: "" });
    setProducts(newProducts);
  };

  const removeCustomComponent = (productIndex, compIndex) => {
    const newProducts = [...products];
    newProducts[productIndex].customComponents = newProducts[productIndex].customComponents.filter((_, i) => i !== compIndex);
    setProducts(newProducts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Multiple Product Input
        </h3>
        <button
          type="button"
          onClick={addProductField}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Product
        </button>
      </div>

      {products.map((product, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Product {index + 1}
            </h4>
            {products.length > 1 && (
              <button
                type="button"
                onClick={() => removeProductField(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name
              </label>
              <input
                type="text"
                list={`product-suggestions-${index}`}
                value={product.product_name}
                onChange={(e) => updateProductField(index, "product_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter product name"
              />
              <datalist id={`product-suggestions-${index}`}>
                {productSuggestions.map((suggestion, i) => (
                  <option key={i} value={suggestion} />
                ))}
              </datalist>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={product.quantity}
                onChange={(e) => updateProductField(index, "quantity", parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.price}
                onChange={(e) => updateProductField(index, "price", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={product.category}
                onChange={(e) => updateProductField(index, "category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={product.description}
                onChange={(e) => updateProductField(index, "description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter description"
              />
            </div>
          </div>

          {/* Custom Components */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom Components
              </label>
              <button
                type="button"
                onClick={() => addCustomComponent(index)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Component
              </button>
            </div>
            
            <div className="space-y-2">
              {product.customComponents.map((component, compIndex) => (
                <div key={compIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={component.name}
                    onChange={(e) => updateCustomComponent(index, compIndex, "name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Component name"
                  />
                  <input
                    type="number"
                    min="1"
                    value={component.quantity}
                    onChange={(e) => updateCustomComponent(index, compIndex, "quantity", e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Qty"
                  />
                  {product.customComponents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCustomComponent(index, compIndex)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MultipleProductInput;
