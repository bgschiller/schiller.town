# Welcome to 🎈 PartyKit ⤫ Remix 💿!

This is a collaborative document editor built with [Remix](https://remix.run) and [PartyKit](https://partykit.io).

## Features

- 📝 Real-time collaborative editing with TipTap
- 👥 See who's currently viewing each document
- 🗂️ AI-powered grocery list organization by department (using Anthropic Claude)
- 📦 Archive and restore documents

## AI Grocery Sorting

This app includes an AI-powered feature to organize grocery lists by department. See [GROCERY_SORTING.md](./GROCERY_SORTING.md) for setup instructions.

- [Remix Docs](https://remix.run/docs)
- [PartyKit Docs](https://docs.partykit.io/)

## Development

You will be running two processes during development:

- The Remix development server
- The PartyKit server

Both are started with one command:

```sh
npm run dev
```

Open up [http://127.0.0.1:1999](http://127.0.0.1:1999) and you should be ready to go!

If you want to check the production build, you can stop the dev server and run following commands:

```sh
npm run build
npm start
```

Then refresh the same URL in your browser (no live reload for production builds).

## Deployment

```sh
npm run deploy
```

If you don't already have a PartyKit account, you'll be prompted to create one during the deploy process.

## Thanks

_(This starter based on the original template for [Cloudflare Workers](https://github.com/remix-run/remix/tree/main/templates/cloudflare-workers))_
