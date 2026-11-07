# Deployment — home server (Node + Cloudflare Tunnel)

The app no longer runs on Cloudflare Workers. It is a plain Remix 2 app served by `remix-serve` (Node), packaged as a Docker container, and exposed publicly through a Cloudflare Tunnel. Admin tools (Radarr, Sonarr, pi-hole, …) stay LAN/Tailscale-only — they are never exposed through the tunnel.

## Current state (as built 2026-11-06)

- Live at `https://schiller.town`, served from this home server (`raichu`).
- Cloudflare Tunnel id `2b91faeb-fb45-4e17-9d0a-319705f0fb49` — **remotely managed** (hostname configured in the Zero Trust dashboard).
- DNS: `schiller.town` CNAME → `2b91faeb-fb45-4e17-9d0a-319705f0fb49.cfargotunnel.com` (proxied). The old Workers custom domain (AAAA `100::`) is removed.
- `.env` (chmod 600, gitignored) holds `SESSION_SECRET`, `HOUSEHOLD_PASSWORD`, `CLOUDFLARE_TUNNEL_TOKEN`, `PIHOLE_APP_PASSWORD`, `PIHOLE_URL`.
- Containers: `schiller` (remix-serve, host port 3000) + `schiller-tunnel` (cloudflared) on bridge network `schiller-network`.
- Deploy: `docker compose up -d --build`. Logs: `docker compose logs -f`.

## Prerequisites

- Docker + Docker Compose on the home server.
- Cloudflare account with the `schiller.town` zone.

## 1. Environment variables

Create `.env` next to `docker-compose.yml` (it is gitignored):

```sh
# Generate with: openssl rand -base64 32
SESSION_SECRET=<32+ random bytes>

# The shared household password used to log in
HOUSEHOLD_PASSWORD=<password>

# From the Cloudflare tunnel created in step 3
CLOUDFLARE_TUNNEL_TOKEN=<token>

# Pi-hole (v6) app password — create a scoped one at Settings → API → App passwords
PIHOLE_APP_PASSWORD=<app password>
PIHOLE_URL=http://192.168.0.26
```

## 2. Remove the old Cloudflare Workers route

`schiller.town` is currently served by a Cloudflare Worker via a custom-domain route. Remove it before pointing the domain at the tunnel, or the two will conflict:

1. Cloudflare dashboard → Workers & Pages → the schiller worker → Settings → Domains & Routes.
2. Delete the `schiller.town` custom domain route.

(If Wrangler is still installed you can instead run `wrangler routes delete schiller.town`.)

## 3. Create the Cloudflare Tunnel

1. Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel → name it `schiller`.
2. Copy the tunnel token into `CLOUDFLARE_TUNNEL_TOKEN` in `.env`.
3. Add a public hostname: `schiller.town` → service `http://schiller:3000` (the compose service name on the shared docker network).
4. Cloudflare creates/updates the DNS record automatically.

> **Gotcha — tunnel token ≠ config:** a tunnel token only authorizes the *connection*, not the config. This tunnel is *remotely managed*, so the public-hostname mapping lives in Cloudflare and must be set in the dashboard (or via API with **Cloudflare Tunnel → Edit**). A local `config.yml` ingress is **ignored** for remotely-managed tunnels — the symptom is cloudflared connects fine but every request 404s because no ingress rule matches. There is no local-only way to route a remotely-managed tunnel.

## 4. Start it

```sh
docker compose up -d --build
```

Verify:

```sh
curl -I http://localhost:3000/login   # 200
docker compose logs schiller
```

## Optional: serve through Caddy too

The tunnel already terminates TLS, so Caddy is not required for the public path. If you also want the dashboard reachable on the LAN/Tailscale via Caddy, add to `~/jellyfin/caddy/Caddyfile`:

```
schiller.town {
    reverse_proxy 127.0.0.1:3000
}
```

then `docker restart caddy`. (Only useful if you have a LAN/Tailscale DNS name for it; the tunnel path does not need it.)

## Security notes

- The dashboard is the only thing exposed publicly. Admin tools and pi-hole remain LAN/Tailscale-only.
- Access requires a signed session cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production) issued after the shared-password check.
- `SESSION_SECRET` must be random and secret; rotating it logs everyone out.
- The old `.envrc` (a Wrangler Cloudflare API token) has been removed. It was local-only (not committed), but consider rotating that token in Cloudflare to fully retire it.
- The "pause pi-hole" action is CSRF-protected (signed token stored in the session) and validates durations against a whitelist (`30s`/`5m`/`15m`/`30m`/`1h`). The pi-hole app password is used server-side only; prefer a scoped app password over the admin login.
