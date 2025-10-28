import { listReceipts } from '../store/receipts';

export function receiptsToCSV(limit = 2000) {
  const rows = listReceipts(limit);
  const header = ['id', 'rail', 'status', 'created_at', 'payload'];
  const output = [header.join(',')];

  for (const receipt of rows) {
    const payloadString = JSON.stringify(receipt.payload).replace(
      /"/g,
      '""',
    );

    output.push(
      [
        receipt.id,
        receipt.rail,
        receipt.status,
        new Date(receipt.createdAt).toISOString(),
        `"${payloadString}"`,
      ].join(','),
    );
  }

  return output.join('\n');
}
