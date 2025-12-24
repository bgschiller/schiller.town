# Mobile Keyboard Viewport Fix

## Problem

On mobile devices (especially Android), when the virtual keyboard opens:

1. The page would not resize to accommodate the reduced viewport
2. Users could scroll the entire page out of view ("scroll chaining")
3. Content would get hidden behind the keyboard

## Solution

We implemented a two-part solution:

### 1. ViewportSizeLayout Component (`app/components/ViewportSizeLayout.tsx`)

Uses the Visual Viewport API to dynamically track keyboard open/close events:

- **Monitors viewport changes**: Listens to `window.visualViewport` resize events
- **Calculates keyboard state**: When `window.innerHeight - visualViewport.height > 50px`, keyboard is considered open
- **Dynamically resizes**: Sets height to actual visible viewport height when keyboard is open
- **Updates CSS variable**: Sets `--viewport-height` custom property for use throughout the app
- **Works cross-platform**: Supports both iOS and Android

### 2. TouchScrollControl Component (`app/components/TouchScrollControl.tsx`)

Prevents unwanted scroll chaining when user reaches scroll boundaries:

- **Detects scrollable areas**: Identifies when touch is within `.editors-wrapper`
- **Calculates scroll boundaries**: Checks if element is at top or bottom of scroll
- **Prevents chaining**: Uses `preventDefault()` on `touchmove` when:
  - User is outside scrollable areas
  - User is at scroll boundary and trying to scroll further
- **Allows normal scrolling**: Within content boundaries, scrolling works normally

## Key Technical Details

### Visual Viewport API

The Visual Viewport API provides the actual visible viewport dimensions, which change when the keyboard opens:

```javascript
window.visualViewport.height; // Visible height (excludes keyboard)
window.innerHeight; // Layout height (doesn't change)
```

### Scroll Chaining Prevention

Touch events are intercepted at the document level with `capture: true` and `passive: false` to allow `preventDefault()`:

```javascript
document.addEventListener("touchmove", handler, {
  passive: false, // Allows preventDefault()
  capture: true, // Intercepts before reaching elements
});
```

### CSS Custom Properties

The viewport height is exposed as a CSS variable for use in styling:

```css
html,
body {
  height: var(--viewport-height, 100%);
}
```

## Files Modified

- `app/components/ViewportSizeLayout.tsx` - Created viewport tracking component
- `app/components/TouchScrollControl.tsx` - Created touch control component
- `app/root.tsx` - Added both components to app root
- `app/routes/docs.$slug.tsx` - Added `overscroll-behavior: contain` to `.page-wrapper`

## Testing

To test the fix:

1. Open the app on a mobile device
2. Navigate to a document
3. Tap in the editor to open keyboard
4. Verify:
   - Page resizes to show only visible content
   - Can scroll editor content normally
   - Cannot scroll page out of viewport when reaching scroll boundaries
   - Cannot drag/pan non-scrollable areas

## Browser Support

- **Visual Viewport API**: Supported in all modern mobile browsers (iOS Safari 13+, Chrome Android 61+)
- **Touch Events**: Universal support on mobile devices
- **CSS Custom Properties**: Universal support in modern browsers

## Future Improvements

- Could add haptic feedback when reaching scroll boundaries
- Could make the keyboard detection threshold (50px) configurable
- Could extend to support other scrollable areas beyond `.editors-wrapper`
