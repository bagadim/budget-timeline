import type { EventRow, Flow, FlowPeriod, Settings, Tax } from '@budget-timeline/db';

export type FlowWithPeriods = Flow & { periods: FlowPeriod[] };

export interface Snapshot {
  settings: Settings;
  flows: FlowWithPeriods[];
  taxes: Tax[];
  events: EventRow[];
}
