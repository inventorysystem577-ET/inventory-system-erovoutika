"use client";

export default function DashboardStatusCard({
  onClick,
  darkMode,
  Icon,
  iconClassName,
  badge,
  title,
  value,
  total,
  barClassName,
  animationDelay = "0s",
}) {
  const width = total > 0 ? (value / total) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-xl shadow-lg animate__animated animate__fadeInUp cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 ${
        darkMode
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }`}
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-6 h-6 ${iconClassName}`} />
        <p className="text-xs text-gray-500">{badge}</p>
      </div>
      <p
        className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {title}
      </p>
      <p className="text-2xl font-bold">{value}</p>
      <div className="mt-2 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${barClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
