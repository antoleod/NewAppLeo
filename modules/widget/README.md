# Widget Payload

This folder documents the data contract for a future lock screen / home screen widget bridge.

The UI in `app/(app)/(tabs)/home.tsx` uses `src/lib/widget.ts` to build the payload below:

```json
{
  "babyName": "Leo",
  "headline": "920 ml today",
  "subheadline": "6 feeds, 4 diapers, 210 min sleep",
  "lastFeedLabel": "Bottle feed · 150 ml",
  "lastDiaperLabel": "Diaper log · 2h ago",
  "sleepLabel": "210 min sleep today",
  "updatedAt": "2026-03-24T22:00:00.000Z"
}
```

When a native widget bridge is added later, it should consume this exact shape or a compatible versioned variant.
