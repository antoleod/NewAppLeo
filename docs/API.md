# AppLeo API Documentation

## Data Formats

### Feed Entry
\`\`\`json
{
  "amountMl": number,
  "dateISO": string (ISO 8601),
  "source": "bottle" | "breast" | "formula",
  "bottleStartISO"?: string,
  "bottleEndISO"?: string,
  "durationSec"?: number
}
\`\`\`

### Diaper Entry
\`\`\`json
{
  "kind": "wet" | "dirty" | "mixed",
  "dateISO": string (ISO 8601),
  "notes"?: string
}
\`\`\`

### Sleep Entry
\`\`\`json
{
  "durationSec": number,
  "dateISO": string (ISO 8601),
  "startISO": string,
  "endISO": string,
  "location"?: string
}
\`\`\`

## Theme Palettes
- Sage 🌿
- Rose 🌸
- Navy 🌊
- Sand 🏜️

Last updated: $(date -u +%Y-%m-%d\ %H:%M:%S)
