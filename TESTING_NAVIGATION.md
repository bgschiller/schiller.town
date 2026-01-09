# Testing the Navigation Fix

## Quick Test (Manual)

1. **Start the dev server**:
   ```bash
   pnpm run dev
   ```

2. **Navigate to the app** in your mobile browser (or desktop with DevTools mobile emulation)

3. **Test document switching**:
   - Click on any document (e.g., "Groceries")
   - Wait for it to load
   - Click "← Back to documents"
   - Click on a DIFFERENT document (e.g., "Shopping List")
   - **Expected**: Document loads and shows content (may briefly show "Loading editor...")
   - **Bug (if not fixed)**: Document shows empty title and empty body

4. **Test rapid switching**:
   - Navigate between 3-4 different documents quickly
   - Each should load with its correct content
   - No empty states should persist

5. **Test mobile keyboard** (on actual mobile device):
   - Open a document
   - Tap in the content area to bring up keyboard
   - Navigate to a different document
   - Verify keyboard behavior is correct and content loads

## What You Should See

### Loading State
When switching documents, you should briefly see:
```
Loading editor...
```

This is normal and indicates the system is:
1. Destroying the old Yjs connection
2. Creating a new Yjs connection
3. Syncing with the server
4. Waiting for initial content to arrive

### Loaded State
After 100-500ms (depending on network), you should see:
- Document title (populated)
- Document content (populated)
- Presence indicators
- Command bar at the bottom

### What Should NOT Happen
- ❌ Empty title that stays empty
- ❌ Empty content area that stays empty
- ❌ Need to refresh to see content
- ❌ Content from the previous document appearing briefly

## Technical Validation

### Browser DevTools Console
You should NOT see any errors like:
- `TypeError: Cannot read property of null`
- `Editor not initialized`
- WebSocket connection errors

### Network Tab
When switching documents, you should see:
1. WebSocket connection to `/parties/yjs-server/{documentId}`
2. HTTP request to `/api/documents/{slug}`
3. WebSocket messages exchanging Yjs updates

## Troubleshooting

If the bug still occurs:

1. **Clear your browser cache** - old JavaScript may be cached
2. **Check the build** - ensure `pnpm run build` completed successfully
3. **Restart the dev server** - `pnpm run dev`
4. **Check console for errors** - look for Yjs or TipTap errors
5. **Verify the files changed**:
   - `app/routes/docs.$slug.tsx` - should have `setIsSynced(false)` at line 152
   - `app/utils/collaboration.client.tsx` - should have `cleanup()` function

## Mobile-Specific Testing

On a real mobile device:
1. Test in Safari (iOS) and Chrome (Android)
2. Test with slow network (enable throttling in DevTools)
3. Test with the keyboard open
4. Test with the device in both portrait and landscape
5. Test switching between apps and coming back

## Performance Notes

The "Loading editor..." state should be very brief (<500ms on good connections). If it's taking longer:
- Check network latency
- Verify PartyServer is running correctly
- Check for any console errors
- Ensure the WebSocket connection is establishing properly

