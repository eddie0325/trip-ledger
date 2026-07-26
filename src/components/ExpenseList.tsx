import { useState } from "react";
import { toBaseCurrency } from "../lib/settlement";
import type { Expense, Trip } from "../lib/types";

interface ExpenseListProps {
  trip: Trip;
  expenses: Expense[];
  canEdit: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function groupByDate(expenses: Expense[]): [string, Expense[]][] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const list = groups.get(expense.date) ?? [];
    list.push(expense);
    groups.set(expense.date, list);
  }
  return Array.from(groups.entries());
}

function formatDateHeader(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).toLocaleDateString("zh-TW", { weekday: "short" });
  return `${dateStr}（${weekday}）`;
}

function computeDaySubtotal(dayExpenses: Expense[], trip: Trip): number | null {
  try {
    return dayExpenses.reduce((sum, e) => sum + toBaseCurrency(e.amount, e.currency, trip), 0);
  } catch {
    return null;
  }
}

export default function ExpenseList({ trip, expenses, canEdit, onEdit, onDelete }: ExpenseListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (expenses.length === 0) {
    return <p className="muted">還沒有任何花費記錄。</p>;
  }

  function toggleExpanded(id: string | undefined) {
    if (!id) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {groupByDate(expenses).map(([date, dayExpenses]) => {
        const subtotal = computeDaySubtotal(dayExpenses, trip);
        return (
          <div key={date} className="expense-day-group">
            <div className="expense-day-header">
              <h3>{formatDateHeader(date)}</h3>
              {subtotal != null && (
                <span className="muted">
                  小計 {subtotal.toFixed(2)} {trip.baseCurrency}
                </span>
              )}
            </div>

            {dayExpenses.map((expense) => {
              const isExpanded = !!expense.id && expandedIds.has(expense.id);
              return (
                <div className="expense-item" key={expense.id}>
                  <button
                    type="button"
                    className="expense-summary"
                    onClick={() => toggleExpanded(expense.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="expense-summary-main">
                      <span className="expense-caret">{isExpanded ? "▾" : "▸"}</span>
                      <strong>{expense.description}</strong>
                      <span className="expense-meta">{expense.payer} 先付</span>
                    </span>
                    <span className="expense-amount">
                      {expense.amount.toFixed(2)} {expense.currency}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="expense-details">
                      <div className="expense-meta">
                        分攤：
                        {expense.splits.map((s) => `${s.member} ${s.amount.toFixed(2)}`).join("、")}
                      </div>
                      {(expense.mapUrl || expense.receiptUrl) && (
                        <div className="expense-meta">
                          {expense.mapUrl && (
                            <a href={expense.mapUrl} target="_blank" rel="noreferrer">
                              地圖
                            </a>
                          )}
                          {expense.mapUrl && expense.receiptUrl && " · "}
                          {expense.receiptUrl && (
                            <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                              收據
                            </a>
                          )}
                        </div>
                      )}
                      {canEdit && (
                        <div className="expense-actions">
                          <button type="button" className="btn" onClick={() => onEdit(expense)}>
                            編輯
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => onDelete(expense)}>
                            刪除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
