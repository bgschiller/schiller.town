# Mobile Keyboard Viewport Fix

## Problem

On mobile devices (Android and iOS), focusing the document editor and opening the
virtual keyboard produced a grey gap between the editing area and the keyboard,
below the editing command bar. The app used a bottom command bar and a custom
Visual Viewport-based height adjustment (`ViewportSizeLayout`). When the browser
scrolled the focused caret into view, the app shell's height no longer matched the
visible viewport, leaving body background showing in the gap.

## Solution

The editor uses a fixed-height, inner-scroll layout with the command bar at the top:

- **The page itself does not scroll.** `.page-wrapper` is `height: 100%` with
  `overflow: hidden`, and `html, body` are `height: 100%`.
- **The command bar is a fixed (non-scrolling) bar at the top** of the flex column.
  It never scrolls out of view, with or without the keyboard open.
- **Only the editors scroll**, via `.editors-wrapper { overflow-y: auto; flex: 1 }`.
  The browser scrolls the caret into view inside this container when the keyboard
  opens, so there is no visual-viewport offset and no grey gap.
- **The header (back button, presence indicator, logout) is hidden on mobile** to make
  room for the command bar at the top. It remains visible on desktop.
- **Removed `ViewportSizeLayout`** from `app/root.tsx` and deleted the component. This
  was the Visual Viewport height adjustment that caused the grey gap.

## Key Technical Details

The document sheet (`.container`) is a flex child that fills the remaining height
below the command bar. Its white background always covers the full visible area, so
the grey `body` background never appears between the editor and the keyboard.

Because the command bar is a normal flex child at the top (not `position: sticky` or
`position: fixed`), it is not affected by iOS/Android visual-viewport quirks while
the keyboard is open.

## Files Modified

- `app/root.tsx` - Removed `ViewportSizeLayout` wrapper
- `app/components/ViewportSizeLayout.tsx` - Deleted
- `app/routes/docs.$slug.tsx` - Fixed-height inner-scroll layout, top command bar, header hidden on mobile
- `public/styles/root.css` - `html, body` height `100%` for the flex layout

## Testing

1. Open the app on a mobile device
2. Navigate to a document
3. Tap in the editor to open the keyboard
4. Verify:
   - The command bar stays visible at the top while scrolling
   - No grey gap appears between the editing area and the keyboard
   - The editor content scrolls normally while typing
   - The header (back/presence/logout) is hidden on mobile
   - Dismissing the keyboard restores the normal page
