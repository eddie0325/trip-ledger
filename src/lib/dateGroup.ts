import type { Expense } from "./types";

export function groupByDate(expenses: Expense[]): [string, Expense[]][] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const list = groups.get(expense.date) ?? [];
    list.push(expense);
    groups.set(expense.date, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return Array.from(groups.entries());
}

export function formatDateHeader(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).toLocaleDateString("zh-TW", { weekday: "short" });
  return `${dateStr}（${weekday}）`;
}
