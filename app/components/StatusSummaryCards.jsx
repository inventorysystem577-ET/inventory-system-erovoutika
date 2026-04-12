import React from "react";
import { Box, AlertTriangle, TrendingDown, XCircle } from "lucide-react";

const CARD_DEFINITIONS = [
  {
    key: "out",
    label: "Out of Stock",
    tag: "Critical",
    icon: XCircle,
    iconClass: "text-[#EF4444]",
    ringClass: "ring-[#EF4444] shadow-[#EF4444]/30",
    hoverLight: "hover:bg-[#FEE2E2]",
    badgeDark: "bg-[#EF4444]/20",
    badgeLight: "bg-[#FEE2E2]",
  },
  {
    key: "critical",
    label: "Critical Level",
    tag: "Alert",
    icon: AlertTriangle,
    iconClass: "text-[#F97316]",
    ringClass: "ring-[#F97316] shadow-[#F97316]/30",
    hoverLight: "hover:bg-[#FFEDD5]",
    badgeDark: "bg-[#F97316]/20",
    badgeLight: "bg-[#FFEDD5]",
  },
  {
    key: "low",
    label: "Low Stock",
    tag: "Warning",
    icon: TrendingDown,
    iconClass: "text-[#FACC15]",
    ringClass: "ring-[#FACC15] shadow-[#FACC15]/30",
    hoverLight: "hover:bg-[#FEF9C3]",
    badgeDark: "bg-[#FACC15]/20",
    badgeLight: "bg-[#FEF9C3]",
  },
  {
    key: "available",
    label: "Available",
    tag: "In-Stock",
    icon: Box,
    iconClass: "text-[#22C55E]",
    ringClass: "ring-[#22C55E] shadow-[#22C55E]/30",
    hoverLight: "hover:bg-[#DCFCE7]",
    badgeDark: "bg-[#22C55E]/20",
    badgeLight: "bg-[#DCFCE7]",
  },
];

export default function StatusSummaryCards({
  darkMode,
  counts,
  activeStatus,
  onSelectStatus,
  animationStart = 0.1,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {CARD_DEFINITIONS.map((card, idx) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.key;

        return (
          <div
            key={card.key}
            onClick={() => onSelectStatus(card.key)}
            className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group ${isActive ? `ring-2 ${card.ringClass} shadow-lg scale-[1.03]` : ""} ${darkMode ? "bg-[#1F2937] border-[#374151] hover:bg-[#374151]" : `bg-white border-[#E5E7EB] ${card.hoverLight}`} animate__animated animate__fadeInUp`}
            style={{ animationDelay: `${animationStart + idx * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${card.iconClass}`} />
              <span
                className={`text-xs px-2 py-1 rounded-full ${darkMode ? card.badgeDark : card.badgeLight} ${card.iconClass}`}
              >
                {card.tag}
              </span>
            </div>
            <p
              className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {card.label}
            </p>
            <p className="text-2xl font-bold">{counts[card.key] || 0}</p>
          </div>
        );
      })}
    </div>
  );
}
