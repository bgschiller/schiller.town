# Agent Guide: Household Collaborative Notes

## Project Overview

This is a real-time collaborative document editor built for household use, combining **Remix** (React framework) and **PartyKit** (real-time backend). It features password-protected document editing with real-time collaboration, presence indicators, and AI-powered grocery list organization.

## Tech Stack

- **Frontend**: Remix 2.x (React framework)
- **Backend**: PartyKit (serverless WebSocket platform on Cloudflare Workers)
- **Collaboration**: Yjs + TipTap (CRDT-based collaborative editing)
- **AI**: Anthropic Claude 3.5 Haiku (grocery categorization)
- **Package Manager**: **pnpm** (always use `pnpm` commands, never `npm`)
- **Runtime**: Node.js ≥18.17.1

## Architecture

### High-Level Structure

```
Client (Remix/React)
  ↓ HTTP API calls
Remix API Routes (/app/routes/api.*.tsx)
  ↓ Storage operations
PartyKit DocumentsServer (/party/documents.ts)
  ↓ Durable storage
PartyKit Storage (key-value)

Client (TipTap Editor)
  ↓ WebSocket
PartyKit YjsServer (/party/yjs.ts)
  ↓ CRDT sync
Yjs Document (collaborative state)
```

### Key Architectural Decisions

1. **Separation of Concerns** (see REFACTORING_SUMMARY.md):

   - **Remix routes** handle HTTP requests, validation, and business logic
   - **PartyKit servers** provide low-level storage operations and WebSocket connections
   - Clean separation between REST API (Remix) and real-time features (PartyKit)

2. **Document Identity**:

   - Each document has both a `slug` (URL-friendly name, user-editable) and `id` (stable identifier)
   - **All storage uses `id` as the key** for atomic operations
     - Document metadata stored in `documents` party with `id` as key
     - Yjs collaboration state stored in `yjs` party with `id` as key
     - Renaming a document (changing slug) is now atomic - no migration needed!
   - **URLs still use slug** for human-readable access (`/docs/my-document`)
     - API routes look up documents by slug, then operate on them by id

3. **Environment Variables**:
   - Defined in `partykit.json` under `vars`
   - Accessible in Remix routes via `context.env` (see ENV_VARS_SOLUTION.md)
   - No need to proxy through PartyKit for env var access

## Directory Structure

```
/app
  /routes              - Remix routes (pages and API endpoints)
    _index.tsx         - Document list (homepage, requires auth)
    docs.$slug.tsx     - Document editor page (TipTap + Yjs)
    login.tsx          - Password authentication
    logout.tsx         - Session termination
    api.documents.tsx  - List/create documents API
    api.documents.$slug.tsx          - Get/update/rename/delete document API
    api.documents.$slug.archive.tsx  - Archive document API
    api.documents.$slug.restore.tsx  - Restore document API
    api.organize-list.tsx            - AI grocery categorization API
    archived-docs.tsx  - Archived documents page
  /components
    whos-here.tsx      - Real-time presence indicator
    country-code-emoji.ts - Country flag emoji converter
  /utils
    session.server.ts  - Authentication & session management
    collaboration.client.tsx - Yjs/Y-PartyKit setup
    merge-adjacent-lists.ts  - TipTap extension for list merging
  root.tsx             - App root component
  entry.client.tsx     - Client entry point
  entry.server.tsx     - Server entry point

/party
  main.ts              - Main PartyKit server (handles Remix HTTP requests)
  documents.ts         - Document storage layer (low-level operations only)
  yjs.ts               - Yjs collaboration server (WebSocket sync)
  geo.ts               - Geo presence tracking (shows active users)
  grocery-categorizer.ts - AI + fallback grocery categorization logic

/public               - Static assets
/build                - Compiled Remix app (used by PartyKit)
```

## PartyKit Servers

The app uses **three separate PartyKit parties** (defined in `partykit.json`):

