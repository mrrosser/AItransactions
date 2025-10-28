import { listReceipts, type ReceiptRow } from '../store/receipts';

type AnalyticsBreakdown = Record<string, number>;

export function computeAnalytics(windowMinutes = 60) {
  const now = Date.now();
  const windowMs = windowMinutes * 60_000;
  const since = now - windowMs;
  const rows: ReceiptRow[] = listReceipts(5000).filter(
    (receipt) => receipt.createdAt >= since,
  );

  const total = rows.length;
  const perMin = windowMinutes ? +(total / windowMinutes).toFixed(2) : total;
  const byRail: AnalyticsBreakdown = {};
  const byStatus: AnalyticsBreakdown = {};

  for (const receipt of rows) {
    byRail[receipt.rail] = (byRail[receipt.rail] ?? 0) + 1;
    byStatus[receipt.status] = (byStatus[receipt.status] ?? 0) + 1;
  }

  const success =
    (byStatus['CONFIRMED'] ?? 0) + (byStatus['ENVELOPED'] ?? 0);
  const successRate = total ? +((success / total) * 100).toFixed(2) : 0;

  return {
    windowMinutes,
    total,
    perMin,
    successRate,
    byRail,
    byStatus,
    since,
    now,
  };
}
