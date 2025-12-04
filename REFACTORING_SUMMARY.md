# Document Management Refactoring Summary

## Overview

This refactoring moves HTTP request handling and business logic from the PartyKit server (`party/documents.ts`) to Remix routes, simplifying the architecture and following web framework best practices.

## What Changed

### Architecture Before

```
Client → PartyKit DocumentsServer (handles everything)
  - HTTP request routing
  - Validation
  - Business logic
  - Storage operations
  - WebSocket (collaboration)
```

### Architecture After

```
Client → Remix API Routes (HTTP/REST)
  - HTTP request routing
  - Validation
  - Business logic
  → PartyKit DocumentsServer (storage layer)
    - Storage operations only
    - WebSocket (collaboration)
    - Environment variables
```

## Benefits

1. **Better Separation of Concerns**: HTTP API logic in Remix, real-time features in PartyKit
2. **Familiar Patterns**: Remix loaders/actions for HTTP requests
3. **Type Safety**: Better TypeScript integration with Remix
4. **Easier Testing**: Business logic in standard web framework
5. **Maintainability**: Each layer has a clear responsibility

## New Files Created

### `/app/routes/api.documents.tsx`

Document listing and creation:

- `GET /api/documents` - List all documents (with `?archived=true` param)
- `POST /api/documents` - Create new document

### `/app/routes/api.documents.$slug.tsx`

Individual document operations (dynamic route):

- `GET /api/documents/:slug` - Get specific document
- `PUT /api/documents/:slug` - Update document (title, content)
- `PATCH /api/documents/:slug` - Rename document (change slug)
- `DELETE /api/documents/:slug` - Permanently delete (must be archived first)

### `/app/routes/api.documents.$slug.archive.tsx`

Archive operation:

- `POST /api/documents/:slug/archive` - Archive a document

### `/app/routes/api.documents.$slug.restore.tsx`

Restore operation:

- `POST /api/documents/:slug/restore` - Restore an archived document

### `/app/routes/api.organize-list.tsx`

List organization (grocery categorization):

- `POST /api/organize-list` - Organize items by category using AI or keyword matching
- Accesses `ANTHROPIC_API_KEY` directly from Remix context (no proxy to PartyKit needed)

## Modified Files

### `party/documents.ts` (Simplified)

Reduced from ~300 lines to ~110 lines. Now **only** provides pure storage operations:

**Storage Operations**:
- `GET /storage-list?archived=true` - List documents from storage
- `GET /storage-get/:slug` - Get document from storage
- `POST /storage-put` - Put document in storage
- `POST /storage-delete/:slug` - Delete document from storage

All HTTP request handling, validation, and business logic (including the organize-list feature) has been completely moved to Remix routes.

### Client-Side Route Updates

#### `app/routes/_index.tsx`

Updated fetch calls:

- `POST /api/documents` (was `/parties/documents/default/documents`)
- `GET /api/documents` (was `/parties/documents/default/documents`)
- `PATCH /api/documents/:slug` (was `/parties/documents/default/documents/:slug`)
- `POST /api/documents/:slug/archive` (was `/parties/documents/default/documents/:slug/archive`)

#### `app/routes/archived-docs.tsx`

Updated fetch calls:

- `GET /api/documents?archived=true` (was `/parties/documents/default/documents?archived=true`)
- `POST /api/documents/:slug/restore` (was `/parties/documents/default/documents/:slug/restore`)
- `DELETE /api/documents/:slug` (was `/parties/documents/default/documents/:slug`)

#### `app/routes/docs.$slug.tsx`

Updated fetch calls:

- `GET /api/documents/:slug` (was `/parties/documents/default/documents/:slug`)
- `PUT /api/documents/:slug` (was `/parties/documents/default/documents/:slug`)
- `POST /api/organize-list` (was `/parties/documents/default/organize-list`)

## What Stayed in PartyKit

1. **Storage Layer**: Pure storage operations via `this.party.storage`
2. **Real-time Collaboration**: WebSocket handling (in `party/yjs.ts` - unchanged)
3. **Geo Presence**: User presence tracking (in `party/geo.ts` - unchanged)

## Environment Variables

Environment variables defined in `partykit.json` are now accessible in Remix routes through the `context.env` object:

```typescript
// In party/main.ts
const handleRequest = createRequestHandler({
  build,
  getLoadContext: (req, lobby, ctx) => {
    const env = ctx.env || {};
    return { lobby, env };
  },
});

// In any Remix loader/action
export async function action({ request, context }: ActionFunctionArgs) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  // Use apiKey...
}
```

This allows Remix routes to access environment variables without needing to proxy requests to PartyKit.

## Testing Checklist

To verify the refactoring works correctly:

- [ ] List documents on homepage
- [ ] Create a new document
- [ ] Rename a document (edit slug)
- [ ] Archive a document
- [ ] View archived documents page
- [ ] Restore an archived document
- [ ] Delete an archived document permanently
- [ ] Open a document and edit title/content
- [ ] Organize a grocery list (if ANTHROPIC_API_KEY is set)
- [ ] Verify real-time collaboration still works

## API Route Patterns

All Remix API routes follow this pattern:

```typescript
// Helper to construct PartyKit storage URLs
function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;
  return `${host}/parties/documents/default${path}`;
}

// Call PartyKit storage
const response = await fetch(storageUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key, value }),
});
```

This allows Remix to handle HTTP semantics while delegating storage to PartyKit.

## Notes

- The `Document` type is exported from `api.documents.tsx` for reuse
- Routes are split following Remix file-based routing conventions:
  - `api.documents.tsx` handles `/api/documents` (list, create)
  - `api.documents.$slug.tsx` handles `/api/documents/:slug` (get, update, rename, delete)
  - Archive/restore are nested routes with the proper file structure
- All slug validation is now in Remix routes
- Error handling is more consistent with JSON error responses
- URLs are constructed dynamically to work with both local dev and production (Cloudflare tunnel)
- Environment variables (like `ANTHROPIC_API_KEY`) are accessible in Remix routes via `context.env`
- The grocery categorizer is imported directly in Remix, not proxied through PartyKit
