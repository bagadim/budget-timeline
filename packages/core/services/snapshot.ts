import type { Db } from '@budget-timeline/db';
import type { Snapshot } from '../types';
import { listEvents } from './events';
import { listFlows } from './flows';
import { getSettings } from './settings';
import { listTaxes } from './taxes';

export function getSnapshot(db: Db): Snapshot {
  return {
    settings: getSettings(db),
    flows: listFlows(db),
    taxes: listTaxes(db),
    events: listEvents(db),
  };
}
