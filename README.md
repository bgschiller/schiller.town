# Schiller Household Dashboard 🏠

A shared-password household dashboard linking to the family's services. Built with Remix 2 + React on Node.

## Features

- 🔐 Shared-password login (name + household password), signed cookie session
- 🏠 Service dashboard: media (Jellyfin, Jellyseerr, Photos, Songs, Files) + admin tools
- 📡 Client-side network detection: admin tools are LAN/Tailscale-only and hidden otherwise

## Develop

```sh
pnpm install
SESSION_SECRET=$(openssl rand -base64 32) HOUSEHOLD_PASSWORD=<password> pnpm run dev
```

Open http://localhost:3000.

## Build & run

```sh
pnpm run build
PORT=3000 pnpm start
```

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the home-server (Docker + Cloudflare Tunnel) setup.
