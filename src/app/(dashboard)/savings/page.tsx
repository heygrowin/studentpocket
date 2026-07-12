"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Plus,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Check,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SavingsGoal } from "@/types/finance";

// Zod schemas
const goalSchema = zod.object({
  name: zod.string().min(2, "Goal name must be at least 2 characters"),
  targetAmount: zod.number().positive("Target amount must be positive"),
  deadline: zod.string().min(1, "Deadline date is required"),
});

type GoalFormFields = zod.infer<typeof goalSchema>;

const transferSchema = zod.object({
  amount: zod.number().positive("Amount must be positive"),
  accountId: zod.string().min(1, "Please select an account"),
});

type TransferFormFields = zod.infer<typeof transferSchema>;

export default function SavingsPage() {
  const { user, profile } = useAuthStore();
  const {
    accounts,
    savingsGoals,
    createSavingsGoal,
    depositToSavingsVault,
    withdrawFromSavingsVault,
    deleteSavingsGoal
  } = useFinanceStore();

  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // State controls
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forms setup
  const {
    register: registerGoal,
    handleSubmit: handleSubmitGoal,
    reset: resetGoal,
    formState: { errors: goalErrors },
  } = useForm<GoalFormFields>({
    resolver: zodResolver(goalSchema),
  });

  const {
    register: registerTransfer,
    handleSubmit: handleSubmitTransfer,
    reset: resetTransfer,
    formState: { errors: transferErrors },
  } = useForm<TransferFormFields>({
    resolver: zodResolver(transferSchema),
  });

  // Action Handlers
  const handleCreateGoal = async (data: GoalFormFields) => {
    if (!user) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createSavingsGoal(user.uid, {
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: 0,
        deadline: data.deadline,
      });
      setShowGoalModal(false);
      resetGoal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create savings goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete the savings vault "${goal.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteSavingsGoal(user.uid, goal.id);
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete savings goal.");
    }
  };

  const handleDepositSubmit = async (data: TransferFormFields) => {
    if (!user || !activeGoal) return;
    setSubmitting(true);
    setErrorMsg(null);

    const sourceAcc = accounts.find((a) => a.id === data.accountId);
    if (!sourceAcc || sourceAcc.balance < data.amount) {
      setErrorMsg("Insufficient balance in the chosen source account.");
      setSubmitting(false);
      return;
    }

    try {
      await depositToSavingsVault(user.uid, activeGoal.id, data.amount, data.accountId);
      setShowDepositModal(false);
      resetTransfer();
      setActiveGoal(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to deposit into goal vault.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (data: TransferFormFields) => {
    if (!user || !activeGoal) return;
    setSubmitting(true);
    setErrorMsg(null);

    if (activeGoal.currentAmount < data.amount) {
      setErrorMsg("Withdrawal exceeds active goal vault balance.");
      setSubmitting(false);
      return;
    }

    try {
      await withdrawFromSavingsVault(user.uid, activeGoal.id, data.amount, data.accountId);
      setShowWithdrawModal(false);
      resetTransfer();
      setActiveGoal(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to withdraw from goal vault.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Savings Goals Vaults</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lock allowances or freelance earnings into specific savings vaults for your study gear, travel, or emergencies.
          </p>
        </div>
        <button
          onClick={() => setShowGoalModal(true)}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Savings Goal
        </button>
      </div>

      {/* Goals grid display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {savingsGoals.length === 0 ? (
          <div className="col-span-full border border-dashed border-border bg-card/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <PiggyBank className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">No Active Savings Goals</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Create a savings target (e.g. &ldquo;Study Laptop&rdquo; or &ldquo;Winter Flight Home&rdquo;) and fund it from your bank card.
              </p>
            </div>
            <button
              onClick={() => setShowGoalModal(true)}
              className="text-xs font-semibold text-primary hover:underline flex items-center cursor-pointer"
            >
              Create first goal
              <Plus className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>
        ) : (
          savingsGoals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) || 0;
            const isAchieved = goal.status === "achieved" || goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className={cn(
                  "border rounded-2xl p-5 bg-card/40 backdrop-blur shadow-sm flex flex-col justify-between space-y-5 transition-transform hover:scale-[1.01]",
                  isAchieved ? "border-emerald-500/20 shadow-emerald-500/5" : "border-border"
                )}
              >
                {/* Info block */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-md leading-tight">{goal.name}</h3>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleDeleteGoal(goal)}
                        className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors cursor-pointer"
                        title="Delete Vault Goal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isAchieved ? (
                        <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Target Met
                        </span>
                      ) : (
                        <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Target: {goal.deadline}
                  </span>
                </div>

                {/* Progress block */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>
                      {currencySymbol}
                      {goal.currentAmount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      of {currencySymbol}
                      {goal.targetAmount.toLocaleString()} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isAchieved ? "bg-emerald-500" : "bg-indigo-500"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Transfer Actions */}
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => {
                      setActiveGoal(goal);
                      setShowDepositModal(true);
                    }}
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/70 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <TrendingDown className="h-3.5 w-3.5 mr-1 text-rose-500" />
                    Add Funds
                  </button>
                  <button
                    onClick={() => {
                      setActiveGoal(goal);
                      setShowWithdrawModal(true);
                    }}
                    disabled={goal.currentAmount === 0}
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/70 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE SAVINGS GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowGoalModal(false)}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">New Savings Goal</h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitGoal(handleCreateGoal)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goal-name">
                  Goal Name
                </label>
                <input
                  id="goal-name"
                  type="text"
                  placeholder="e.g. Study Abroad Visa, Apple Macbook"
                  {...registerGoal("name")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                />
                {goalErrors.name && (
                  <p className="mt-1 text-xs text-destructive">{goalErrors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="goal-target">
                    Target Target ({currencySymbol})
                  </label>
                  <input
                    id="goal-target"
                    type="number"
                    placeholder="0.00"
                    {...registerGoal("targetAmount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {goalErrors.targetAmount && (
                    <p className="mt-1 text-xs text-destructive">{goalErrors.targetAmount.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="goal-deadline">
                    Target Date
                  </label>
                  <input
                    id="goal-deadline"
                    type="date"
                    {...registerGoal("deadline")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {goalErrors.deadline && (
                    <p className="mt-1 text-xs text-destructive">{goalErrors.deadline.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Savings Goal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT TO VAULT DIALOG */}
      {showDepositModal && activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowDepositModal(false);
              setActiveGoal(null);
            }}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Allocate Funds to: {activeGoal.name}</h3>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setActiveGoal(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitTransfer(handleDepositSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="dep-amount">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    id="dep-amount"
                    type="number"
                    placeholder="0.00"
                    {...registerTransfer("amount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {transferErrors.amount && (
                    <p className="mt-1 text-xs text-destructive">{transferErrors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="dep-account">
                    Source Account
                  </label>
                  <select
                    id="dep-account"
                    {...registerTransfer("accountId")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((a) => a.type !== "loan")
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({currencySymbol}{acc.balance})
                        </option>
                      ))}
                  </select>
                  {transferErrors.accountId && (
                    <p className="mt-1 text-xs text-destructive">{transferErrors.accountId.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Deposit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW FROM VAULT DIALOG */}
      {showWithdrawModal && activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowWithdrawModal(false);
              setActiveGoal(null);
            }}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Draw down from: {activeGoal.name}</h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setActiveGoal(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitTransfer(handleWithdrawSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="wd-amount">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    id="wd-amount"
                    type="number"
                    placeholder={`Max ${activeGoal.currentAmount}`}
                    {...registerTransfer("amount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {transferErrors.amount && (
                    <p className="mt-1 text-xs text-destructive">{transferErrors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="wd-account">
                    Destination Account
                  </label>
                  <select
                    id="wd-account"
                    {...registerTransfer("accountId")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((a) => a.type !== "loan")
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({currencySymbol}{acc.balance})
                        </option>
                      ))}
                  </select>
                  {transferErrors.accountId && (
                    <p className="mt-1 text-xs text-destructive">{transferErrors.accountId.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Withdrawal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
