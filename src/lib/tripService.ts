import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateTripCode } from "./tripCode";
import type { Expense, Trip } from "./types";

const MAX_CODE_ATTEMPTS = 5;

export interface CreateTripInput {
  name: string;
  baseCurrency: string;
  foreignCurrency: string;
  exchangeRate: number;
  editPassword: string;
  members: string[];
}

export async function createTrip(input: CreateTripInput): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateTripCode();
    const ref = doc(db, "trips", code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const trip: Trip = { ...input, code, createdAt: Date.now() };
    await setDoc(ref, trip);
    return code;
  }
  throw new Error("無法產生唯一的旅程代碼，請再試一次。");
}

export async function getTrip(code: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db, "trips", code));
  return snap.exists() ? (snap.data() as Trip) : null;
}

export async function listExpenses(code: string): Promise<Expense[]> {
  const q = query(collection(db, "trips", code, "expenses"), orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
}

export async function addExpense(code: string, expense: Omit<Expense, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "trips", code, "expenses"), expense);
  return ref.id;
}

export async function updateExpense(
  code: string,
  expenseId: string,
  expense: Partial<Omit<Expense, "id">>,
): Promise<void> {
  await updateDoc(doc(db, "trips", code, "expenses", expenseId), expense);
}

export async function deleteExpense(code: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, "trips", code, "expenses", expenseId));
}
