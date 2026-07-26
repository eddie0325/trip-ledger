export type SplitType = "equal" | "custom";

export interface ExpenseSplit {
  member: string;
  amount: number;
}

export interface Expense {
  id?: string;
  payer: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  receiptUrl?: string;
  mapUrl?: string;
}

export interface Trip {
  code: string;
  name: string;
  baseCurrency: string;
  foreignCurrency: string;
  /** 1 unit of foreignCurrency = exchangeRate units of baseCurrency */
  exchangeRate: number;
  editPassword: string;
  members: string[];
  createdAt: number;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}
