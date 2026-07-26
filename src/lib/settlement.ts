import type { Expense, ExpenseSplit, Trip, Transaction } from "./types";

const EPSILON = 0.01;

/** Splits an amount evenly, handing leftover cents to the first participants so the total matches exactly. */
export function computeEqualSplits(amount: number, participants: string[]): ExpenseSplit[] {
  const n = participants.length;
  const base = Math.floor((amount / n) * 100) / 100;
  const remainderCents = Math.round((amount - base * n) * 100);

  return participants.map((member, idx) => ({
    member,
    amount: Math.round((idx < remainderCents ? base + 0.01 : base) * 100) / 100,
  }));
}

export function toBaseCurrency(amount: number, currency: string, trip: Trip): number {
  if (currency === trip.baseCurrency) return amount;
  if (trip.exchangeRate == null) {
    throw new Error("尚未設定匯率，無法換算外幣花費。");
  }
  return amount * trip.exchangeRate;
}

/** True when settlement can't be computed yet because a foreign-currency expense exists but no rate is set. */
export function needsExchangeRate(trip: Trip, expenses: Expense[]): boolean {
  return trip.exchangeRate == null && expenses.some((e) => e.currency !== trip.baseCurrency);
}

/** Converts an amount already in the trip's base currency into the requested display currency. */
export function convertFromBase(amountInBase: number, displayCurrency: string, trip: Trip): number {
  if (displayCurrency === trip.baseCurrency) return amountInBase;
  if (trip.exchangeRate == null) {
    throw new Error("尚未設定匯率，無法換算外幣顯示。");
  }
  return amountInBase / trip.exchangeRate;
}

/** Net balance per member, in the trip's base currency. Positive = should receive money, negative = owes money. */
export function computeBalances(trip: Trip, expenses: Expense[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const member of trip.members) balances[member] = 0;

  for (const expense of expenses) {
    const paidInBase = toBaseCurrency(expense.amount, expense.currency, trip);
    balances[expense.payer] = (balances[expense.payer] ?? 0) + paidInBase;

    for (const split of expense.splits) {
      const owedInBase = toBaseCurrency(split.amount, expense.currency, trip);
      balances[split.member] = (balances[split.member] ?? 0) - owedInBase;
    }
  }

  return balances;
}

/** Greedily matches largest debtors against largest creditors to minimize the number of transfers. */
export function simplifyDebts(balances: Record<string, number>): Transaction[] {
  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > EPSILON)
    .map(([member, amount]) => ({ member, amount }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < -EPSILON)
    .map(([member, amount]) => ({ member, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (amount > EPSILON) {
      transactions.push({ from: debtor.member, to: creditor.member, amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount < EPSILON) i++;
    if (creditor.amount < EPSILON) j++;
  }

  return transactions;
}
