import { computeBalances, simplifyDebts } from "../lib/settlement";
import type { Expense, Trip } from "../lib/types";

interface SettlementViewProps {
  trip: Trip;
  expenses: Expense[];
}

export default function SettlementView({ trip, expenses }: SettlementViewProps) {
  const balances = computeBalances(trip, expenses);
  const transactions = simplifyDebts(balances);

  return (
    <div>
      <h3>每人淨額（{trip.baseCurrency}）</h3>
      {trip.members.map((member) => {
        const amount = balances[member] ?? 0;
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
              {t.amount.toFixed(2)} {trip.baseCurrency}
            </strong>
          </div>
        ))
      )}
    </div>
  );
}
