import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import SettlementView from "../components/SettlementView";
import { checkEditPassword, isUnlocked, unlockTrip } from "../lib/localAuth";
import {
  addExpense,
  deleteExpense,
  getTrip,
  listExpenses,
  updateExchangeRate,
  updateExpense,
} from "../lib/tripService";
import type { Expense, Trip } from "../lib/types";

export default function TripPage() {
  const { code = "" } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [unlocked, setUnlocked] = useState(() => isUnlocked(code));
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [rateError, setRateError] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const loadData = useCallback(async () => {
    const t = await getTrip(code);
    if (!t) {
      setNotFound(true);
      return;
    }
    setTrip(t);
    const exps = await listExpenses(code);
    setExpenses(exps);
  }, [code]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  function handleUnlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;
    if (checkEditPassword(trip, passwordInput)) {
      unlockTrip(code);
      setUnlocked(true);
      setPasswordError("");
    } else {
      setPasswordError("密碼錯誤");
    }
  }

  async function handleFormSubmit(data: Omit<Expense, "id">) {
    if (editingExpense?.id) {
      await updateExpense(code, editingExpense.id, data);
    } else {
      await addExpense(code, data);
    }
    setShowForm(false);
    setEditingExpense(null);
    await loadData();
  }

  async function handleDelete(expense: Expense) {
    if (!expense.id) return;
    if (!window.confirm(`確定要刪除「${expense.description}」這筆花費嗎？`)) return;
    await deleteExpense(code, expense.id);
    await loadData();
  }

  function startEditRate() {
    setRateInput(trip?.exchangeRate != null ? String(trip.exchangeRate) : "");
    setRateError("");
    setEditingRate(true);
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(rateInput);
    if (!rateInput || !(rate > 0)) {
      setRateError("請輸入大於 0 的數字");
      return;
    }
    setSavingRate(true);
    try {
      await updateExchangeRate(code, rate);
      setEditingRate(false);
      await loadData();
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "更新失敗，請再試一次");
    } finally {
      setSavingRate(false);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) return <div className="page">載入中...</div>;
  if (notFound || !trip) {
    return (
      <div className="page">
        <p className="error">找不到代碼為 {code} 的旅程。</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="trip-header">
        <div>
          <h1>{trip.name}</h1>
          <div className="trip-code">
            代碼：{trip.code} · {trip.baseCurrency}/{trip.foreignCurrency}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={handleCopyLink}>
            {linkCopied ? "已複製" : "分享連結"}
          </button>
          <button type="button" className="btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "更新中..." : "重新整理"}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span>
            匯率：
            {trip.exchangeRate != null
              ? `1 ${trip.foreignCurrency} = ${trip.exchangeRate} ${trip.baseCurrency}`
              : "尚未設定"}
          </span>
          {unlocked && !editingRate && (
            <button type="button" className="btn" onClick={startEditRate}>
              {trip.exchangeRate != null ? "調整匯率" : "設定匯率"}
            </button>
          )}
        </div>
        {editingRate && (
          <form onSubmit={handleSaveRate} className="field-row" style={{ marginTop: 8, alignItems: "flex-start" }}>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder={`1 ${trip.foreignCurrency} = ? ${trip.baseCurrency}`}
            />
            <button type="submit" className="btn btn-primary" disabled={savingRate}>
              {savingRate ? "儲存中..." : "儲存"}
            </button>
            <button type="button" className="btn" onClick={() => setEditingRate(false)}>
              取消
            </button>
          </form>
        )}
        {rateError && <p className="error">{rateError}</p>}
      </div>

      {!unlocked && (
        <div className="card">
          <h2>解鎖編輯</h2>
          <p className="muted">輸入編輯密碼才能新增／修改／刪除花費，任何人都可以檢視。</p>
          <form onSubmit={handleUnlockSubmit} className="field-row" style={{ alignItems: "flex-start" }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="編輯密碼"
            />
            <button type="submit" className="btn btn-primary">
              解鎖
            </button>
          </form>
          {passwordError && <p className="error">{passwordError}</p>}
        </div>
      )}

      <div className="card">
        <h2>花費記錄</h2>
        <ExpenseList
          expenses={expenses}
          canEdit={unlocked}
          onEdit={(expense) => {
            setEditingExpense(expense);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />

        {unlocked && !showForm && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              setEditingExpense(null);
              setShowForm(true);
            }}
          >
            + 新增花費
          </button>
        )}

        {unlocked && showForm && (
          <div style={{ marginTop: 12 }}>
            <ExpenseForm
              trip={trip}
              initialValue={editingExpense ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingExpense(null);
              }}
            />
          </div>
        )}
      </div>

      <div className="card">
        <SettlementView trip={trip} expenses={expenses} />
      </div>
    </div>
  );
}
