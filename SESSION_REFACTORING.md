# Session Handling Refactoring

## Overview

This document describes the refactoring of session handling code to eliminate repetition across routes and improve maintainability.

## Problems Addressed

### 1. **Repetitive Auth Checks**
Before refactoring, every protected route loader had to manually:
- Import `requireAuth` from session utilities
- Access `context.env.SESSION_SECRET`
- Specify the redirect path
- Handle the auth check boilerplate

```typescript
// BEFORE: Repeated in every protected route
export const loader: LoaderFunction = async function ({
  context,
  request,
}: LoaderFunctionArgs) {
  const userName = await requireAuth(request, context.env.SESSION_SECRET, "/");
  return Response.json({ userName });
};
```

### 2. **Duplicated Host Normalization**
Client-side API calls all needed the same 0.0.0.0 → localhost normalization logic:

```typescript
// BEFORE: Repeated in every component making API calls
let host = window.location.origin;
if (host.includes("0.0.0.0")) {
  host = host.replace("0.0.0.0", "localhost");
}
const response = await fetch(`${host}/api/documents`);
```

## Solution

### New Utilities Created

#### 1. `createAuthenticatedLoader` (server-side)
**File:** `app/utils/session.server.ts`

A higher-order function that wraps loaders with automatic authentication:

```typescript
export function createAuthenticatedLoader<T extends Record<string, any>>(
  loaderFn: (
    args: LoaderFunctionArgs & { userName: string }
  ) => Promise<Response> | Response
) {
  return async (args: LoaderFunctionArgs) => {
    const { request, context } = args;
    const url = new URL(request.url);
    const userName = await requireAuth(
      request,
      context.env.SESSION_SECRET,
      url.pathname
    );
    return loaderFn({ ...args, userName });
  };
}
```

**Benefits:**
- No need to manually access `SESSION_SECRET`
- Automatic redirect to login with proper `next` parameter
- `userName` is automatically injected into loader args
- Consistent error handling across all routes

**Usage:**
```typescript
// AFTER: Clean and declarative
export const loader: LoaderFunction = createAuthenticatedLoader(
  async ({ userName }) => {
    return Response.json({ userName });
  }
);
```

#### 2. `getApiUrl` and `getApiHost` (client-side)
**File:** `app/utils/api.client.ts`

Client-side utilities for building API URLs with automatic host normalization:

```typescript
export function getApiHost(): string {
  let host = window.location.origin;
  if (host.includes("0.0.0.0")) {
    host = host.replace("0.0.0.0", "localhost");
  }
  return host;
}

export function getApiUrl(path: string): string {
  const host = getApiHost();
  return `${host}${path}`;
}
```

**Usage:**
```typescript
// BEFORE: Manual normalization
let host = window.location.origin;
if (host.includes("0.0.0.0")) {
  host = host.replace("0.0.0.0", "localhost");
}
const response = await fetch(`${host}/api/documents`);

// AFTER: One-liner
const response = await fetch(getApiUrl("/api/documents"));
```

#### 3. `SessionEnv` Type
**File:** `app/utils/session.server.ts`

Type definition for environment variables with session support:

```typescript
export type SessionEnv = {
  SESSION_SECRET: string;
  HOUSEHOLD_PASSWORD: string;
  [key: string]: any;
};
```

## Files Modified

### Routes Updated
1. **`app/routes/_index.tsx`**
   - Loader: Uses `createAuthenticatedLoader`
   - Client API calls: Uses `getApiUrl`

2. **`app/routes/archived-docs.tsx`**
   - Loader: Uses `createAuthenticatedLoader`
   - Client API calls: Uses `getApiUrl`

3. **`app/routes/docs.$slug.tsx`**
   - Loader: Uses `createAuthenticatedLoader`
   - Client API calls: Uses `getApiUrl`

4. **`app/routes/star-chart.tsx`**
   - Loader: Uses `createAuthenticatedLoader`
   - Client API calls: Uses `getApiUrl`

### Utilities Added
- **`app/utils/api.client.ts`** (new file)
  - Client-side API utilities

### Utilities Enhanced
- **`app/utils/session.server.ts`**
  - Added `createAuthenticatedLoader` HOF
  - Added `SessionEnv` type

## Before/After Comparison

### Loader Definition

**Before:**
```typescript
export const loader: LoaderFunction = async function ({
  context,
  request,
}: LoaderFunctionArgs) {
  const userName = await requireAuth(request, context.env.SESSION_SECRET, "/");
  return Response.json({ userName });
};
```

**After:**
```typescript
export const loader: LoaderFunction = createAuthenticatedLoader(
  async ({ userName }) => {
    return Response.json({ userName });
  }
);
```

**Lines saved:** 3-4 per route (multiplied by 4 routes = ~16 lines)

### API Calls

**Before:**
```typescript
let host = window.location.origin;
if (host.includes("0.0.0.0")) {
  host = host.replace("0.0.0.0", "localhost");
}
const response = await fetch(`${host}/api/documents`);
```

**After:**
```typescript
const response = await fetch(getApiUrl("/api/documents"));
```

**Lines saved:** 4 per API call location (multiplied by ~10+ locations = ~40 lines)

## Impact

### Code Reduction
- **~56 lines removed** across all routes
- More consistent patterns across the codebase
- Easier to maintain and modify auth logic

### Maintainability Benefits
1. **Single Source of Truth:** Auth logic lives in one place
2. **Type Safety:** Better TypeScript inference with HOF
3. **Consistency:** All routes follow the same pattern
4. **Extensibility:** Easy to add features (e.g., role-based auth, audit logging)

### Future Enhancements
With this foundation, we can easily add:
- **Role-based access control:** Add role checks to `createAuthenticatedLoader`
- **Audit logging:** Log all authenticated requests
- **Rate limiting:** Track requests per user
- **Session refresh:** Auto-refresh expiring sessions
- **API action wrapper:** Similar HOF for authenticated actions

## Testing Checklist

After this refactoring, verify:
- [ ] Login flow works correctly
- [ ] Protected routes redirect to login when not authenticated
- [ ] `next` parameter preserves intended destination after login
- [ ] All API calls work on both localhost and 0.0.0.0
- [ ] Document CRUD operations function properly
- [ ] Star chart operations work
- [ ] Logout redirects to login page
- [ ] Session persistence works (cookies set correctly)

## Migration Notes

If you need to add a new protected route:

1. Import the utilities:
```typescript
import { createAuthenticatedLoader } from "~/utils/session.server";
import { getApiUrl } from "~/utils/api.client";
```

2. Define your loader:
```typescript
export const loader = createAuthenticatedLoader(
  async ({ userName, request, params, context }) => {
    // Your loader logic here
    // userName is automatically available!
  }
);
```

3. Use `getApiUrl` for client-side API calls:
```typescript
const response = await fetch(getApiUrl("/api/your-endpoint"));
```

## Backward Compatibility

All existing session functions remain available:
- `requireAuth` (for manual auth checks)
- `getUserName`
- `createUserSession`
- `logout`
- `verifyPassword`

These are still used in special cases like the login route.
