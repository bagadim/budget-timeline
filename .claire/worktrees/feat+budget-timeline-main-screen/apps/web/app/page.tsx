import { client } from '@/lib/orpc';
import { BudgetScreen } from './_components/budget-screen';

export default async function Page() {
  const initial = await client.snapshot();
  return <BudgetScreen initial={initial} />;
}
