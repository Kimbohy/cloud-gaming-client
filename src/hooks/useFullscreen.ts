import { useCallback } from "react";
import type { RefObject } from "react";

export function useFullscreen(containerRef: RefObject<HTMLDivElement>) {
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        try {
          await (
            screen.orientation as {
              lock?: (orientation: string) => Promise<void>;
            }
          ).lock?.("landscape");
        } catch {}
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, [containerRef]);

  return { toggleFullscreen };
}
