import { useState, useRef, useEffect, useCallback } from "react";

export const useAutoHideHeader = () => {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    setHeaderVisible(currentY <= 10 || currentY < lastScrollY.current);
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const headerClass = (base: string) =>
    `${base} transition-transform duration-300 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`;

  return { headerVisible, headerClass };
};
