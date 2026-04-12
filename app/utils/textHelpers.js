export const truncateText = (value, maxLength) => {
  const text = (value || "").toString().trim();
  if (!text) return { text: "", isTruncated: false };
  if (text.length <= maxLength) return { text, isTruncated: false };
  return {
    text: `${text.slice(0, maxLength).trimEnd()}...`,
    isTruncated: true,
  };
};
