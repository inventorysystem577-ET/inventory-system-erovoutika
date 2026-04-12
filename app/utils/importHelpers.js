export const parseExcelDate = (value) => {
  if (!value && value !== 0) return new Date().toISOString().split("T")[0];
  if (typeof value === "string" && value.includes("-")) return value;
  if (typeof value === "string" && value.includes("/")) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  const num = Number(value);
  if (!isNaN(num) && num > 1000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
};
