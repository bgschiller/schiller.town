# Welcome to Household Collaborative Notes 📝

This is a real-time collaborative document editor built with [Remix](https://remix.run) and [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) (Cloudflare Workers + Durable Objects).

## Features

- 📝 Real-time collaborative editing with TipTap
- 👥 See who's currently viewing each document
- 🗂️ AI-powered grocery list organization by department (using Anthropic Claude)
- 📦 Archive and restore documents

## AI Grocery Sorting

This app includes an AI-powered feature to organize grocery lists by department. See [GROCERY_SORTING.md](./GROCERY_SORTING.md) for setup instructions.

## Resources

- [Remix Docs](https://remix.run/docs)
- [PartyServer GitHub](https://github.com/cloudflare/partykit/tree/main/packages/partyserver)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [AGENTS.md](./AGENTS.md) - Comprehensive developer guide

## Development

Install dependencies (using pnpm):

```sh
pnpm install
```

You will be running two processes during development:

- The Remix development server
- The Wrangler development server (Cloudflare Workers local emulator)

Both are started with one command:

```sh
pnpm run dev
```

Open up [http://127.0.0.1:8787](http://127.0.0.1:8787) and you should be ready to go!

If you want to check the production build:

```sh
pnpm run build
pnpm start
```

## Deployment

First, set your production secrets:

```sh
wrangler secret put SESSION_SECRET
wrangler secret put HOUSEHOLD_PASSWORD
wrangler secret put ANTHROPIC_API_KEY  # optional
```

Then deploy:

```sh
pnpm run deploy
```

This will deploy your app to Cloudflare Workers. If you don't have a Cloudflare account, you'll be prompted to create one.

## Configuration

See `wrangler.toml` for Cloudflare Workers configuration including Durable Object bindings and migrations.

## Migration from PartyKit

This project was migrated from PartyKit to PartyServer to resolve Durable Objects deployment issues on Cloudflare's free plan. See [PARTYSERVER_MIGRATION.md](./PARTYSERVER_MIGRATION.md) for details.

## Thanks

_(Originally based on the Remix template for [Cloudflare Workers](https://github.com/remix-run/remix/tree/main/templates/cloudflare-workers) and [PartyKit](https://partykit.io))_
