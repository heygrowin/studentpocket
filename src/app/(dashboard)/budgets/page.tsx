"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  PenSquare,
  X,
  Loader2,
  PieChart,
  Calculator,
  Plus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BudgetsPage() {
  const { user, profile } = useAuthStore();
  const { activeBudget, updateBudget } = useFinanceStore();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";
  const currentYearMonth = new Date().toISOString().substring(0, 7);

  // Default values setup
  const totalLimit = activeBudget?.totalLimit || 15000;
  const categoryLimits = activeBudget?.categoryLimits || {
    Food: 5000,
    Rent: 5000,
    Groceries: 2000,
    Transport: 1500,
    "Books & Study": 1000,
    Entertainment: 500,
  };
  const currentSpend = activeBudget?.currentSpend || {};

  // Local state for configuration form
  const [totalLimitVal, setTotalLimitVal] = useState(totalLimit);
  const [categoryItems, setCategoryItems] = useState<{ name: string; limit: number }[]>([]);

  // Calculate current calculations
  const totalSpent = Object.values(currentSpend).reduce((acc, curr) => acc + curr, 0);
  const totalPercent = Math.min(100, Math.round((totalSpent / totalLimit) * 100)) || 0;
  const remainingBudget = Math.max(0, totalLimit - totalSpent);

  // Forecast daily limits
  const getRemainingDaysInMonth = () => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return endOfMonth.getDate() - today.getDate() + 1; // inclusive of today
  };
  const remainingDays = getRemainingDaysInMonth();
  const forecastDailyAllowance = remainingDays > 0 ? remainingBudget / remainingDays : 0;

  const handleOpenConfig = () => {
    setTotalLimitVal(totalLimit);
    setCategoryItems(
      Object.entries(categoryLimits).map(([name, limit]) => ({ name, limit }))
    );
    setShowConfigModal(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const limitsMap: Record<string, number> = {};
      categoryItems.forEach((item) => {
        const trimmedName = item.name.trim();
        if (trimmedName) {
          limitsMap[trimmedName] = Number(item.limit) || 0;
        }
      });
      await updateBudget(user.uid, currentYearMonth, totalLimitVal, limitsMap);
      setShowConfigModal(false);
    } catch (error) {
      console.error("Error saving budget configurations:", error);
      alert("Failed to save budget settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monthly Budget Planning</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optimize your spend limits and track category allocations for {new Date().toLocaleString("default", { month: "long", year: "numeric" })}.
          </p>
        </div>
      </div>

      {/* Main Budget Progress and Forecast Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Total Budget Ring/Progress */}
        <div className="md:col-span-2 border border-border bg-card/40 backdrop-blur rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Budget Utilization
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-semibold",
                  totalPercent > 90
                    ? "bg-rose-500/10 text-rose-500"
                    : totalPercent > 70
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                {totalPercent}% Used
              </span>
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold tracking-tight">
                {currencySymbol}
                {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-sm text-muted-foreground">
                of {currencySymbol}
                {totalLimit.toLocaleString()} limit
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  totalPercent > 90 ? "bg-rose-500" : totalPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${totalPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>{currencySymbol}0</span>
              <span>{currencySymbol}{totalLimit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Forecast Card */}
        <div className="border border-border bg-card/40 backdrop-blur rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-[10px] font-semibold">
              <Calculator className="h-3 w-3 mr-1" />
              <span>Smart Forecast</span>
            </div>
            <h3 className="text-md font-bold">Daily Outlay Planner</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on your remaining budget of <strong className="text-foreground">{currencySymbol}{remainingBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> and <strong className="text-foreground">{remainingDays} days</strong> left in this month.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
              Suggested Daily Cap
            </span>
            <span className="text-2xl font-black tracking-tight text-indigo-400 block mt-1">
              {currencySymbol}
              {forecastDailyAllowance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Category Limits Breakdowns */}
      <div className="border border-border bg-card/20 backdrop-blur rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Category Spending Progress
          </h3>
          <button
            onClick={handleOpenConfig}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <PenSquare className="h-3.5 w-3.5 mr-1" />
            Configure Limits
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(categoryLimits).map(([catName, limit]) => {
            const spent = currentSpend[catName] || 0;
            const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const isOverspent = spent > limit && limit > 0;

            return (
              <div key={catName} className="space-y-2 border border-border bg-card/10 rounded-xl p-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold">{catName}</span>
                  <span className="text-muted-foreground">
                    {currencySymbol}{spent.toLocaleString()} /{" "}
                    <span className="font-semibold text-foreground">{currencySymbol}{limit.toLocaleString()}</span>
                  </span>
                </div>

                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isOverspent ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                  />
                </div>

                {isOverspent && (
                  <div className="flex items-center text-[10px] text-rose-500 font-semibold mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Overspending by {currencySymbol}{(spent - limit).toLocaleString()}!
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(categoryLimits).length === 0 && (
            <p className="col-span-2 text-xs text-muted-foreground italic text-center py-6">
              No categories configured. Click &quot;Configure Limits&quot; to define spending categories.
            </p>
          )}
        </div>
      </div>

      {/* CONFIGURE LIMITS MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowConfigModal(false)}
          />
          <div className="glass relative w-full max-w-lg bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Configure Spend Limits</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block" htmlFor="total-limit">
                  Total Monthly Limit ({currencySymbol})
                </label>
                <input
                  id="total-limit"
                  type="number"
                  placeholder="e.g. 15000"
                  value={totalLimitVal}
                  onChange={(e) => setTotalLimitVal(Number(e.target.value) || 0)}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Category Limit Allocations
                </span>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {categoryItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="e.g. Food & Canteen, Rent"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...categoryItems];
                          updated[index].name = e.target.value;
                          setCategoryItems(updated);
                        }}
                        className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Limit"
                        value={item.limit}
                        onChange={(e) => {
                          const updated = [...categoryItems];
                          updated[index].limit = Number(e.target.value) || 0;
                          setCategoryItems(updated);
                        }}
                        className="w-28 px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryItems(categoryItems.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer shrink-0"
                        title="Remove category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {categoryItems.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                      No category rules added. Click the button below to add custom rules.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCategoryItems([...categoryItems, { name: "", limit: 1000 }])}
                  className="w-full flex items-center justify-center p-2 border border-dashed border-border rounded-lg text-xs font-semibold hover:bg-muted text-indigo-400 gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Category Limit
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Save Configurations"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
