import { client } from '@/lib/orpc';
import { centsToDisplay } from '@budget-timeline/shared/money';
import { NewMilestoneForm } from './new-milestone-form';

export default async function Page() {
  const milestones = await client.milestones.list();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Milestones</h1>
        <NewMilestoneForm />
      </div>

      {milestones.length === 0 ? (
        <p className="text-zinc-500">No milestones yet. Add one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="rounded border border-zinc-200 bg-white p-3">
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-zinc-500">
                {centsToDisplay(m.targetCents)} · target {m.targetDate}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
