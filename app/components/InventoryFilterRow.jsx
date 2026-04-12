import React from "react";

export default function InventoryFilterRow({ darkMode, lightFocusClass, filters }) {
  const {
    statusValue,
    onStatusChange,
    totalCount,
    statusCounts,
    categoryValue,
    onCategoryChange,
    categoryOptions,
    searchValue,
    onSearchChange,
    sortValue,
    onSortChange,
  } = filters;

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Filter by Status:
        </label>
        <select
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
            darkMode
              ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white"
              : `border-[#D1D5DB] ${lightFocusClass} bg-white text-black`
          }`}
        >
          <option value="all">All Status ({totalCount})</option>
          <option value="available">Available ({statusCounts.available})</option>
          <option value="low">Low Stock ({statusCounts.low})</option>
          <option value="critical">Critical Level ({statusCounts.critical})</option>
          <option value="out">Out of Stock ({statusCounts.out})</option>
        </select>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Filter by Category:
        </label>
        <select
          value={categoryValue}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
            darkMode
              ? "border-[#374151] focus:ring-[#a78bfa] focus:border-[#a78bfa] bg-[#111827] text-white"
              : `border-[#D1D5DB] ${lightFocusClass} bg-white text-black`
          }`}
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Search:
        </label>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, code, or SKU"
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
            darkMode
              ? "border-[#374151] focus:ring-[#60A5FA] focus:border-[#60A5FA] bg-[#111827] text-white"
              : `border-[#D1D5DB] ${lightFocusClass} bg-white text-black`
          }`}
        />
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Sort by Date:
        </label>
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all text-sm ${
            darkMode
              ? "border-[#374151] focus:ring-[#60A5FA] focus:border-[#60A5FA] bg-[#111827] text-white"
              : `border-[#D1D5DB] ${lightFocusClass} bg-white text-black`
          }`}
        >
          <option value="default">Default</option>
          <option value="newest">Newest to Oldest</option>
          <option value="oldest">Oldest to Newest</option>
        </select>
      </div>
    </div>
  );
}
