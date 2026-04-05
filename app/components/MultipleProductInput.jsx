import React, { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_OPTIONS,
} from "../utils/categoryUtils";

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MultipleProductInput = ({ 
  products, 
  setProducts, 
  productSuggestions, 
  items, 
  normalizeName,
  computeComponentAvailability,
  darkMode,
}) => {
  const addProductField = () => {
    const now = new Date();
    const hour24 = now.getHours();
    const hour12 = hour24 % 12 || 12;
    const minute = `${now.getMinutes()}`.padStart(2, "0");
    const ampm = hour24 >= 12 ? "PM" : "AM";

    setProducts([...products, {
      product_name: "",
      quantity: 1,
      date: getToday(),
      timeHour: `${hour12}`,
      timeMinute: minute,
      timeAMPM: ampm,
      description: "",
      price: 0,
      category: PRODUCT_CATEGORIES.OTHER,
      components: [],
      customComponents: [{ name: "", quantity: "", unit_price: "" }]
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
        newProducts[index].category =
          existingItem.category || PRODUCT_CATEGORIES.OTHER;
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
    newProducts[productIndex].customComponents.push({ name: "", quantity: "", unit_price: "" });
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
        <h3
          className={`text-lg font-semibold flex items-center ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
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
        <div
          key={index}
          className={`border rounded-lg p-4 ${
            darkMode
              ? "border-[#374151] bg-[#111827]"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h4
              className={`text-md font-medium ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Product {index + 1}
            </h4>
            {products.length > 1 && (
              <button
                type="button"
                onClick={() => removeProductField(index)}
                className={`text-red-600 hover:text-red-800 ${
                  darkMode ? "text-red-400 hover:text-red-300" : ""
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Product Name
              </label>
              <input
                type="text"
                list={`product-suggestions-${index}`}
                value={product.product_name}
                onChange={(e) => updateProductField(index, "product_name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
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
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={product.quantity}
                onChange={(e) => updateProductField(index, "quantity", parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </div>

            {/* Price */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.price}
                onChange={(e) => updateProductField(index, "price", parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </div>

            {/* Category */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Category
              </label>
              <select
                value={product.category}
                onChange={(e) => updateProductField(index, "category", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
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
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Description
              </label>
              <input
                type="text"
                value={product.description}
                onChange={(e) => updateProductField(index, "description", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Enter description"
              />
            </div>

            {/* Date */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Date
              </label>
              <input
                type="date"
                value={product.date || ""}
                onChange={(e) => updateProductField(index, "date", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-[#111827] border-[#374151] text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </div>

            {/* Time */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Time In
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={product.timeHour || "1"}
                  onChange={(e) => updateProductField(index, "timeHour", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? "bg-[#111827] border-[#374151] text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={product.timeMinute || "00"}
                  onChange={(e) => updateProductField(index, "timeMinute", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? "bg-[#111827] border-[#374151] text-white"
                      : "bg-white border-gray-300 text-black"
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
                  value={product.timeAMPM || "AM"}
                  onChange={(e) => updateProductField(index, "timeAMPM", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? "bg-[#111827] border-[#374151] text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Components */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label
                className={`block text-sm font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Custom Components
              </label>
              <button
                type="button"
                onClick={() => addCustomComponent(index)}
                className={`text-blue-600 hover:text-blue-800 text-sm ${
                  darkMode ? "text-blue-400 hover:text-blue-300" : ""
                }`}
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Component
              </button>
            </div>
            
            <div className="space-y-2">
              {product.customComponents.map((component, compIndex) => (
                <div key={compIndex} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={component.name}
                    onChange={(e) => updateCustomComponent(index, compIndex, "name", e.target.value)}
                    className={`col-span-6 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="Component name"
                  />
                  <input
                    type="number"
                    min="1"
                    value={component.quantity}
                    onChange={(e) => updateCustomComponent(index, compIndex, "quantity", e.target.value)}
                    className={`col-span-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={component.unit_price || ""}
                    onChange={(e) => updateCustomComponent(index, compIndex, "unit_price", e.target.value)}
                    className={`col-span-3 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode
                        ? "bg-[#111827] border-[#374151] text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                    placeholder="Unit Price"
                  />
                  {product.customComponents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCustomComponent(index, compIndex)}
                      className={`col-span-1 text-red-600 hover:text-red-800 justify-self-center ${
                        darkMode ? "text-red-400 hover:text-red-300" : ""
                      }`}
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
