# Development Database Reset Instructions

## Why Reset?

The star chart aging feature adds a required `usedDate` field to all exchanges. Any existing exchanges in the dev database won't have this field and may cause issues.

## How to Reset Local Dev Database

The local Wrangler dev server stores Durable Objects data in `.wrangler/state/v3/`:

```bash
# Option 1: Delete the entire local storage (nuclear option)
rm -rf .wrangler/state

# Option 2: Delete just the star-chart data (more surgical)
# The star-chart data is stored in the StarChartServer Durable Object
# This will be recreated automatically when you visit /star-chart
rm -rf .wrangler/state/v3/d1/miniflare-D*StarChartServer*
```

## After Reset

1. Restart the dev server if it's running:

   ```bash
   # Stop the current server (Ctrl+C)
   pnpm run dev
   ```

2. Visit `/star-chart` - the chart will be created fresh with the new structure

3. All new exchanges will have the `usedDate` field and will age out properly

## Production Deployment

For production, since this is a household app with minimal data:

1. You can either:

   - Clear the production data manually (if there's important historical data)
   - Or just deploy - new exchanges will work fine, old ones without `usedDate` will error when filtered

2. If you want to keep production clean, you could add a one-time migration in the `StarChartServer` that adds `usedDate` to legacy exchanges based on their `timestamp` field, but for a dev/household app it's simpler to just clear and start fresh.

## Verification

After reset, create a test exchange:

1. Add 20+ squares
2. Exchange for TV time
3. Check the history - should show the `usedDate` field
4. The exchange should automatically disappear the next day
