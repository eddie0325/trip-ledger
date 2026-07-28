import { useState } from "react";
import { formatDateHeader, groupByDate } from "../lib/dateGroup";
import {
  computeBalances,
  convertFromBase,
  needsExchangeRate,
  simplifyDebts,
  simplifyDebtsWithPreferences,
} from "../lib/settlement";
import type { Expense, Trip } from "../lib/types";

interface SettlementViewProps {
  trip: Trip;
  expenses: Expense[];
}

interface SettlementBlockProps {
  trip: Trip;
  expenses: Expense[];
  displayCurrency: string;
}

function SettlementBlock({ trip, expenses, displayCurrency }: SettlementBlockProps) {
  const balances = computeBalances(trip, expenses);
  const transactions = simplifyDebts(balances);

  return (
    <>
      {trip.members.map((member) => {
        const amount = convertFromBase(balances[member] ?? 0, displayCurrency, trip);
        const isPositive = amount > 0.01;
        const isNegative = amount < -0.01;
        return (
          <div className="balance-row" key={member}>
            <span>{member}</span>
            <span className={isPositive ? "balance-positive" : isNegative ? "balance-negative" : ""}>
              {isPositive ? "應收 " : isNegative ? "應付 " : ""}
              {Math.abs(amount).toFixed(2)}
            </span>
          </div>
        );
      })}

      {transactions.length === 0 ? (
        <p className="muted">不需要轉帳。</p>
      ) : (
        transactions.map((t, i) => (
          <div className="transaction-row" key={i}>
            <span>
              {t.from} → {t.to}
            </span>
            <strong>
              {convertFromBase(t.amount, displayCurrency, trip).toFixed(2)} {displayCurrency}
            </strong>
          </div>
        ))
      )}
    </>
  );
}

interface OverallSettlementProps {
  trip: Trip;
  expenses: Expense[];
  displayCurrency: string;
}

function OverallSettlement({ trip, expenses, displayCurrency }: OverallSettlementProps) {
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const balances = computeBalances(trip, expenses);
  const transactions = simplifyDebtsWithPreferences(balances, preferences);
  const creditors = trip.members.filter((m) => (balances[m] ?? 0) > 0.01);

  return (
    <>
      {trip.members.map((member) => {
        const amount = convertFromBase(balances[member] ?? 0, displayCurrency, trip);
        const isPositive = amount > 0.01;
        const isNegative = amount < -0.01;
        return (
          <div className="balance-row" key={member}>
            <span>{member}</span>
            <span className={isPositive ? "balance-positive" : isNegative ? "balance-negative" : ""}>
              {isPositive ? "應收 " : isNegative ? "應付 " : ""}
              {Math.abs(amount).toFixed(2)}
            </span>
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}>
        <h3 style={{ margin: 0 }}>結算方式</h3>
        {Object.keys(preferences).length > 0 && (
          <button type="button" className="btn" onClick={() => setPreferences({})}>
            重設為自動分配
          </button>
        )}
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        每筆轉帳可以改成付給別人（例如現實中只方便直接給某人），其餘的人會自動重新分配。
      </p>

      {transactions.length === 0 ? (
        <p className="muted">不需要轉帳。</p>
      ) : (
        transactions.map((t, i) => (
          <div className="transaction-row" key={i}>
            <span>
              {t.from} →{" "}
              <select
                value={t.to}
                onChange={(e) => setPreferences((prev) => ({ ...prev, [t.from]: e.target.value }))}
              >
                {creditors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </span>
            <strong>
              {convertFromBase(t.amount, displayCurrency, trip).toFixed(2)} {displayCurrency}
            </strong>
          </div>
        ))
      )}
    </>
  );
}

export default function SettlementView({ trip, expenses }: SettlementViewProps) {
  const [displayCurrency, setDisplayCurrency] = useState(trip.baseCurrency);

  if (needsExchangeRate(trip, expenses)) {
    return (
      <div>
        <h3>結算</h3>
        <p className="muted">
          有花費使用 {trip.foreignCurrency}，請先在上方設定匯率才能計算結算結果。
        </p>
      </div>
    );
  }

  const canToggleCurrency = trip.exchangeRate != null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>總結算（{displayCurrency}）</h3>
        {canToggleCurrency && (
          <div className="field-row" style={{ flex: "0 0 auto" }}>
            <button
              type="button"
              className="btn"
              style={
                displayCurrency === trip.baseCurrency
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : undefined
              }
              onClick={() => setDisplayCurrency(trip.baseCurrency)}
            >
              {trip.baseCurrency}
            </button>
            <button
              type="button"
              className="btn"
              style={
                displayCurrency === trip.foreignCurrency
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : undefined
              }
              onClick={() => setDisplayCurrency(trip.foreignCurrency)}
            >
              {trip.foreignCurrency}
            </button>
          </div>
        )}
      </div>

      <OverallSettlement trip={trip} expenses={expenses} displayCurrency={displayCurrency} />

      <h3 style={{ marginTop: 24 }}>每日結算</h3>
      {groupByDate(expenses).map(([date, dayExpenses]) => (
        <div key={date} className="expense-day-group">
          <div className="expense-day-header">
            <h3>{formatDateHeader(date)}</h3>
          </div>
          <SettlementBlock trip={trip} expenses={dayExpenses} displayCurrency={displayCurrency} />
        </div>
      ))}
    </div>
  );
}
