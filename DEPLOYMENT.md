# Deployment — home server (Node + Cloudflare Tunnel)

The app no longer runs on Cloudflare Workers. It is a plain Remix 2 app served by `remix-serve` (Node), packaged as a Docker container, and exposed publicly through a Cloudflare Tunnel. Admin tools (Radarr, Sonarr, pi-hole, …) stay LAN/Tailscale-only — they are never exposed through the tunnel.

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
- For future state-changing server actions (e.g. "pause pi-hole"), add CSRF protection — Remix does not auto-protect form actions.
