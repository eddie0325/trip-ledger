import { useState } from "react";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toBaseCurrency } from "../lib/settlement";
import type { Expense, Trip } from "../lib/types";

interface ExpenseListProps {
  trip: Trip;
  expenses: Expense[];
  canEdit: boolean;
  editingExpenseId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onReorder: (date: string, orderedIds: string[]) => void;
  renderEditForm: (expense: Expense) => React.ReactNode;
}

function groupByDate(expenses: Expense[]): [string, Expense[]][] {
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

interface ExpenseRowProps {
  expense: Expense;
  canEdit: boolean;
  isExpanded: boolean;
  editForm: React.ReactNode;
  onToggle: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function ExpenseRow({ expense, canEdit, isExpanded, editForm, onToggle, onEdit, onDelete }: ExpenseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: expense.id ?? "",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="expense-item" ref={setNodeRef} style={style}>
      <div className="expense-row">
        {canEdit && (
          <button type="button" className="drag-handle" aria-label="拖曳排序" {...attributes} {...listeners}>
            ⋮⋮
          </button>
        )}
        <button type="button" className="expense-summary" onClick={onToggle} aria-expanded={isExpanded}>
          <span className="expense-summary-main">
            <span className="expense-caret">{isExpanded ? "▾" : "▸"}</span>
            <strong>{expense.description}</strong>
            <span className="expense-meta">{expense.payer} 先付</span>
          </span>
          <span className="expense-amount">
            {expense.amount.toFixed(2)} {expense.currency}
          </span>
        </button>
      </div>

      {editForm ? (
        <div className="expense-details">{editForm}</div>
      ) : (
        isExpanded && (
          <div className="expense-details">
            <div className="expense-meta">
              分攤：
              {expense.splits.map((s) => `${s.member} ${s.amount.toFixed(2)}`).join("、")}
            </div>
            {expense.note && <div className="expense-meta">備註：{expense.note}</div>}
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
                    附圖
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
        )
      )}
    </div>
  );
}

export default function ExpenseList({
  trip,
  expenses,
  canEdit,
  editingExpenseId,
  onEdit,
  onDelete,
  onReorder,
  renderEditForm,
}: ExpenseListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  function handleDragEnd(date: string, ids: string[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(date, arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div>
      {groupByDate(expenses).map(([date, dayExpenses]) => {
        const subtotal = computeDaySubtotal(dayExpenses, trip);
        const ids = dayExpenses.map((e) => e.id ?? "");
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

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(date, ids, event)}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {dayExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    canEdit={canEdit}
                    isExpanded={!!expense.id && expandedIds.has(expense.id)}
                    editForm={expense.id && expense.id === editingExpenseId ? renderEditForm(expense) : null}
                    onToggle={() => toggleExpanded(expense.id)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
    </div>
  );
}
