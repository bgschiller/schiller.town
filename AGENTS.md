# Agent Guide: Schiller Household Dashboard

## Project Overview

A shared-password household dashboard that links to the family's services (Jellyfin, Jellyseerr, Photos, Songs, Files, and admin tools). Built with Remix 2 + React, running on Node.

This app was previously a collaborative-documents + star-chart app on Cloudflare Workers (Durable Objects + Yjs). Those features and the Workers runtime were removed; what remains is a small, mostly-static dashboard with cookie auth.

## Tech Stack

- Remix 2 (React), served by `@remix-run/serve` on Node
- Cookie session auth (signed, httpOnly)
- Plain CSS: inline `<style>` blocks + static files in `public/styles/`
- pnpm (never npm)
- Deployment: Docker + Cloudflare Tunnel

## Architecture

```
Browser
  ↓ HTTP
remix-serve (Node)
  ↓ loader / action
app/routes/*.tsx  +  app/utils/session.server.ts
```

No database. No WebSockets. The only state is a signed cookie.

## Directory Structure

```
app/
  root.tsx              - document shell (links root.css)
  entry.server.tsx      - Node server render (streams HTML)
  entry.client.tsx      - React hydration
  routes/
    _index.tsx          - service dashboard (requires auth)
    login.tsx           - name + shared password form
    logout.tsx          - destroys session, redirects to /login
  utils/
    session.server.ts   - cookie session helpers (createUserSession, requireAuth, getUserName, verifyPassword, logout)
public/
  styles/root.css       - global styles
  styles/home.css       - dashboard styles
Dockerfile, docker-compose.yml   - home-server deployment
DEPLOYMENT.md                    - home-server + Cloudflare Tunnel setup
```

## Auth

- Shared password (env `HOUSEHOLD_PASSWORD`) + user name → signed cookie `__session` (30 days, httpOnly, SameSite=Lax, Secure in production).
- Protected routes call `requireAuth(request)` in their loader; unauthenticated requests redirect to `/login?next=…`.
- Secrets come from `process.env` (`SESSION_SECRET`, `HOUSEHOLD_PASSWORD`). The app throws at startup if `SESSION_SECRET` is missing.

## Environment Variables

- `SESSION_SECRET` — cookie-signing secret (required, random ≥32 bytes)
- `HOUSEHOLD_PASSWORD` — shared login password

Set them in the shell for local dev, or in `.env` / docker-compose for deployment. Never commit them.

## Development

```sh
pnpm install
SESSION_SECRET=$(openssl rand -base64 32) HOUSEHOLD_PASSWORD=<password> pnpm run dev
# → http://localhost:3000
```

```sh
pnpm run check   # tsc --noEmit
pnpm run build   # outputs build/ (server) + public/build/ (client)
pnpm start       # remix-serve ./build/index.js (production; PORT env, default 3000)
```

## Deployment

See `DEPLOYMENT.md`. Summary: Docker build → `remix-serve` on :3000 → Cloudflare Tunnel routes `schiller.town` → the container. Admin tools stay LAN/Tailscale-only.

## Network detection (homepage)

`_index.tsx` does a client-side reachability check to pick the right admin-tool URL:

1. `https://ping-lan.schiller.town:4443` reachable → LAN → `http://192.168.0.44:<port>`
2. else `https://stream.schiller.town` reachable → Tailscale → `http://raichu:<port>`
3. else external → admin tools shown unavailable

This keeps admin tools off the public internet. Media services flagged `requiresNetwork: true` (Jellyfin, Jellyseerr) are Tailscale-only and greyed out when external.

## Adding a server action (e.g. "pause pi-hole")

Pattern:

1. Add a route with an `action`, and call `requireAuth(request)` inside it.
2. Perform the side effect on the LAN (e.g. call pi-hole's API using its token).
3. Add CSRF protection for state-changing actions — Remix does not auto-protect forms. Use a signed token stored in the session and rendered into the form.
4. `SameSite=Lax` cookie (already the default) is defense-in-depth, not a substitute.

## Gotchas

- Always pnpm; no `package-lock.json`.
- Don't edit `build/` or `public/build/` — generated.
- CSS is plain, no Tailwind. `remix.config.js` keeps `serverModuleFormat: "esm"` because `package.json` sets `"type": "module"`.
- Env access is `process.env.X`, not `context.env` (that was the old Workers pattern).
- `remix-serve` serves `public/` static assets and the app; `PORT` overrides the default 3000.
