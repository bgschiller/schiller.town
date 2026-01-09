# Local Development Fix - Production Data Appearing in Dev

## Problem

When running `pnpm run dev`, the local development environment was showing production documents instead of an empty local database. Testing with WiFi off confirmed it was trying to reach production servers (`remote: true` error).

## Root Cause

The `wrangler.toml` file has custom domain routing:

```toml
routes = [
  { pattern = "schiller.town", custom_domain = true }
]
```

This configuration caused wrangler to rewrite **ALL** requests (even in local dev with `--local` flag) to use `schiller.town` as both:
- `request.url` → `http://schiller.town/...`
- `Host` header → `schiller.town`

When API routes constructed URLs to fetch from Durable Objects using `${url.protocol}//${url.host}`, they were hitting production URLs instead of localhost.

## Solution

Added an environment variable `IS_LOCAL_DEV = "true"` in `wrangler.toml` to explicitly mark local development mode:

```toml
[vars]
ANTHROPIC_API_KEY = ""
IS_LOCAL_DEV = "true"  # Added this line
```

Updated all `getStorageUrl()` functions in API routes to check this environment variable:

```typescript
type Env = {
  IS_LOCAL_DEV?: string;
};

function getStorageUrl(request: Request, env: Env, path: string = "") {
  const isLocal = env.IS_LOCAL_DEV === "true";
  const host = isLocal ? `http://localhost:8787` : `http://schiller.town`;
  return `${host}/parties/documents-server/default${path}`;
}

// In loader/action functions:
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as Env;
  const storageUrl = getStorageUrl(request, env, "/storage-list");
  // ...
}
```

## Files Changed

1. **wrangler.toml** - Added `IS_LOCAL_DEV = "true"` environment variable
2. **app/routes/api.documents.tsx** - Updated `getStorageUrl()` and added `context.env`
3. **app/routes/api.documents.$slug.tsx** - Updated `getStorageUrl()` and added `context.env`
4. **app/routes/api.documents.$slug.archive.tsx** - Updated `getStorageUrl()` and added `context.env`
5. **app/routes/api.documents.$slug.restore.tsx** - Updated `getStorageUrl()` and added `context.env`

## Verification

After the fix:
- Local dev shows an empty document list (no production data)
- Works completely offline (WiFi off)
- Production deployment still works correctly with custom domain
- The `--local` flag in `package.json` ensures local Durable Objects are used

## For Production Deployment

When deploying to production, the `IS_LOCAL_DEV` variable will not be set (or can be set to `"false"`), so the code will correctly use `http://schiller.town` for production Durable Objects.

You can override this in production with:
```bash
wrangler secret put IS_LOCAL_DEV
# Enter: false
```

Or simply don't set it in production and it will default to production mode.

