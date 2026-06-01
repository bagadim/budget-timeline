export interface ProjectionPeriod {
  id: number;
  flowId: number;
  amountMinor: number;
  startMonth: string;
  endMonth: string | null;
}
export interface ProjectionFlow {
  id: number;
  kind: 'income' | 'spending';
  name: string;
  color: string;
  position: number;
  periods: ProjectionPeriod[];
}
export interface ProjectionTax {
  id: number;
  name: string;
  mode: 'percent' | 'fixed';
  rateBps: number | null;
  amountMinor: number | null;
  color: string;
  position: number;
}
export interface ProjectionEvent {
  id: number;
  name: string;
  month: string;
  amountMinor: number;
  color: string | null;
}
export interface ProjectionSettings {
  startingSavingsMinor: number;
  startMonth: string;
  currency: string;
  horizonYears: number;
}
export interface ProjectionInput {
  settings: ProjectionSettings;
  flows: ProjectionFlow[];
  taxes: ProjectionTax[];
  events: ProjectionEvent[];
}
export interface MonthBreakdownItem { id: number; name: string; color: string | null; amount: number; }
export interface ProjectionMonth {
  monthIndex: number;
  label: string;
  year: number;
  isYearStart: boolean;
  income: number;
  taxBreakdown: MonthBreakdownItem[];
  spendBreakdown: MonthBreakdownItem[];
  leftover: number;
  cumulative: number;
  events: MonthBreakdownItem[];
}
export interface Projection { months: ProjectionMonth[]; }
export function computeProjection(input: ProjectionInput): Projection;
