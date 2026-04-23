import { EntryRecord } from '@/types';
import { buildDailySummary } from './notifications';
import * as Print from 'expo-print';
import { formatDateTime } from '@/utils/date';

export async function generateWeeklyPdf(entries: EntryRecord[]) {
  const summary = buildDailySummary(entries);
  const rows = entries
    .slice(0, 20)
    .map(
      (entry) => `
        <tr>
          <td>${entry.type}</td>
          <td>${entry.title}</td>
          <td>${formatDateTime(entry.occurredAt)}</td>
          <td>${entry.notes ?? ''}</td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #142033; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          p { margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f4f7fb; }
        </style>
      </head>
      <body>
        <h1>BabyFlow Weekly Summary</h1>
        <p>${summary}</p>
        <table>
          <thead>
            <tr><th>Type</th><th>Title</th><th>When</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  if (Print.printToFileAsync) {
    const file = await Print.printToFileAsync({ html });
    return {
      uri: file.uri,
      summary,
    };
  }

  return {
    uri: `data:text/html,${encodeURIComponent(html)}`,
    summary,
  };
}
