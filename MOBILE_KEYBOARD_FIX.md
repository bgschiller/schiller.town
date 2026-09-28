# Mobile Keyboard Viewport Fix

## Problem

On mobile devices (Android and iOS), focusing the document editor and opening the
virtual keyboard produced a grey gap between the editing area and the keyboard,
below the editing command bar. The page used a fixed-height flex layout with a
bottom command bar and a custom Visual Viewport-based height adjustment. When the
browser scrolled the focused caret into view, the app shell's height no longer
matched the visible viewport, leaving body background showing in the gap.

## Solution

The editor now uses the browser's natural document scrolling instead of a fixed-height
app shell:

- **Command bar is sticky at the top** (`position: sticky; top: 0`) so it stays
  visible while the keyboard is open, without any manual keyboard/viewport tracking.
- **The document sheet scrolls with the page** (no inner `overflow-y` scroll area),
  so the browser's built-in keyboard/focus scrolling behaves normally.
- **The header (back button, presence indicator, logout) is hidden on mobile** to make
  room for the command bar at the top. It remains visible on desktop.
- **Removed `ViewportSizeLayout`** from `app/root.tsx` and deleted the component. This
  was the Visual Viewport height adjustment that caused the grey gap. The global
  `html, body` height rules were relaxed to `min-height: 100%` so pages scroll naturally.

## Key Technical Details

The document sheet (`.container`) has `min-height: 100vh`, so its white background always
extends at least to the full layout viewport height. When the keyboard opens, the visual
viewport shrinks but the layout viewport (and `100vh`) do not, so the sheet still covers
the area behind the keyboard and no grey body background appears above it.

## Files Modified

- `app/root.tsx` - Removed `ViewportSizeLayout` wrapper
- `app/components/ViewportSizeLayout.tsx` - Deleted
- `app/routes/docs.$slug.tsx` - Moved command bar to sticky top, natural scroll layout, hid header on mobile
- `public/styles/root.css` - Relaxed `html, body` height to `min-height: 100%`

## Testing

1. Open the app on a mobile device
2. Navigate to a document
3. Tap in the editor to open the keyboard
4. Verify:
   - The command bar stays visible at the top
   - No grey gap appears between the editing area and the keyboard
   - The page scrolls normally while typing
   - The header (back/presence/logout) is hidden on mobile
   - Dismissing the keyboard restores the normal page
