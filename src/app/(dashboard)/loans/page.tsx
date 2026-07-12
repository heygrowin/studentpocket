"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Plus,
  GraduationCap,
  TrendingUp,
  CreditCard,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Calculator,
  Percent
} from "lucide-react";
import { EducationLoan } from "@/types/finance";

// Zod schemas
const loanSchema = zod.object({
  provider: zod.string().min(2, "Provider name must be at least 2 characters"),
  totalApproved: zod.number().positive("Approved amount must be positive"),
  interestRate: zod.number().positive("Interest rate must be positive"),
  emi: zod.number().nonnegative("EMI must be positive or 0"),
  repaymentStartDate: zod.string().optional(),
});

type LoanFormFields = zod.infer<typeof loanSchema>;

const actionSchema = zod.object({
  amount: zod.number().positive("Amount must be positive"),
  accountId: zod.string().min(1, "Please select an account"),
});

type ActionFormFields = zod.infer<typeof actionSchema>;

export default function LoansPage() {
  const { user, profile } = useAuthStore();
  const {
    accounts,
    loans,
    createLoan,
    disburseLoanAmount,
    repayLoanAmount,
    createAccount
  } = useFinanceStore();

  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // State controls
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [activeLoan, setActiveLoan] = useState<EducationLoan | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAccModal, setShowAccModal] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"cash" | "bank" | "savings">("bank");
  const [accBalance, setAccBalance] = useState(0);
  const [creatingAcc, setCreatingAcc] = useState(false);

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

  // Defer calculator state
  const [deferMonths, setDeferMonths] = useState(6);
  const [simulatedPrincipal, setSimulatedPrincipal] = useState(50000);
  const [simulatedRate, setSimulatedRate] = useState(9.5);

  // Forms setup
  const {
    register: registerLoan,
    handleSubmit: handleSubmitLoan,
    reset: resetLoan,
    formState: { errors: loanErrors },
  } = useForm<LoanFormFields>({
    resolver: zodResolver(loanSchema),
  });

  const {
    register: registerAction,
    handleSubmit: handleSubmitAction,
    reset: resetAction,
    formState: { errors: actionErrors },
  } = useForm<ActionFormFields>({
    resolver: zodResolver(actionSchema),
  });

  // Action handlers
  const handleCreateLoan = async (data: LoanFormFields) => {
    if (!user) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createLoan(user.uid, {
        provider: data.provider,
        totalApproved: data.totalApproved,
        disbursedAmount: 0,
        usedAmount: 0,
        interestRate: data.interestRate,
        emi: data.emi,
        repaymentStartDate: data.repaymentStartDate || "",
      });
      setShowLoanModal(false);
      resetLoan();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to register loan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseSubmit = async (data: ActionFormFields) => {
    if (!user || !activeLoan) return;
    setSubmitting(true);
    setErrorMsg(null);

    if (activeLoan.disbursedAmount + data.amount > activeLoan.totalApproved) {
      setErrorMsg("Disbursement exceeds total approved loan amount.");
      setSubmitting(false);
      return;
    }

    try {
      await disburseLoanAmount(user.uid, activeLoan.id, data.amount, data.accountId);
      setShowDisburseModal(false);
      resetAction();
      setActiveLoan(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to disburse loan funds.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaySubmit = async (data: ActionFormFields) => {
    if (!user || !activeLoan) return;
    setSubmitting(true);
    setErrorMsg(null);

    const sourceAcc = accounts.find((a) => a.id === data.accountId);
    if (!sourceAcc || sourceAcc.balance < data.amount) {
      setErrorMsg("Insufficient bank account balance for this payment.");
      setSubmitting(false);
      return;
    }

    try {
      await repayLoanAmount(user.uid, activeLoan.id, data.amount, data.accountId);
      setShowRepayModal(false);
      resetAction();
      setActiveLoan(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to log loan repayment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delayed repayment logic computations
  const calculateCompoundInterest = (principal: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12;
    const finalAmount = principal * Math.pow(1 + monthlyRate, months);
    const totalInterest = finalAmount - principal;
    return { finalAmount, totalInterest };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Education Loan Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trackapproved limits, draw down disbursements, calculate repayment EMIs, and simulate delayed interest parameters.
          </p>
        </div>
        <button
          onClick={() => setShowLoanModal(true)}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Loan Account
        </button>
      </div>

      {/* Loan System Explanation Guide Card */}
      <div className="border border-border bg-card/30 backdrop-blur rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400">
          <GraduationCap className="h-5 w-5 animate-pulse" />
          <h3 className="text-sm font-bold text-foreground">How the Student Loan Tracker Works</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs leading-relaxed border-t border-border pt-4">
          <div className="space-y-1">
            <span className="font-semibold text-indigo-400">1. Register Loan Limit</span>
            <p className="text-muted-foreground">
              Add your approved credit limit, nominal interest rate, and expected monthly EMI repayment details.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-indigo-400">2. Draw Disbursements</span>
            <p className="text-muted-foreground">
              Draw approved funds into your active Bank, Cash, or Savings Vaults. Drawn amounts automatically increase your current cash balance.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-indigo-400">3. Make Repayments</span>
            <p className="text-muted-foreground">
              Log payments against your outstanding debt directly from any liquid card or savings vault to decrease your overall loan balance.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-indigo-400">4. Interest Simulator</span>
            <p className="text-muted-foreground">
              Simulate interest rates and deferment cycles up to 10 years to understand compounding rates on your remaining balance.
            </p>
          </div>
        </div>
      </div>

      {/* Main Loan Widgets display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Loan Board list */}
        <div className="lg:col-span-2 space-y-4">
          {loans.length === 0 ? (
            <div className="border border-dashed border-border bg-card/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm">No Active Loan Accounts</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Add your approved student loan parameters to track outstanding balances and EMIs.
                </p>
              </div>
              <button
                onClick={() => setShowLoanModal(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center"
              >
                Configure loan card
                <Plus className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          ) : (
            loans.map((loan) => {
              const disbursedPercent = Math.min(100, Math.round((loan.disbursedAmount / loan.totalApproved) * 100)) || 0;
              const remainingUndrawn = Math.max(0, loan.totalApproved - loan.disbursedAmount);

              return (
                <div key={loan.id} className="border border-border bg-card/40 backdrop-blur rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Title block */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-lg">{loan.provider} Education Loan</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Percent className="h-3.5 w-3.5 mr-1" />
                          Rate: {loan.interestRate}%
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Repay start: {loan.repaymentStartDate || "Immediate"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-bold self-start sm:self-center shrink-0">
                      Monthly EMI: {currencySymbol}{loan.emi.toLocaleString()}
                    </span>
                  </div>

                  {/* Visual limit lines */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Disbursed: {currencySymbol}{loan.disbursedAmount.toLocaleString()}</span>
                      <span className="text-muted-foreground">
                        Limit: {currencySymbol}{loan.totalApproved.toLocaleString()} ({disbursedPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${disbursedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Outstanding Debt: {currencySymbol}{loan.disbursedAmount.toLocaleString()}</span>
                      <span>Available Credit: {currencySymbol}{remainingUndrawn.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions Drawer */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => {
                        setActiveLoan(loan);
                        setShowDisburseModal(true);
                      }}
                      disabled={remainingUndrawn === 0}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/70 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1 text-indigo-400" />
                      Draw Disbursed Funds
                    </button>
                    <button
                      onClick={() => {
                        setActiveLoan(loan);
                        setShowRepayModal(true);
                      }}
                      disabled={loan.disbursedAmount === 0}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/70 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 mr-1 text-emerald-400" />
                      Make EMI Payment
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Defer Simulator Card */}
        <div className="border border-border bg-card/40 backdrop-blur rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-[10px] font-semibold">
              <Calculator className="h-3 w-3 mr-1" />
              <span>Study Simulator</span>
            </div>
            <h3 className="text-md font-bold">Defer repayment Simulator</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you defer or delay payments post-graduation, interest accumulates. Move sliders to check compounding numbers.
            </p>
          </div>

          <div className="space-y-5">
            {/* Principal slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>Disbursed Debt ({currencySymbol})</span>
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  value={simulatedPrincipal}
                  onChange={(e) => setSimulatedPrincipal(Number(e.target.value) || 0)}
                  className="w-32 px-2.5 py-1 text-right border border-border bg-background rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="range"
                min="10000"
                max="3000000"
                step="25000"
                value={Math.min(3000000, simulatedPrincipal)}
                onChange={(e) => setSimulatedPrincipal(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Interest Rate slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Simulated Annual Interest</span>
                <span>{simulatedRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.1"
                value={simulatedRate}
                onChange={(e) => setSimulatedRate(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Delay slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Delay Repayment by</span>
                <span>
                  {(() => {
                    const delayYears = Math.floor(deferMonths / 12);
                    const delayRemainingMonths = deferMonths % 12;
                    return delayYears > 0 
                      ? `${deferMonths} Mo (${delayYears} yr${delayRemainingMonths > 0 ? ` ${delayRemainingMonths} mo` : ""})`
                      : `${deferMonths} Months`;
                  })()}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="120"
                step="1"
                value={deferMonths}
                onChange={(e) => setDeferMonths(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Results Block */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-muted-foreground">Accumulated Interest:</span>
              <span className="text-rose-500">
                +{currencySymbol}
                {calculateCompoundInterest(simulatedPrincipal, simulatedRate, deferMonths).totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-dashed border-border pt-2 text-foreground">
              <span>Total Payable Principal:</span>
              <span>
                {currencySymbol}
                {calculateCompoundInterest(simulatedPrincipal, simulatedRate, deferMonths).finalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE LOAN DIALOG */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowLoanModal(false)}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">New Education Loan</h3>
              <button
                onClick={() => setShowLoanModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center animate-slide-in">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitLoan(handleCreateLoan)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="loan-prov">
                  Loan Provider / Bank
                </label>
                <input
                  id="loan-prov"
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI Student Loan"
                  {...registerLoan("provider")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                />
                {loanErrors.provider && (
                  <p className="mt-1 text-xs text-destructive">{loanErrors.provider.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="loan-total">
                    Total Approved Limit ({currencySymbol})
                  </label>
                  <input
                    id="loan-total"
                    type="number"
                    placeholder="0.00"
                    {...registerLoan("totalApproved", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {loanErrors.totalApproved && (
                    <p className="mt-1 text-xs text-destructive">{loanErrors.totalApproved.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="loan-rate">
                    Interest Rate (Annual %)
                  </label>
                  <input
                    id="loan-rate"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 9.5"
                    {...registerLoan("interestRate", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {loanErrors.interestRate && (
                    <p className="mt-1 text-xs text-destructive">{loanErrors.interestRate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="loan-emi">
                    Estimated EMI ({currencySymbol})
                  </label>
                  <input
                    id="loan-emi"
                    type="number"
                    placeholder="0.00"
                    {...registerLoan("emi", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {loanErrors.emi && (
                    <p className="mt-1 text-xs text-destructive">{loanErrors.emi.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="loan-start">
                    Repayment Start Date
                  </label>
                  <input
                    id="loan-start"
                    type="date"
                    {...registerLoan("repaymentStartDate")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Loan Card"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSEMENT INPUT PANEL */}
      {showDisburseModal && activeLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowDisburseModal(false);
              setActiveLoan(null);
            }}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Draw Disbursement - {activeLoan.provider}</h3>
              <button
                onClick={() => {
                  setShowDisburseModal(false);
                  setActiveLoan(null);
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

            <form onSubmit={handleSubmitAction(handleDisburseSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="dis-amount">
                    Disbursement Amount ({currencySymbol})
                  </label>
                  <input
                    id="dis-amount"
                    type="number"
                    placeholder="0.00"
                    {...registerAction("amount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {actionErrors.amount && (
                    <p className="mt-1 text-xs text-destructive">{actionErrors.amount.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="dis-account">
                      Deposit Account (Liquid)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccModal(true)}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      + Create Account
                    </button>
                  </div>
                  <select
                    id="dis-account"
                    {...registerAction("accountId")}
                    className="block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
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
                  {actionErrors.accountId && (
                    <p className="mt-1 text-xs text-destructive">{actionErrors.accountId.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Disbursement"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPAYMENT EMI PANEL */}
      {showRepayModal && activeLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowRepayModal(false);
              setActiveLoan(null);
            }}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Repay Loan Debt - {activeLoan.provider}</h3>
              <button
                onClick={() => {
                  setShowRepayModal(false);
                  setActiveLoan(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center animate-slide-in">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitAction(handleRepaySubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="rep-amount">
                    Repayment Amount ({currencySymbol})
                  </label>
                  <input
                    id="rep-amount"
                    type="number"
                    placeholder={`EMI: ${activeLoan.emi}`}
                    {...registerAction("amount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {actionErrors.amount && (
                    <p className="mt-1 text-xs text-destructive">{actionErrors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="rep-account">
                    Pay Account (Liquid Source)
                  </label>
                  <select
                    id="rep-account"
                    {...registerAction("accountId")}
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
                  {actionErrors.accountId && (
                    <p className="mt-1 text-xs text-destructive">{actionErrors.accountId.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm EMI Repayment"}
              </button>
            </form>
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
                <label className="text-xs font-semibold text-muted-foreground block" htmlFor="loans-acc-name">
                  Account Name / Label
                </label>
                <input
                  id="loans-acc-name"
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
                  <label className="text-xs font-semibold text-muted-foreground block" htmlFor="loans-acc-type">
                    Account Type
                  </label>
                  <select
                    id="loans-acc-type"
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
                  <label className="text-xs font-semibold text-muted-foreground block" htmlFor="loans-acc-bal">
                    Opening Balance ({currencySymbol})
                  </label>
                  <input
                    id="loans-acc-bal"
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
