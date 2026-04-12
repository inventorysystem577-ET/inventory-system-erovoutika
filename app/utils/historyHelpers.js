export const getHistoryTimestamp = (row) => {
  const createdAt = Date.parse(row?.created_at || "");
  if (!Number.isNaN(createdAt)) return createdAt;

  const dateTime = Date.parse(
    `${row?.date || ""} ${row?.time_in || row?.time || ""}`,
  );
  if (!Number.isNaN(dateTime)) return dateTime;

  return 0;
};

export const sortByHistoryDate = (items = [], sortOrder = "default") => {
  if (sortOrder === "default") return [...items];
  return [...items].sort((a, b) => {
    if (sortOrder === "newest") {
      return getHistoryTimestamp(b) - getHistoryTimestamp(a);
    }
    if (sortOrder === "oldest") {
      return getHistoryTimestamp(a) - getHistoryTimestamp(b);
    }
    return 0;
  });
};
