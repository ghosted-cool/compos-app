"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import BudgetGauge from "@/components/BudgetGauge";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES, type Budget, type Expense } from "@/lib/types";

const CategoryDonut = dynamic(() => import("@/components/CategoryDonut"), { ssr: false });

import { CHART_COLORS } from "@/components/CategoryDonut";

const CATEGORY_ICONS: Record<string, string> = {
  Food: "restaurant",
  Transport: "directions_car",
  Housing: "home",
  Software: "cloud",
  Entertainment: "movie",
  Health: "favorite",
  Travel: "flight",
  Shopping: "shopping_bag",
  Other: "receipt_long",
};

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const supabase = createClient();
  const month = monthKey();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const monthStart = `${month}-01`;
    const [budgetRes, expenseRes] = await Promise.all([
      supabase.from("budgets").select("*").eq("month", month),
      supabase
        .from("expenses")
        .select("*")
        .gte("date", monthStart)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (expenseRes.data) setExpenses(expenseRes.data);
  }, [supabase, month]);

  useEffect(() => {
    load();
  }, [load]);

  const overall = budgets.find((b) => b.category === null)?.monthly_limit ?? 0;
  const categoryBudgets = useMemo(
    () => Object.fromEntries(budgets.filter((b) => b.category).map((b) => [b.category!, b.monthly_limit])),
    [budgets]
  );
  const effectiveBudget =
    overall > 0
      ? overall
      : Object.values(categoryBudgets).reduce((a, b) => a + Number(b), 0);

  const spent = expenses.reduce((a, e) => a + Number(e.amount), 0);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth + 1;
  const paceFraction = dayOfMonth / daysInMonth;
  const dailyAllowance = effectiveBudget > 0 ? Math.max(0, (effectiveBudget - spent) / daysLeft) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  function openBudgetEditor() {
    const d: Record<string, string> = {
      __overall: overall ? String(overall) : "",
    };
    for (const c of EXPENSE_CATEGORIES) {
      d[c] = categoryBudgets[c] ? String(categoryBudgets[c]) : "";
    }
    setDraft(d);
    setEditingBudgets(true);
  }

  async function saveBudgets() {
    if (!userId) return;
    setEditingBudgets(false);
    const rows: { user_id: string; category: string | null; monthly_limit: number; month: string }[] = [];
    const toDelete: (string | null)[] = [];
    const parse = (s: string) => {
      const n = parseFloat(s);
      return isNaN(n) || n < 0 ? 0 : n;
    };
    const overallVal = parse(draft.__overall ?? "");
    if (overallVal > 0) rows.push({ user_id: userId, category: null, monthly_limit: overallVal, month });
    else toDelete.push(null);
    for (const c of EXPENSE_CATEGORIES) {
      const v = parse(draft[c] ?? "");
      if (v > 0) rows.push({ user_id: userId, category: c, monthly_limit: v, month });
      else toDelete.push(c);
    }
    // Replace this month's budgets wholesale (simple + predictable)
    await supabase.from("budgets").delete().eq("month", month).eq("user_id", userId);
    if (rows.length > 0) await supabase.from("budgets").insert(rows);
    load();
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return;
    const { data } = await supabase
      .from("expenses")
      .insert({ user_id: userId, amount: n, category, note: note.trim() || null, date })
      .select()
      .single();
    if (data) setExpenses((prev) => [data, ...prev]);
    setAmount("");
    setNote("");
    setAddOpen(false);
  }

  async function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-ink-soft mt-1">
            {now.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openBudgetEditor}
            className="btn-press flex items-center gap-2 border border-outline-soft bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-low"
          >
            <span className="material-symbols-outlined text-[18px]">table_edit</span>
            Set budget
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add expense
          </button>
        </div>
      </header>

      {/* Centerpiece: gauge + numbers */}
      <section className="bg-card border border-outline-soft rounded-xl p-6 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
              Spent this month
            </p>
            <p className="text-4xl font-semibold tracking-tight">${fmt(spent)}</p>
            <p className="text-sm text-ink-soft mt-1">
              of {effectiveBudget > 0 ? `$${fmt(effectiveBudget)}` : "no budget set"}
            </p>
            {/* progress bar */}
            <div className="w-full bg-surface-highest rounded-full h-2.5 overflow-hidden mt-4">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${
                  effectiveBudget > 0 && spent / effectiveBudget >= 1
                    ? "bg-tier-red"
                    : spent / (effectiveBudget || 1) >= 0.8
                      ? "bg-tier-amber"
                      : "bg-primary"
                }`}
                style={{
                  width: `${effectiveBudget > 0 ? Math.min(100, (spent / effectiveBudget) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <BudgetGauge spent={spent} budget={effectiveBudget} paceFraction={paceFraction} />

          <div className="text-center md:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
              Daily allowance
            </p>
            <p className="text-4xl font-semibold tracking-tight text-primary">
              ${fmt(dailyAllowance)}
            </p>
            <p className="text-sm text-ink-soft mt-1">
              per day · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category breakdown */}
        <section className="bg-card border border-outline-soft rounded-xl p-5">
          <h3 className="font-semibold mb-4">Breakdown</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-ink-soft">No spending yet this month.</p>
          ) : (
            <>
              <div className="h-44">
                <CategoryDonut data={byCategory} />
              </div>
              <div className="space-y-2.5 mt-4">
                {byCategory.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span>{c.name}</span>
                      {categoryBudgets[c.name] && (
                        <span
                          className={`text-xs ${
                            c.value > Number(categoryBudgets[c.name])
                              ? "text-tier-red"
                              : "text-ink-soft"
                          }`}
                        >
                          / ${fmt(Number(categoryBudgets[c.name]))}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold">${fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Recent transactions */}
        <section className="lg:col-span-2 bg-card border border-outline-soft rounded-xl p-5">
          <h3 className="font-semibold mb-4">Recent transactions</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing logged yet. Add your first expense to start the running log.
            </p>
          ) : (
            <div className="space-y-1">
              {expenses.slice(0, 25).map((e) => (
                <div
                  key={e.id}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-low border border-transparent hover:border-outline-soft transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {CATEGORY_ICONS[e.category] ?? "receipt_long"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {e.note || e.category}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {e.category} · {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">-${fmt(Number(e.amount))}</span>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="btn-press opacity-0 group-hover:opacity-100 text-ink-soft hover:text-tier-red transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Budget editor modal — spreadsheet-style */}
      {editingBudgets && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={() => setEditingBudgets(false)}
        >
          <div
            className="bg-card rounded-xl border border-outline-soft shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">Monthly budget</h2>
            <p className="text-xs text-ink-soft mb-4">
              Set an overall cap, split it by category, or both. Overall takes precedence for the
              gauge.
            </p>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-outline-soft">
                  <td className="py-2.5 font-semibold">Overall</td>
                  <td className="py-2 w-32">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-soft">$</span>
                      <input
                        inputMode="decimal"
                        value={draft.__overall ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, __overall: e.target.value }))}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-surface border border-outline-soft rounded-md outline-none focus:border-primary text-right font-mono"
                      />
                    </div>
                  </td>
                </tr>
                {EXPENSE_CATEGORIES.map((c) => (
                  <tr key={c} className="border-b border-surface-high">
                    <td className="py-2 text-ink-soft">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          {CATEGORY_ICONS[c]}
                        </span>
                        {c}
                      </div>
                    </td>
                    <td className="py-1.5 w-32">
                      <div className="flex items-center gap-1">
                        <span className="text-ink-soft">$</span>
                        <input
                          inputMode="decimal"
                          value={draft[c] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))}
                          placeholder="—"
                          className="w-full px-2 py-1.5 bg-surface border border-outline-soft rounded-md outline-none focus:border-primary text-right font-mono"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingBudgets(false)}
                className="btn-press px-4 py-2 rounded-lg text-sm text-ink-soft hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={saveBudgets}
                className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={() => setAddOpen(false)}
        >
          <form
            onSubmit={addExpense}
            className="bg-card rounded-xl border border-outline-soft shadow-xl w-full max-w-sm p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Add expense</h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl text-ink-soft">$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2 text-2xl font-semibold bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`btn-press flex flex-col items-center gap-0.5 rounded-lg py-2 text-xs border ${
                    category === c
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-outline-soft text-ink-soft hover:bg-surface-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {CATEGORY_ICONS[c]}
                  </span>
                  {c}
                </button>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary text-ink-soft"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="btn-press px-4 py-2 rounded-lg text-sm text-ink-soft hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Log it
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
