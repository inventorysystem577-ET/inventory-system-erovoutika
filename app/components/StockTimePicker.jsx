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

export default function StockTimePicker({
  darkMode,
  accent = "blue",
  timeHour,
  timeMinute,
  timeAMPM,
  onChange,
}) {
  const tone = FOCUS_STYLES[accent] || FOCUS_STYLES.blue;
  const inputClass = `border rounded-lg px-3 py-2.5 w-full focus:outline-none focus:ring-2 transition-all ${
    darkMode
      ? `border-[#374151] bg-[#111827] text-white ${tone.dark}`
      : `border-[#D1D5DB] bg-white text-black ${tone.light}`
  }`;

  return (
    <div className="flex gap-2">
      <select
        value={timeHour}
        onChange={(e) => onChange("timeHour", e.target.value)}
        className={inputClass}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <select
        value={timeMinute}
        onChange={(e) => onChange("timeMinute", e.target.value)}
        className={inputClass}
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
        value={timeAMPM}
        onChange={(e) => onChange("timeAMPM", e.target.value)}
        className={inputClass}
      >
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}
