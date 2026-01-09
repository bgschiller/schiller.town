# Document Navigation Fix

## Issue
When navigating between documents on mobile (and desktop), the document editor would sometimes display empty content until the page was refreshed.

## Symptoms
1. User navigates from one document (e.g., `/docs/groceries`) back to the homepage
2. User clicks on a different document
3. Editor loads but shows empty title and content
4. Refreshing the browser fixes the issue and content appears

## Root Cause
The bug was caused by stale React state during client-side navigation between documents:

1. When the `documentId` changed, the Yjs provider and document were destroyed and recreated in `collaboration.client.tsx`
2. However, the React component state (`ydoc` and `isSynced`) retained their old values from the previous document
3. This caused the TipTap editors to initialize before the new Yjs document had synced with the server
4. The editors would render but display no content since they were initialized with an unsynced document

## Solution

### 1. Reset State on Document Change (`app/routes/docs.$slug.tsx`)

Added explicit state reset at the beginning of the initialization useEffect:

```typescript
useEffect(() => {
  setIsClient(true);
  // Reset sync state when document changes
  setIsSynced(false);  // Force re-sync for new document
  setYdoc(null);        // Clear old document reference

  const doc = getYDoc();
  const provider = getProvider(documentId);
  // ... initialization continues
}, [documentId]);
```

This ensures that:
- The component shows "Loading editor..." while switching documents
- The editors only render after the NEW document is synced
- No stale state from the previous document affects the new one

### 2. Improved Cleanup Logic (`app/utils/collaboration.client.tsx`)

Refactored the cleanup logic to be more explicit and thorough:

```typescript
// Cleanup function to properly destroy existing connections
function cleanup() {
  if (provider) {
    provider.destroy();
    provider = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  awareness = null;
  currentRoom = null;  // Reset room tracking
}

function getProvider(room: string) {
  if (typeof window === "undefined") return null;

  // If room changed, cleanup old provider completely
  if (currentRoom !== null && currentRoom !== room) {
    cleanup();
  }
  // ... rest of initialization
}
```

This ensures that:
- All resources from the previous document are properly cleaned up
- The room tracking is reset to null (not just the provider)
- The cleanup happens consistently regardless of provider state

## Testing

To verify the fix:
1. Navigate to a document (e.g., `/docs/groceries`)
2. Click "Back to documents"
3. Click on a different document
4. Verify that the title and content appear without needing to refresh
5. Repeat with multiple documents to ensure consistency

## Technical Notes

- The fix leverages React's state management to ensure component state accurately reflects Yjs document lifecycle
- The `isSynced` flag is critical - it prevents editors from rendering before the document has loaded
- Client-side navigation (via React Router/Remix) reuses component instances, which is why explicit state reset is necessary
- A full page refresh always worked because it created entirely new component instances with fresh state

## Related Files

- `app/routes/docs.$slug.tsx` - Document editor component
- `app/utils/collaboration.client.tsx` - Yjs document and provider management
- TipTap's `useEditor` hook automatically handles editor recreation when dependencies change

## Future Considerations

- Monitor for any edge cases with rapid document switching
- Consider adding loading indicators during document transitions
- Could potentially optimize by preloading adjacent documents

