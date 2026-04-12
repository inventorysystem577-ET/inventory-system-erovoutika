import React from "react";
import { Calendar, Clock, Minus, Package, Truck } from "lucide-react";
import { CATEGORIES, CATEGORY_OPTIONS } from "../utils/categoryUtils";
import StockTimePicker from "./StockTimePicker";
import StockCategorySelect from "./StockCategorySelect";

export default function StockOutBulkRow({
  row,
  index,
  onChange,
  onRemove,
  darkMode,
  availableItems,
}) {
  const inputClass = `border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
    darkMode
      ? "border-[#374151] focus:ring-[#F97316] focus:border-[#F97316] bg-[#111827] text-white"
      : "border-[#D1D5DB] focus:ring-[#EA580C] focus:border-[#EA580C] bg-white text-black"
  }`;

  const labelClass = `text-sm font-medium mb-2 flex items-center gap-1.5 ${
    darkMode ? "text-[#D1D5DB]" : "text-[#374151]"
  }`;

  const selectedItem = availableItems.find((item) => item.name === row.item_name);
  const maxQuantity = Number(selectedItem?.quantity || 0);
  const timeChange = (field, value) => onChange(index, field, value);

  return (
    <div
      className={`p-4 rounded-lg border ${
        darkMode ? "border-[#374151] bg-[#111827]/60" : "border-[#E5E7EB] bg-[#FFF7ED]"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">Row {index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C]"
        >
          <Minus className="w-3.5 h-3.5" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Item Name
          </label>
          <select
            value={row.item_name}
            onChange={(e) => onChange(index, "item_name", e.target.value)}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Please select
            </option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} (Stock: {item.quantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            <Calendar className="w-4 h-4" /> Date
          </label>
          <input
            type="date"
            value={row.date}
            onChange={(e) => onChange(index, "date", e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Quantity
          </label>
          <input
            type="number"
            min="1"
            max={maxQuantity || 1}
            value={row.quantity}
            onChange={(e) => onChange(index, "quantity", e.target.value)}
            disabled={!row.item_name || maxQuantity <= 0}
            className={`${inputClass} ${
              !row.item_name || maxQuantity <= 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            required
          />
          {row.item_name && (
            <p className={`text-xs mt-1 ${darkMode ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}>
              Available: {maxQuantity} units
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            <Clock className="w-4 h-4" /> Time Out
          </label>
          <StockTimePicker
            darkMode={darkMode}
            accent="orange"
            timeHour={row.timeHour}
            timeMinute={row.timeMinute}
            timeAMPM={row.timeAMPM}
            onChange={timeChange}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Package className="w-4 h-4" /> Category
          </label>
          <StockCategorySelect
            darkMode={darkMode}
            accent="orange"
            value={row.category || CATEGORIES.OTHERS}
            onChange={(value) => onChange(index, "category", value)}
            options={CATEGORY_OPTIONS}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Truck className="w-4 h-4" /> Shipping Mode
          </label>
          <input
            type="text"
            value={row.shipping_mode}
            onChange={(e) => onChange(index, "shipping_mode", e.target.value)}
            placeholder="Shopee (J&T)"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Client Name</label>
          <input
            type="text"
            value={row.client_name}
            onChange={(e) => onChange(index, "client_name", e.target.value)}
            placeholder="Client name"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.price}
            onChange={(e) => onChange(index, "price", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
