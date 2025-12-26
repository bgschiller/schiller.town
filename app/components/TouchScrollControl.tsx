import { useEffect } from "react";

/**
 * TouchScrollControl prevents unwanted scroll chaining on mobile devices.
 * When scrolling reaches the boundary of a scrollable container (like .editors-wrapper),
 * it prevents the scroll from "chaining" to parent elements, which would cause
 * the entire page to be dragged out of the viewport.
 */
export default function TouchScrollControl() {
  useEffect(() => {
    let touchStartY = 0;
    let scrollingElement: HTMLElement | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;

      // Find if we're touching inside a scrollable area
      const target = e.target as HTMLElement;
      const editorsWrapper = target.closest(
        ".editors-wrapper"
      ) as HTMLElement | null;

      if (editorsWrapper) {
        scrollingElement = editorsWrapper;
      } else {
        scrollingElement = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;

      if (!scrollingElement) {
        // Not in a scrollable area - allow normal page scrolling
        return;
      }

      // Check if we're at scroll boundaries
      const atTop = scrollingElement.scrollTop <= 0;
      const atBottom =
        scrollingElement.scrollTop + scrollingElement.clientHeight >=
        scrollingElement.scrollHeight - 1;

      const scrollingUp = deltaY > 0; // finger moving down = scrolling up
      const scrollingDown = deltaY < 0; // finger moving up = scrolling down

      // Prevent scroll chaining when at boundaries
      if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
        e.preventDefault();
        return;
      }

      // Allow normal scrolling within bounds
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });

    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      } as any);
      document.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      } as any);
    };
  }, []);

  return null; // This component doesn't render anything
}
