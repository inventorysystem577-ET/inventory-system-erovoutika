import React from "react";

const FOCUS_STYLES = {
  blue: {
    dark: "focus:ring-[#3B82F6] focus:border-[#3B82F6]",
    light: "focus:ring-[#1E3A8A] focus:border-[#1E3A8A]",
  },
  orange: {
    dark: "focus:ring-[#F97316] focus:border-[#F97316]",
    light: "focus:ring-[#EA580C] focus:border-[#EA580C]",
  },
};

export default function StockCategorySelect({
  darkMode,
  accent = "blue",
  value,
  onChange,
  options,
}) {
  const tone = FOCUS_STYLES[accent] || FOCUS_STYLES.blue;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
        darkMode
          ? `border-[#374151] bg-[#111827] text-white ${tone.dark}`
          : `border-[#D1D5DB] bg-white text-black ${tone.light}`
      }`}
      required
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
