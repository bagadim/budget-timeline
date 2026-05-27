'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { client } from '@/lib/orpc';

export function NewMilestoneForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await client.milestones.create({
        name: String(formData.get('name') ?? ''),
        targetCents: Number(formData.get('targetAmount') ?? 0) * 100,
        targetDate: String(formData.get('targetDate') ?? ''),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create milestone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New milestone
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">New milestone</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-500">
            A planned trip or event with a target budget.
          </Dialog.Description>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block text-sm">
              Name
              <input
                name="name"
                required
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              Target amount (CHF)
              <input
                name="targetAmount"
                type="number"
                min="0"
                step="0.01"
                required
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              Target date
              <input
                name="targetDate"
                type="date"
                required
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