1. **`main`** (main.ts): Handles all Remix HTTP requests via `partymix`
2. **`documents`** (documents.ts): Provides storage operations for documents
3. **`yjs`** (yjs.ts): Handles real-time Yjs document synchronization
4. **`geo`** (geo.ts): Tracks user presence (who's online, from where)

## Key Features

### 1. Authentication (AUTH_SETUP.md)

- **Shared password model** - perfect for household use
- Users enter their name + shared password at `/login`
- Session stored in encrypted cookie (30-day expiry)
- All document routes protected via `requireAuth()` middleware

**Environment Variables**:

```bash
SESSION_SECRET=<32+ char random string>
HOUSEHOLD_PASSWORD=<shared family password> on local machine, this is "household2024"
```

### 2. Document Management

**Document Structure**:

```typescript
{
  id: string; // Stable identifier (for Yjs room)
  slug: string; // URL-friendly name (editable)
  title: string; // Document title
  content: string; // Plain text content (for search/preview)
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}
```

**Operations**:

- Create: Generate random slug, store document
- Read: Fetch by slug
- Update: Change title/content (debounced from editor)
- Rename: Change slug (updates storage key)
- Archive: Mark as archived (soft delete)
- Restore: Unarchive document
- Delete: Permanent deletion (only archived docs)

### 3. Real-Time Collaboration

**Stack**: Yjs (CRDT) + Y-PartyKit (sync provider) + TipTap (editor)

**How it works**:

1. Each document has two Yjs "fields": `{documentId}-title` and `{documentId}-content`
2. TipTap Collaboration extension syncs editor state with Yjs document
3. Y-PartyKit provider syncs Yjs document with PartyKit server via WebSocket
4. Server persists Yjs state in PartyKit storage (snapshot mode)
5. All connected clients see changes in real-time

**Files**:

- `app/utils/collaboration.client.tsx` - Yjs/Y-PartyKit setup (client-only)
- `party/yjs.ts` - Yjs server (handles WebSocket connections)
- `app/routes/docs.$slug.tsx` - TipTap editor with Collaboration extension

### 4. Presence Tracking

**Component**: `app/components/whos-here.tsx`

Shows active users in current document with:

- User names (from login)
- Country flags (from Cloudflare geolocation)
- Total count

Uses separate WebSocket connection to `geo` party.

### 5. AI Grocery Organization (GROCERY_SORTING.md)

**Feature**: Select list items → AI organizes by department (Produce, Dairy, Meat, etc.)

**Implementation**:

1. User selects list items in editor
2. Click "🗂️ Group Items" in bubble menu
3. POST to `/api/organize-list` with items array
4. `party/grocery-categorizer.ts` categorizes items:
   - **Primary**: Claude 3.5 Haiku API (if `ANTHROPIC_API_KEY` is set)
   - **Fallback**: Keyword matching with 2000+ item database
5. Returns formatted list with department headers
6. Editor replaces selection with organized content

**Environment Variable**:

```bash
ANTHROPIC_API_KEY=<optional, falls back to keyword matching>
```

**Departments**: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Deli, Frozen Foods, Beverages, Canned Goods, Pantry, Condiments, Spices, Health & Wellness, Baby, Household, Personal Care, Pet Supplies

## Development Workflow

### Setup

```bash
# Install dependencies (use pnpm!)
pnpm install

# Create .env file
cp .env.example .env  # or create manually

# Set required environment variables
SESSION_SECRET=<generate with: openssl rand -base64 32>
HOUSEHOLD_PASSWORD=<your shared password>
ANTHROPIC_API_KEY=<optional>
```

### Running Locally

```bash
# Start both Remix dev server and PartyKit server
pnpm run dev

# Opens at http://127.0.0.1:1999
```

This runs:

1. **Remix dev server** (watches files, triggers HMR)
2. **PartyKit dev server** (runs all PartyKit parties locally)

### Building

```bash
# Clean build
pnpm run build

# Compiles:
# - Remix app → public/build/ (client) and build/index.js (server)
# - PartyKit reads build/index.js as entry point
```

### Type Checking

```bash
pnpm run check
```

### Deployment

```bash
# Deploy to PartyKit (includes build step)
pnpm run deploy

# Set production environment variables first:
npx partykit env add SESSION_SECRET <value>
npx partykit env add HOUSEHOLD_PASSWORD <value>
npx partykit env add ANTHROPIC_API_KEY <value>
```

## Important Files

### Configuration

- **`partykit.json`** - PartyKit configuration (parties, env vars, serve path)
- **`remix.config.js`** - Remix configuration (build settings)
- **`tsconfig.json`** - TypeScript configuration
- **`package.json`** - Dependencies and scripts

### Type Definitions

- **`messages.d.ts`** - Shared types for presence/state
- **`remix.env.d.ts`** - Remix environment types

### Documentation

- **`README.md`** - Quick start guide
- **`AUTH_SETUP.md`** - Authentication implementation details
- **`GROCERY_SORTING.md`** - AI grocery feature setup
- **`ENV_VARS_SOLUTION.md`** - Environment variable access pattern
- **`REFACTORING_SUMMARY.md`** - Architecture refactoring history

## Common Tasks

### Add a New API Route

1. Create `app/routes/api.my-feature.tsx`
2. Export `loader` (GET) or `action` (POST/PUT/DELETE)
3. Access env vars via `context.env`
4. Call PartyKit storage if needed: `fetch('/parties/documents/default/storage-*')`

### Add a New PartyKit Party

1. Create `party/my-party.ts`
2. Implement `Party.Server` interface
3. Add to `partykit.json` under `parties`
4. Access via `/parties/my-party/{room-id}`

### Modify Document Schema

1. Update `Document` type in `party/documents.ts`
2. Add migration logic in `getAllDocuments()` or `onRequest()`
3. Update API routes that use `Document` type
4. Consider backward compatibility

### Add Editor Feature

1. Install TipTap extension: `pnpm add @tiptap/extension-*`
2. Add to `useEditor` extensions array in `docs.$slug.tsx`
3. Add UI controls (buttons, menus, etc.)
4. Style in component `<style>` block

## Troubleshooting

### "Document not found" after renaming

- Both Yjs collaboration and document metadata use stable `id` - renaming is atomic
- Check that `documentId` is passed to Yjs provider (not slug)
- If document not found, verify slug lookup is working correctly
- Document list in UI is updated client-side after successful rename

### Collaboration not working

- Ensure WebSocket connection is established (check browser DevTools Network tab)
- Verify `PARTYKIT_HOST` is set correctly
- Check that `party/yjs.ts` server is running

### Environment variables not available

- In Remix routes: access via `context.env.VARIABLE_NAME`
- Ensure variables are defined in `partykit.json` under `vars`
- Restart dev server after changing env vars

### Authentication issues

- Verify `SESSION_SECRET` and `HOUSEHOLD_PASSWORD` are set in `.env`
- Check that session middleware is applied to protected routes
- Clear cookies if session format changed

### Grocery organization not working

- Check if `ANTHROPIC_API_KEY` is set (optional - falls back to keywords)
- Verify network requests in DevTools (POST to `/api/organize-list`)
- Check server logs for API errors

## Security Notes

1. **Shared password authentication** - suitable for trusted household members only
2. **Session cookies** are HTTP-only and encrypted
3. **No user isolation** - all authenticated users see all documents
4. **Environment variables** are server-side only (never exposed to client)
5. **PartyKit storage** is persistent but not encrypted at rest by default

## Performance Considerations

1. **Yjs persistence**: Uses snapshot mode (efficient for small documents)
2. **Document list**: Fetched once on page load, then cached client-side
3. **Metadata updates**: Debounced (1 second) to avoid excessive API calls
4. **Presence tracking**: Uses hibernation mode for high concurrency
5. **AI categorization**: Claude 3.5 Haiku is fast (<1s) and cheap (<$0.01/request)

## Testing Checklist

When making changes, verify:

- [ ] List documents on homepage
- [ ] Create new document
- [ ] Edit document title and content
- [ ] Real-time collaboration (open in two browsers)
- [ ] Rename document (slug change)
- [ ] Archive document
- [ ] View archived documents
- [ ] Restore archived document
- [ ] Delete archived document
- [ ] Presence indicator shows active users
- [ ] Organize grocery list (with selection)
- [ ] Flatten list (remove headings)
- [ ] Login with correct password
- [ ] Login fails with wrong password
- [ ] Logout and redirect to login

## Storage Design

### Current Implementation

**Storage Keys Use `id`:**

- ✅ Atomic rename operations - just update the slug field
- ✅ No migration logic needed when renaming
- ✅ Consistent with Yjs collaboration (also uses `id`)
- ⚠️ Non-human-readable keys in storage (but URLs are still human-readable)
- ⚠️ Slug lookups require iterating through documents (acceptable for household use)

**How Lookup Works:**

1. User requests `/docs/my-grocery-list` (human-readable slug)
2. API route calls `storage-get-by-slug/my-grocery-list`
3. Storage server iterates through all documents to find matching slug
4. Returns document with its stable `id`
5. All operations (update, delete, etc.) then use the `id`

For a small household app (dozens of documents), this is performant. For larger scale, you'd want a slug→id index.

## Gotchas

1. **Always use pnpm**, never npm (package-lock.yaml should not exist)
2. **Don't edit files in `/build` or `/public/build`** - they're generated
3. **Yjs state is separate from document metadata** - title/content stored in both places:
   - Document metadata (searchable text) stored in `documents` party with `id` as key
   - Collaborative editor state (Yjs CRDT) stored in `yjs` party with `id` as key
4. **Slug changes are atomic** - since storage uses `id` as the key, renaming is just updating the slug field in the document (no migration)
5. **PartyKit dev server runs on port 1999**, not 3000
6. **Document IDs are auto-migrated** - older docs may not have IDs initially
7. **Presence requires connection state** - pass `?name=` query param to geo party
8. **TipTap extensions must match on all clients** - schema mismatches break collaboration
9. **Bubble menu only shows for list selections** - check `shouldShow` logic
10. **Client-only code** must check `isClient` state for SSR compatibility

## Extension Ideas

- [ ] Rich text formatting (bold, italic, links)
- [ ] Document search across all content
- [ ] Document tags/categories
- [ ] Export to Markdown/PDF
- [ ] Image uploads
- [ ] Document templates
- [ ] Revision history
- [ ] Permissions per document
- [ ] Mobile app (React Native)
- [ ] Offline support (local-first sync)
- [ ] End-to-end encryption
- [ ] Voice notes / audio recording
- [ ] Document sharing (public links)
- [ ] Commenting / annotations
- [ ] Task lists with checkboxes
- [ ] Calendar integration
- [ ] Recipe parser / shopping list export

## Additional Resources

- [Remix Docs](https://remix.run/docs)
- [PartyKit Docs](https://docs.partykit.io/)
- [Yjs Documentation](https://docs.yjs.dev/)
- [TipTap Docs](https://tiptap.dev/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Partymix (Remix + PartyKit)](https://github.com/partykit/partymix)
