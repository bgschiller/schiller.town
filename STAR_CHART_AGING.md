# Star Chart Exchange Aging Feature

## Overview

The star chart automatically ages out completed rows (exchanges) at the end of the day they were used. This keeps the chart clean and focused on current progress. All aging happens based on **Pacific Time** (America/Los_Angeles), which automatically handles daylight saving time.

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
2. Any exchanges with a `usedDate` before today are removed from the exchanges array
3. The `totalSquares` count is reduced by the number of squares that were in the aged-out exchanges (e.g., if 20 squares were exchanged and aged out, `totalSquares` decreases by 20)
4. If exchanges were removed, the chart is automatically saved with `updatedAt` timestamp

This happens automatically in the `StarChartServer.onRequest()` handler when fetching a chart via `/storage-get/{id}`.

### New Exchange Creation

When a new exchange is created (trading 20 squares for TV time):

1. Current date is captured in Pacific Time and formatted as ISO date (YYYY-MM-DD)
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

**Note:** All times are in Pacific Time (America/Los_Angeles).

1. **Monday 9am**: Child earns 20 squares and exchanges for TV time

   - Exchange created with `usedDate: "2025-12-26"` (Pacific date)
   - Appears in history section

2. **Monday all day**: Exchange visible in UI, squares shown as "exchanged" in grid

3. **Tuesday 12:00am (midnight Pacific)+**: Next time chart is loaded
   - `ageOutOldExchanges()` runs automatically
   - Monday's exchange is removed from exchanges array (usedDate < today in Pacific time)
   - `totalSquares` is reduced by 20 (the exchanged squares are removed)
   - Chart is saved with updated state
   - UI shows clean slate for new day (empty rows disappear)

## Benefits

1. **Cleaner UI**: History doesn't grow indefinitely
2. **Fresh Start**: Each day starts with a clean slate for exchanges
3. **Automatic**: No manual cleanup needed
4. **Performant**: Cleanup happens lazily on chart load (no cron jobs needed)
5. **Simple Logic**: Just comparing dates, no complex time calculations
6. **Timezone-Aware**: Uses Pacific Time consistently for household use (auto-handles DST)

## Files Modified

- `party/star-chart.ts`: Added `usedDate` field, `ageOutOldExchanges()` method with Pacific Time support, automatic cleanup on GET
- `app/routes/api.star-chart.tsx`: Set `usedDate` in Pacific Time when creating exchanges
- `app/routes/star-chart.tsx`: Display usedDate and aging explanation in UI

## Implementation Notes

### Timezone Handling

Both the exchange creation and aging logic use `Intl.DateTimeFormat` with the `America/Los_Angeles` timezone:

```typescript
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateStr = formatter.format(new Date()); // Returns YYYY-MM-DD
```

Using `"en-CA"` locale gives us ISO 8601 format (YYYY-MM-DD) directly, and the timezone setting ensures we're always comparing Pacific dates. This automatically handles daylight saving time transitions.

## Future Enhancements

Potential improvements:

- Allow configuring aging window (e.g., keep for 7 days instead of same-day)
- Add "archive" view to see historical exchanges
- Export exchange history before aging out
- Migration script to add `usedDate` to legacy exchanges
