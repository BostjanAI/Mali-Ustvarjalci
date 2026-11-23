import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export default async function SyncLogsPage() {
  await requireAdmin();
  const logs = await prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Sync Logs</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Time</th>
            <th>Type</th>
            <th>Added</th>
            <th>Updated</th>
            <th>Deactivated</th>
            <th>Errors</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="py-2">{l.createdAt.toISOString()}</td>
              <td>{l.type}</td>
              <td>{l.added}</td>
              <td>{l.updated}</td>
              <td>{l.deactivated}</td>
              <td className={l.errors ? 'text-red-600' : ''}>{l.errors}</td>
              <td className="text-gray-600">{l.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}







