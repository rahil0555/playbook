/**
 * The subscription the wall offers, in ONE place.
 *
 * DEMO PRICES, not a real price list. They are chosen for a market with both middle-income and
 * higher-income families: a low monthly entry point, a yearly plan that reads as the sensible
 * choice, and a premium family tier that costs noticeably more and says why. Replace the amounts
 * (and the currency) here when the real price list is settled - nothing else in the app knows them.
 *
 * No payment is taken anywhere in PlayLab: a plan is recorded on the device exactly like the demo
 * unlock was (services/entitlementsService). A real host passes its own billing state instead.
 */
export interface Plan {
  id: string;
  name: string;
  /** the price as it is shown, already formatted (the currency lives here and nowhere else) */
  price: string;
  /** what the price buys, e.g. "per month" */
  period: string;
  /** one short line a parent can read at a glance */
  blurb: string;
  /** shown as a ribbon on the recommended plan */
  badge?: string;
  /** the plan the wall suggests, and pre-selects */
  recommended?: boolean;
}

/** The currency every demo price is written in, so switching market is one line. */
export const CURRENCY = '₹';

/** DEMO PRICES - middle-income entry point, a value yearly plan, and a premium family tier. */
export const DEMO_PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: `${CURRENCY}399`,
    period: 'per month',
    blurb: 'All five activities for one child. Cancel any time.',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: `${CURRENCY}2,999`,
    period: 'per year',
    blurb: 'The same as monthly, and about four months of it are free.',
    badge: 'Save 37%',
    recommended: true,
  },
  {
    id: 'family',
    name: 'Premium family',
    price: `${CURRENCY}5,999`,
    period: 'per year',
    blurb: 'Up to four children, a grown-ups’ progress report, and offline packs.',
  },
];

/** The plan the wall pre-selects (the recommended one, or the first). */
export const DEFAULT_PLAN_ID = (DEMO_PLANS.find((p) => p.recommended) ?? DEMO_PLANS[0])?.id ?? 'monthly';

export const findPlan = (id: string | null | undefined): Plan | undefined => DEMO_PLANS.find((p) => p.id === id);
