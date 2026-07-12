"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  GraduationCap,
  Sparkles,
  Plus,
  ArrowRight,
  Calendar,
  AlertCircle,
  X,
  Loader2
} from "lucide-react";
import Link from "next/link";
import NLPInputBar from "@/components/transactions/NLPInputBar";
import AlertsBanner from "@/components/dashboard/AlertsBanner";

export default function DashboardPage() {
  const { profile, user } = useAuthStore();
  const { accounts, transactions, activeBudget, createAccount } = useFinanceStore();

  const [showAccModal, setShowAccModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [hasDismissedGuide, setHasDismissedGuide] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"cash" | "bank" | "savings">("bank");
  const [accBalance, setAccBalance] = useState(0);
  const [creatingAcc, setCreatingAcc] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("dismissedOnboardingGuide");
    if (dismissed === "true") {
      setHasDismissedGuide(true);
      setShowGuide(false);
    } else {
      setShowGuide(true);
    }
  }, []);

  const handleDismissGuide = () => {
    localStorage.setItem("dismissedOnboardingGuide", "true");
    setHasDismissedGuide(true);
    setShowGuide(false);
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accName.trim()) return;
    setCreatingAcc(true);
    try {
      await createAccount(user.uid, {
        name: accName.trim(),
        type: accType,
        balance: Number(accBalance) || 0,
      });
      setAccName("");
      setAccBalance(0);
      setShowAccModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create account.");
    } finally {
      setCreatingAcc(false);
    }
  };

  const displayName = profile?.displayName || user?.displayName || "Student";
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // 1. Calculate Core Financial Metrics dynamically
  const cashAccounts = accounts.filter((a) => a.type !== "loan");
  const totalBalance = cashAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const savingsAccounts = accounts.filter((a) => a.type === "savings");
  const totalSavings = savingsAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const loanAccounts = accounts.filter((a) => a.type === "loan");
  const totalLoans = loanAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  // Calculate monthly spending from actual transactions
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthTransactions = transactions.filter(
    (tx) => tx.date.startsWith(currentMonthStr)
  );
  
  const monthlyOutflows = currentMonthTransactions
    .filter((tx) => !["income", "salary", "freelancing", "scholarship", "refund", "loan_disbursement"].includes(tx.type))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const budgetLimit = activeBudget?.totalLimit || 15000;
  const budgetSpent = activeBudget
    ? Object.values(activeBudget.currentSpend || {}).reduce((acc, curr) => acc + curr, 0)
    : monthlyOutflows;
  const budgetPercent = Math.min(100, Math.round((budgetSpent / budgetLimit) * 100)) || 0;

  // Recent transactions list (capped at 5)
  const recentTransactions = transactions.slice(0, 5);

  const stats = [
    {
      title: "Current Balance",
      value: `${currencySymbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      description: `Across ${cashAccounts.length} liquid accounts`,
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Monthly Expense",
      value: `${currencySymbol}${monthlyOutflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      description: `Budget used: ${budgetPercent}%`,
      icon: ArrowDownRight,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Net Savings Vaults",
      value: `${currencySymbol}${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      description: `${savingsAccounts.length} goals running`,
      icon: PiggyBank,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Outstanding Loans",
      value: `${currencySymbol}${totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      description: `${loanAccounts.length} active education loans`,
      icon: GraduationCap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Dynamic warning alerts */}
      <AlertsBanner />

      {/* Welcome & Fast Actions */}
      <div className="border border-border bg-card/30 backdrop-blur rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome, {displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Student Pocket is monitoring your active cash balance.
            </p>
          </div>
        </div>

        {/* Command Console */}
        <div className="border-t border-border pt-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Intelligent Quick Entry Console
          </span>
          <NLPInputBar />
        </div>
      </div>

      {/* Onboarding State vs Dynamic View */}
      {!hasDismissedGuide && accounts.length === 0 && (
        <div className="border border-border bg-card/30 backdrop-blur rounded-2xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto animate-slide-in relative">
          <button
            onClick={handleDismissGuide}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Dismiss Guide Permanently"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">First-Time Setup & Overview Guide</h3>
              <p className="text-xs text-muted-foreground max-w-md mt-1">
                Welcome to Student Pocket! Here is how you can manage your college expenses, allowances, and education loans naturally.
              </p>
            </div>
          </div>

          {/* Step list tutorial */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border-y border-border py-6 text-xs leading-relaxed">
            <div className="space-y-1.5">
              <span className="font-bold text-indigo-400 block">1. Setup Accounts</span>
              <p className="text-muted-foreground">
                Deploy Cash, Bank, or Savings Vaults to track pocket money, stipends, and allowances.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-indigo-400 block">2. Speak or Type Logs</span>
              <p className="text-muted-foreground">
                Directly type or speak entries like <strong>"purchesed Chai 30"</strong> or <strong>"Salary recived 5000"</strong> in the bar to auto-detect details instantly.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-indigo-400 block">3. Image Scan</span>
              <p className="text-muted-foreground">
                Upload payment confirmation screenshots (GPay, Paytm) or bank SMS alerts to auto-parse details (processed locally; no image data is uploaded).
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-indigo-400 block">4. Student Loans</span>
              <p className="text-muted-foreground">
                Simulate education loans, repayment structures, and draw disbursements directly into vaults.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-indigo-400 block">5. Parent Access</span>
              <p className="text-muted-foreground">
                Share secure read-only permission keys with parents to track college budgets transparently.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowAccModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Cash / Bank Account Now
            </button>
          </div>
        </div>
      )}

      {/* KPI Grid - Compact Horizontal Layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="border border-border bg-card/50 backdrop-blur rounded-xl p-4 shadow-sm transition-transform duration-200 hover:scale-[1.01] flex items-center space-x-4 min-h-[76px]"
            >
              <div className={`h-10 w-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {stat.title}
                </span>
                <h3 className="text-lg font-black tracking-tight mt-0.5 truncate text-foreground">{stat.value}</h3>
                <p className="text-[9px] text-muted-foreground truncate leading-tight">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent ledger entries */}
          <div className="lg:col-span-2 border border-border bg-card/30 backdrop-blur rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-md font-bold">Recent Ledger Activity</h3>
                <Link
                  href="/transactions"
                  className="text-xs text-primary font-semibold hover:underline flex items-center cursor-pointer"
                >
                  View full ledger
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your 5 most recent income, transfer, and expense logs.
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-card/10">
                <span className="text-xs text-muted-foreground">No transactions logged yet.</span>
                <Link
                  href="/transactions"
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Log test expense
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card/10">
                {recentTransactions.map((tx) => {
                  const isOutflow = ![
                    "income",
                    "salary",
                    "freelancing",
                    "scholarship",
                    "refund",
                    "loan_disbursement",
                  ].includes(tx.type);

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 text-xs hover:bg-card/30 transition-colors"
                    >
                      <div>
                        <h4 className="font-semibold text-sm leading-none">{tx.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] text-foreground font-semibold">
                            {tx.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {tx.date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold text-sm leading-tight block ${
                            isOutflow ? "text-rose-500" : "text-emerald-500"
                          }`}
                        >
                          {isOutflow ? "-" : "+"}
                          {currencySymbol}
                          {tx.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {isOutflow
                            ? accounts.find((a) => a.id === tx.fromAccountId)?.name
                            : accounts.find((a) => a.id === tx.toAccountId)?.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick AI Advisor card */}
          <div className="border border-border bg-card/30 backdrop-blur rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1 rounded-full bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 text-xs font-medium">
                <Sparkles className="h-3 w-3 mr-1" />
                <span>AI Insights</span>
              </div>
              <h3 className="text-md font-bold">Smart Runout Calculator</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Student Pocket monitors your daily checkout velocity.
              </p>
            </div>

            {monthlyOutflows > 0 ? (
              <div className="space-y-4">
                <div className="bg-secondary/40 border border-border rounded-xl p-4 text-xs">
                  <p className="leading-relaxed">
                    At your current monthly spend velocity of{" "}
                    <strong>
                      {currencySymbol}
                      {Math.round(monthlyOutflows).toLocaleString()}
                    </strong>
                    , your liquid assets will last you until the end of this semester cycle.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Monthly Budget Limit</span>
                    <span>{budgetPercent}% Used</span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        budgetPercent > 90 ? "bg-rose-500" : budgetPercent > 70 ? "bg-amber-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-secondary/40 border border-border rounded-xl p-4 text-xs text-muted-foreground italic">
                &ldquo;Logging your initial expenses will trigger our AI advisor to calculate spend metrics and suggest budget adjustments.&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT DIALOG POPUP */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAccModal(false)}
          />
          <div className="glass relative w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-md font-bold">Create Liquidity Account</h3>
              <button
                onClick={() => setShowAccModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block" htmlFor="dashboard-acc-name">
                  Account Name / Label
                </label>
                <input
                  id="dashboard-acc-name"
                  type="text"
                  placeholder="e.g. SBI Checking, Cash Wallet"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block" htmlFor="dashboard-acc-type">
                    Account Type
                  </label>
                  <select
                    id="dashboard-acc-type"
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                  >
                    <option value="bank">Bank Checking</option>
                    <option value="cash">Cash Wallet</option>
                    <option value="savings">Savings Vault</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block" htmlFor="dashboard-acc-bal">
                    Opening Balance ({currencySymbol})
                  </label>
                  <input
                    id="dashboard-acc-bal"
                    type="number"
                    value={accBalance}
                    onChange={(e) => setAccBalance(Number(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingAcc || !accName.trim()}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {creatingAcc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
