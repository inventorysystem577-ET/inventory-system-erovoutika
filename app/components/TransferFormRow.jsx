import React from "react";
import { Calendar, Package } from "lucide-react";

export default function TransferFormRow({
  mode = "single",
  row,
  darkMode,
  onFieldChange,
  transferTypeOptions,
  getCategoryOptionsByType,
  remarkOptions,
}) {
  const isSingle = mode === "single";
  const gridClass = isSingle
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 mb-4"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-3.5";

  const inputClass = `border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
    darkMode
      ? "border-[#374151] focus:ring-[#3B82F6] bg-[#111827] text-white"
      : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
  }`;

  const bulkInputClass = `border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition-all ${
    darkMode
      ? "border-[#374151] focus:ring-[#3B82F6] bg-[#1F2937] text-white"
      : "border-[#D1D5DB] focus:ring-[#1E3A8A] bg-white text-black"
  }`;

  const fieldClass = isSingle ? inputClass : bulkInputClass;

  const labelClass = `text-sm font-medium mb-2 flex items-center gap-1.5 ${
    darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
  }`;

  return (
    <div className={gridClass}>
      <div className={isSingle ? "lg:col-span-3" : "lg:col-span-2"}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Item Name
          </label>
        ) : null}
        <input
          type="text"
          value={row.itemName || ""}
          onChange={(e) => onFieldChange("itemName", e.target.value)}
          placeholder="Item Name"
          className={fieldClass}
          required={isSingle}
        />
      </div>

      <div className={isSingle ? "lg:col-span-3" : "lg:col-span-2"}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Purpose (optional)
          </label>
        ) : null}
        <input
          type="text"
          value={row.purpose || ""}
          onChange={(e) => onFieldChange("purpose", e.target.value)}
          placeholder="Purpose (optional)"
          className={fieldClass}
        />
      </div>

      <div className={isSingle ? "lg:col-span-2" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Type
          </label>
        ) : null}
        <select
          value={row.type || "PRODUCT"}
          onChange={(e) => onFieldChange("type", e.target.value)}
          className={fieldClass}
          required={isSingle}
        >
          {transferTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={isSingle ? "lg:col-span-2" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Quantity
          </label>
        ) : null}
        <input
          type="number"
          min="1"
          value={row.quantity || 1}
          onChange={(e) => onFieldChange("quantity", e.target.value)}
          className={fieldClass}
          required={isSingle}
        />
      </div>

      <div className={isSingle ? "lg:col-span-2" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Calendar className="w-4 h-4" /> Date
          </label>
        ) : null}
        <input
          type="date"
          value={row.date || ""}
          onChange={(e) => onFieldChange("date", e.target.value)}
          className={fieldClass}
          required={isSingle}
        />
      </div>

      <div className={isSingle ? "md:col-span-2 lg:col-span-4" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Category
          </label>
        ) : null}
        <select
          value={row.category || ""}
          onChange={(e) => onFieldChange("category", e.target.value)}
          className={fieldClass}
          required={isSingle}
        >
          {getCategoryOptionsByType(row.type || "PRODUCT").map((option) => (
            <option key={`${row.type || "PRODUCT"}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={isSingle ? "md:col-span-2 lg:col-span-4" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Remark
          </label>
        ) : null}
        <select
          value={row.remark || remarkOptions[0]}
          onChange={(e) => onFieldChange("remark", e.target.value)}
          className={fieldClass}
          required={isSingle}
        >
          {remarkOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className={isSingle ? "md:col-span-2 lg:col-span-4" : ""}>
        {isSingle ? (
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Receiver
          </label>
        ) : null}
        <input
          type="text"
          value={row.receiver || ""}
          onChange={(e) => onFieldChange("receiver", e.target.value)}
          placeholder="Receiver"
          className={fieldClass}
          required={isSingle}
        />
      </div>
    </div>
  );
}
