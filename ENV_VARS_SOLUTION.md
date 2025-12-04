# Environment Variables in Remix with PartyKit

## Problem

The `/organize-list` endpoint was kept in `party/documents.ts` because it needed access to `ANTHROPIC_API_KEY` environment variable.

## Solution

Environment variables from `partykit.json` are accessible in Remix routes through the execution context!

### Implementation

**1. Update `party/main.ts` to pass env through context:**

```typescript
declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    lobby: Party.FetchLobby;
    env: Record<string, string | undefined>; // ← Added this
  }
}

const handleRequest = createRequestHandler({
  build,
  getLoadContext: (req, lobby, ctx) => {
    // Environment variables are available on ctx.env
    const env = ctx.env || {};
    return { lobby, env }; // ← Pass env to Remix
  },
});
```

**2. Access env vars in any Remix loader/action:**

```typescript
// app/routes/api.organize-list.tsx
export async function action({ request, context }: ActionFunctionArgs) {
  // Get API key from context
  const apiKey = context.env.ANTHROPIC_API_KEY as string | undefined;

  // Use it directly
  const organized = await organizeGroceriesByDepartment(items, apiKey);
  return json({ organized });
}
```

## Benefits

1. ✅ **No proxy needed**: Remix routes can call functions that need env vars directly
2. ✅ **Simpler architecture**: No need to bounce requests through PartyKit
3. ✅ **Better type safety**: TypeScript knows about env vars through AppLoadContext
4. ✅ **Centralized config**: All env vars still defined in `partykit.json`

## Result

**Before:**

- `party/documents.ts`: ~300 lines (CRUD + organize-list)
- Organize-list stayed in PartyKit for env access

**After:**

- `party/documents.ts`: ~110 lines (pure storage only)
- Organize-list moved to `app/routes/api.organize-list.tsx`
- All business logic in Remix with full env var access

## What's Left in PartyKit

Only what **truly** needs to be there:

- Storage operations (`this.party.storage`)
- Real-time WebSocket (Yjs collaboration)
- Geo presence tracking

Everything else is in Remix! 🎉
