import { useState, useEffect, type RefObject } from "react";

export function useDevice(_containerRef?: RefObject<HTMLDivElement | null>) {
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024 || "ontouchstart" in window;
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return { isMobile, isFullscreen, setIsFullscreen };
}
