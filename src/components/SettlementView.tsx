import { useState } from "react";
import { computeBalances, convertFromBase, needsExchangeRate, simplifyDebts } from "../lib/settlement";
import type { Expense, Trip } from "../lib/types";

interface SettlementViewProps {
  trip: Trip;
  expenses: Expense[];
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

  const balances = computeBalances(trip, expenses);
  const transactions = simplifyDebts(balances);
  const canToggleCurrency = trip.exchangeRate != null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>每人淨額（{displayCurrency}）</h3>
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

      <h3 style={{ marginTop: 16 }}>結算方式</h3>
      {transactions.length === 0 ? (
        <p className="muted">目前不需要任何轉帳，帳都平了。</p>
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
    </div>
  );
}
