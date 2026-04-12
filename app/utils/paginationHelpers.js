export const getPageNumbers = (currentPage, totalPages) => {
  const pageNumbers = [];
  const maxPagesToShow = 5;

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i += 1) pageNumbers.push(i);
    return pageNumbers;
  }

  if (currentPage <= 3) {
    for (let i = 1; i <= 4; i += 1) pageNumbers.push(i);
    pageNumbers.push("...");
    pageNumbers.push(totalPages);
    return pageNumbers;
  }

  if (currentPage >= totalPages - 2) {
    pageNumbers.push(1);
    pageNumbers.push("...");
    for (let i = totalPages - 3; i <= totalPages; i += 1) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  }

  pageNumbers.push(1);
  pageNumbers.push("...");
  pageNumbers.push(currentPage - 1);
  pageNumbers.push(currentPage);
  pageNumbers.push(currentPage + 1);
  pageNumbers.push("...");
  pageNumbers.push(totalPages);
  return pageNumbers;
};
