import type { Expense } from "../lib/types";

interface ExpenseListProps {
  expenses: Expense[];
  canEdit: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export default function ExpenseList({ expenses, canEdit, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p className="muted">還沒有任何花費記錄。</p>;
  }

  return (
    <div>
      {expenses.map((expense) => (
        <div className="expense-item" key={expense.id}>
          <div className="expense-top">
            <div>
              <strong>{expense.description}</strong>
              <div className="expense-meta">
                {expense.date} · {expense.payer} 先付
                {expense.mapUrl && (
                  <>
                    {" · "}
                    <a href={expense.mapUrl} target="_blank" rel="noreferrer">
                      地圖
                    </a>
                  </>
                )}
                {expense.receiptUrl && (
                  <>
                    {" · "}
                    <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                      收據
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="expense-amount">
              {expense.amount.toFixed(2)} {expense.currency}
            </div>
          </div>
          <div className="expense-meta">
            分攤：
            {expense.splits.map((s) => `${s.member} ${s.amount.toFixed(2)}`).join("、")}
          </div>
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
      ))}
    </div>
  );
}
