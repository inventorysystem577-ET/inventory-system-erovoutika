"use client";

export default function DashboardSummaryCard({
  onClick,
  containerClassName,
  Icon,
  MetaIcon,
  title,
  value,
  subtitle,
  animationDelay = "0s",
}) {
  return (
    <div
      onClick={onClick}
      className={`text-white p-6 rounded-xl shadow-lg animate__animated animate__fadeInUp cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-2xl active:scale-95 ${containerClassName}`}
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-10 h-10" />
        <MetaIcon className="w-5 h-5 opacity-70" />
      </div>
      <h3 className="text-sm font-medium opacity-90 mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-xs opacity-75">{subtitle}</p>
    </div>
  );
}
