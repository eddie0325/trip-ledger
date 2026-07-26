import { useEffect, useState } from "react";
import { uploadReceipt, validateReceiptFile } from "../lib/receiptStorage";
import { computeEqualSplits } from "../lib/settlement";
import type { Expense, SplitType, Trip } from "../lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseFormProps {
  trip: Trip;
  initialValue?: Expense;
  onSubmit: (expense: Omit<Expense, "id">) => Promise<void>;
  onCancel?: () => void;
}

export default function ExpenseForm({ trip, initialValue, onSubmit, onCancel }: ExpenseFormProps) {
  const [payer, setPayer] = useState(initialValue?.payer ?? trip.members[0]);
  const [amount, setAmount] = useState(initialValue ? String(initialValue.amount) : "");
  const [currency, setCurrency] = useState(initialValue?.currency ?? trip.baseCurrency);
  const [date, setDate] = useState(initialValue?.date ?? todayIso());
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [splitType, setSplitType] = useState<SplitType>(initialValue?.splitType ?? "equal");
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(initialValue?.splits.map((s) => s.member) ?? trip.members),
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const split of initialValue?.splits ?? []) initial[split.member] = String(split.amount);
    return initial;
  });
  const [receiptUrl, setReceiptUrl] = useState(initialValue?.receiptUrl);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | undefined>(initialValue?.receiptUrl);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (splitType === "custom" && Object.keys(customAmounts).length === 0 && Number(amount) > 0) {
      const splits = computeEqualSplits(Number(amount), Array.from(participants));
      const next: Record<string, string> = {};
      for (const s of splits) next[s.member] = String(s.amount);
      setCustomAmounts(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType]);

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateReceiptFile(file);
    if (validationError) return setError(validationError);

    setError("");
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function handleRemoveReceipt() {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(undefined);
    setReceiptUrl(undefined);
  }

  function toggleParticipant(member: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(member)) next.delete(member);
      else next.add(member);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(amount);
    if (!amount || !(amountNum > 0)) return setError("請輸入有效的金額");
    if (!description.trim()) return setError("請輸入項目說明");

    let splits;
    if (splitType === "equal") {
      const selected = Array.from(participants);
      if (selected.length === 0) return setError("請至少選擇一位分攤成員");
      splits = computeEqualSplits(amountNum, selected);
    } else {
      splits = Object.entries(customAmounts)
        .map(([member, value]) => ({ member, amount: Number(value) }))
        .filter((s) => s.amount > 0);
      if (splits.length === 0) return setError("請至少輸入一位成員的金額");
      const sum = splits.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(sum - amountNum) > 0.01) {
        return setError(`每人金額加總為 ${sum.toFixed(2)}，與總金額 ${amountNum.toFixed(2)} 不符`);
      }
    }

    setSubmitting(true);
    try {
      let finalReceiptUrl = receiptUrl;
      if (receiptFile) {
        setUploading(true);
        try {
          finalReceiptUrl = await uploadReceipt(trip.code, receiptFile);
        } finally {
          setUploading(false);
        }
      }

      await onSubmit({
        payer,
        amount: amountNum,
        currency,
        date,
        description: description.trim(),
        splitType,
        splits,
        ...(finalReceiptUrl ? { receiptUrl: finalReceiptUrl } : {}),
        ...(initialValue?.mapUrl ? { mapUrl: initialValue.mapUrl } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field field-row">
        <div>
          <label htmlFor="expense-payer">誰先付的</label>
          <select id="expense-payer" value={payer} onChange={(e) => setPayer(e.target.value)}>
            {trip.members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="expense-date">日期</label>
          <input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="field field-row">
        <div>
          <label htmlFor="expense-amount">金額</label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="expense-currency">幣別</label>
          <select id="expense-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value={trip.baseCurrency}>{trip.baseCurrency}</option>
            <option value={trip.foreignCurrency}>{trip.foreignCurrency}</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="expense-description">項目說明</label>
        <input
          id="expense-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：晚餐"
        />
      </div>

      <div className="field">
        <label htmlFor="expense-receipt">收據照片（選填）</label>
        {receiptPreview && (
          <div className="receipt-preview">
            <a href={receiptPreview} target="_blank" rel="noreferrer">
              <img src={receiptPreview} alt="收據預覽" />
            </a>
            <button type="button" className="btn" onClick={handleRemoveReceipt}>
              移除
            </button>
          </div>
        )}
        <input id="expense-receipt" type="file" accept="image/*" onChange={handleReceiptChange} />
      </div>

      <div className="field">
        <label>分攤方式</label>
        <div className="field-row">
          <button
            type="button"
            className="btn"
            style={splitType === "equal" ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
            onClick={() => setSplitType("equal")}
          >
            平均分攤
          </button>
          <button
            type="button"
            className="btn"
            style={splitType === "custom" ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
            onClick={() => setSplitType("custom")}
          >
            自訂金額
          </button>
        </div>
      </div>

      {splitType === "equal" ? (
        <div className="field">
          <label>誰要分攤這筆</label>
          {trip.members.map((m) => (
            <div className="checkbox-row" key={m}>
              <input
                type="checkbox"
                id={`participant-${m}`}
                checked={participants.has(m)}
                onChange={() => toggleParticipant(m)}
              />
              <label htmlFor={`participant-${m}`}>{m}</label>
            </div>
          ))}
        </div>
      ) : (
        <div className="field">
          <label>每人分攤金額</label>
          {trip.members.map((m) => (
            <div className="field-row" key={m} style={{ marginBottom: 6, alignItems: "center" }}>
              <span style={{ flex: "0 0 80px" }}>{m}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customAmounts[m] ?? ""}
                onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [m]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="field-row">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {uploading ? "上傳收據中..." : submitting ? "儲存中..." : initialValue ? "儲存修改" : "新增花費"}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </form>
  );
}
