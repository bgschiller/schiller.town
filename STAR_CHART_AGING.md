# Star Chart Exchange Aging Feature

## Overview

The star chart now automatically ages out completed rows (exchanges) at the end of the day they were used. This keeps the chart clean and focused on current progress.

## How It Works

### Data Structure Changes

Added a new field to `StarChartExchange`:

```typescript
export type StarChartExchange = {
  timestamp: number;
  squaresExchanged: number; // Always 20
  squareRange: [number, number]; // e.g., [1, 20] for first exchange
  usedDate: string; // ISO date string (YYYY-MM-DD) when TV time was used
};
```

### Automatic Cleanup

When a chart is retrieved from storage:

1. The `ageOutOldExchanges()` method checks each exchange's `usedDate`
2. Any exchanges with a `usedDate` before today are removed
3. If exchanges were removed, the chart is automatically saved with `updatedAt` timestamp

This happens automatically in the `StarChartServer.onRequest()` handler when fetching a chart via `/storage-get/{id}`.

### New Exchange Creation

When a new exchange is created (trading 20 squares for TV time):

1. Current date is captured in ISO format (YYYY-MM-DD)
2. The `usedDate` field is added to the exchange record
3. Exchange is added to the chart's history

### UI Updates

The TV Time History section now:

1. Shows a subtitle explaining automatic aging: "Exchanges are automatically removed at the end of the day"
2. Displays the `usedDate` in the history details (if available)
3. Shows only current/recent exchanges (old ones are automatically removed)

## Database Reset

Since this is a breaking change to the data structure, the dev database should be cleared to remove any old exchanges without the `usedDate` field. All new exchanges will have this field and participate in automatic aging.

## Example Timeline

1. **Monday 9am**: Child earns 20 squares and exchanges for TV time
   - Exchange created with `usedDate: "2025-12-26"`
   - Appears in history section

2. **Monday all day**: Exchange visible in UI, squares shown as "exchanged" in grid

3. **Tuesday 12:00am+**: Next time chart is loaded
   - `ageOutOldExchanges()` runs automatically
   - Monday's exchange is removed (usedDate < today)
   - Chart is saved with updated state
   - UI shows clean slate for new day

## Benefits

1. **Cleaner UI**: History doesn't grow indefinitely
2. **Fresh Start**: Each day starts with a clean slate for exchanges
3. **Automatic**: No manual cleanup needed
4. **Performant**: Cleanup happens lazily on chart load (no cron jobs needed)
5. **Simple Logic**: Just comparing dates, no complex time calculations

## Files Modified

- `party/star-chart.ts`: Added `usedDate` field, `ageOutOldExchanges()` method, automatic cleanup on GET
- `app/routes/api.star-chart.tsx`: Set `usedDate` when creating exchanges
- `app/routes/star-chart.tsx`: Display usedDate and aging explanation in UI

## Future Enhancements

Potential improvements:

- Allow configuring aging window (e.g., keep for 7 days instead of same-day)
- Add "archive" view to see historical exchanges
- Export exchange history before aging out
- Migration script to add `usedDate` to legacy exchanges
