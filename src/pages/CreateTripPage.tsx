import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTrip } from "../lib/tripService";

export default function CreateTripPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("TWD");
  const [foreignCurrency, setForeignCurrency] = useState("JPY");
  const [exchangeRate, setExchangeRate] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [members, setMembers] = useState(["", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateMember(index: number, value: string) {
    setMembers((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function addMember() {
    setMembers((prev) => [...prev, ""]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedMembers = members.map((m) => m.trim()).filter(Boolean);
    const uniqueMembers = new Set(trimmedMembers);
    const rate = exchangeRate ? Number(exchangeRate) : null;

    if (!trimmedName) return setError("請輸入旅程名稱");
    if (!baseCurrency.trim() || !foreignCurrency.trim()) return setError("請輸入幣別代碼");
    if (baseCurrency.trim().toUpperCase() === foreignCurrency.trim().toUpperCase())
      return setError("兩種幣別不能相同");
    if (exchangeRate && !(rate! > 0)) return setError("匯率請輸入大於 0 的數字");
    if (!editPassword.trim()) return setError("請設定編輯密碼");
    if (trimmedMembers.length < 2) return setError("請至少輸入 2 位成員");
    if (uniqueMembers.size !== trimmedMembers.length) return setError("成員名稱不能重複");

    setSubmitting(true);
    try {
      const code = await createTrip({
        name: trimmedName,
        baseCurrency: baseCurrency.trim().toUpperCase(),
        foreignCurrency: foreignCurrency.trim().toUpperCase(),
        exchangeRate: rate,
        editPassword: editPassword.trim(),
        members: trimmedMembers,
      });
      navigate(`/trip/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立旅程失敗，請再試一次");
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>旅遊分帳</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        建立一趟旅程，記錄大家的花費，最後自動算出誰要付給誰多少錢。
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="field">
            <label htmlFor="trip-name">旅程名稱</label>
            <input
              id="trip-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：2026 東京之旅"
            />
          </div>

          <div className="field field-row">
            <div>
              <label htmlFor="base-currency">主要幣別</label>
              <input
                id="base-currency"
                type="text"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                placeholder="TWD"
              />
            </div>
            <div>
              <label htmlFor="foreign-currency">外幣</label>
              <input
                id="foreign-currency"
                type="text"
                value={foreignCurrency}
                onChange={(e) => setForeignCurrency(e.target.value)}
                placeholder="JPY"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="exchange-rate">
              匯率：1 {foreignCurrency || "外幣"} = ? {baseCurrency || "主要幣別"}（選填，之後隨時可以調整）
            </label>
            <input
              id="exchange-rate"
              type="number"
              step="0.0001"
              min="0"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="不確定可以先留空"
            />
          </div>

          <div className="field">
            <label htmlFor="edit-password">編輯密碼</label>
            <input
              id="edit-password"
              type="text"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="同行的人要記帳時需要輸入"
            />
          </div>
        </div>

        <div className="card">
          <h2>成員</h2>
          <div className="member-list">
            {members.map((member, index) => (
              <div className="member-row" key={index}>
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(index, e.target.value)}
                  placeholder={`成員 ${index + 1}`}
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => removeMember(index)}
                    aria-label="移除成員"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={addMember}>
            + 新增成員
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "建立中..." : "建立旅程"}
        </button>
      </form>
    </div>
  );
}
