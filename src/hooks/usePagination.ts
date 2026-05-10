import { useState, useMemo } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 10 } = options;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;
  const totalCount = items.length;

  const showMore = () => setVisibleCount((prev) => prev + pageSize);
  const reset = () => setVisibleCount(pageSize);

  return { visibleItems, hasMore, showMore, reset, totalCount, visibleCount };
}
