import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ViewportSizeLayoutProps {
  children: ReactNode;
}

function useViewportDifference(): number {
  const [difference, setDifference] = useState(0);

  useEffect(() => {
    // Use visualViewport api to track available height even on iOS virtual keyboard opening
    const onResize = () => {
      if (typeof window === "undefined") return;

      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const newDifference = window.innerHeight - viewportHeight;

      setDifference(newDifference);
    };

    // Initial calculation
    onResize();

    if (!window.visualViewport) {
      window.addEventListener("resize", onResize);
    } else {
      window.visualViewport.addEventListener("resize", onResize);
    }

    return () => {
      if (!window.visualViewport) {
        window.removeEventListener("resize", onResize);
      } else {
        window.visualViewport.removeEventListener("resize", onResize);
      }
    };
  }, []);

  return difference;
}

function getViewportSize() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return {
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  };
}

function useViewportSize(): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState(() => getViewportSize());

  useEffect(() => {
    // Use visualViewport api to track available height even on iOS virtual keyboard opening
    const onResize = () => {
      setSize((prevSize) => {
        const newSize = getViewportSize();

        if (
          newSize.width === prevSize.width &&
          newSize.height === prevSize.height
        ) {
          return prevSize;
        }
        return newSize;
      });
    };

    // Initial measurement
    onResize();

    if (!window.visualViewport) {
      window.addEventListener("resize", onResize);
    } else {
      window.visualViewport.addEventListener("resize", onResize);
    }

    return () => {
      if (!window.visualViewport) {
        window.removeEventListener("resize", onResize);
      } else {
        window.visualViewport.removeEventListener("resize", onResize);
      }
    };
  }, []);

  return size;
}

/**
 * ViewportSizeLayout uses the Visual Viewport API to track keyboard open/close events
 * and adjusts the container height accordingly. This ensures content stays above the keyboard.
 *
 * Based on implementation from leaflet repo.
 */
export default function ViewportSizeLayout({
  children,
}: ViewportSizeLayoutProps) {
  const viewheight = useViewportSize().height;
  const difference = useViewportDifference();

  // Apply viewport height when keyboard is significantly open (difference > 50px)
  // This works on both iOS and Android with visualViewport API
  const keyboardOpen = difference > 50;
  const calculatedHeight = keyboardOpen
    ? `${viewheight}px`
    : "calc(100% + env(safe-area-inset-top))";

  // Update CSS custom property on document root
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--viewport-height",
        calculatedHeight
      );
    }
  }, [calculatedHeight]);

  return (
    <div
      style={{
        minHeight: calculatedHeight,
        display: "flex",
        flexDirection: "column",
        overscrollBehavior: "none",
      }}
    >
      {children}
    </div>
  );
}
