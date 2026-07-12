"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { saveAlertThreshold, deleteAlertThreshold } from "@/lib/firebase/financeService";
import {
  Settings,
  Bell,
  Wallet,
  Check,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  X,
  Sparkles,
  GraduationCap
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, setProfile } = useAuthStore();
  const { alertThresholds, accounts } = useFinanceStore();
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [addingThreshold, setAddingThreshold] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // Local state for currency
  const [selectedCurrency, setSelectedCurrency] = useState(profile?.currency || "INR");
  
  // Local state for new threshold
  const [thresholdType, setThresholdType] = useState<"low_balance" | "budget_limit">("low_balance");
  const [targetId, setTargetId] = useState("");
  const [thresholdValue, setThresholdValue] = useState(1000);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!user) return null;

  const currencySymbol = selectedCurrency === "EUR" ? "€" : selectedCurrency === "USD" ? "$" : "₹";

  const handleUpdateCurrency = async () => {
    setUpdatingProfile(true);
    setMsg(null);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { currency: selectedCurrency }, { merge: true });
      if (profile) {
        setProfile({ ...profile, currency: selectedCurrency });
      }
      setMsg({ text: "Primary Currency updated successfully!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to update currency settings.", type: "error" });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAddThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingThreshold(true);
    setMsg(null);
    try {
      const target = targetId || (thresholdType === "low_balance" ? (accounts[0]?.id || "Cash") : "Food");
      await saveAlertThreshold(user.uid, {
        type: thresholdType,
        targetId: target,
        thresholdValue,
        isEnabled: true
      });
      setMsg({ text: "Alert threshold rule added successfully!", type: "success" });
      setTargetId("");
      setThresholdValue(1000);
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to create alert threshold.", type: "error" });
    } finally {
      setAddingThreshold(false);
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    try {
      await deleteAlertThreshold(user.uid, id);
      setMsg({ text: "Threshold rule removed.", type: "success" });
    } catch (err) {
      console.error(err);
      setMsg({ text: "Failed to delete threshold rule.", type: "error" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center">
          <Settings className="mr-2 h-6 w-6 text-indigo-400" />
          Settings & Configurations
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure currency limits, theme profiles, and balance-budget warnings.
        </p>
      </div>

      {msg && (
        <div className={`rounded-xl border p-4 text-xs font-semibold animate-slide-in flex items-center ${
          msg.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
            : "bg-destructive/10 border-destructive/20 text-destructive"
        }`}>
          {msg.type === "success" ? <Check className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings Card */}
        <div className="glass border border-border bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
            <Wallet className="h-4 w-4 mr-1.5 text-indigo-400" />
            General Profile Configurations
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Student Full Name</label>
              <input
                type="text"
                disabled
                value={profile?.displayName || "Loading..."}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Registered Email</label>
              <input
                type="text"
                disabled
                value={user.email || ""}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block" htmlFor="settings-currency">
                Base Currency Symbol
              </label>
              <div className="flex gap-2 mt-1">
                <select
                  id="settings-currency"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                </select>
                <button
                  onClick={handleUpdateCurrency}
                  disabled={updatingProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {updatingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Threshold Rules */}
        <div className="glass border border-border bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
            <Bell className="h-4 w-4 mr-1.5 text-indigo-400" />
            Budget & Wallet Alert Triggers
          </h3>

          {/* Alert Threshold List */}
          <div className="space-y-2">
            {alertThresholds.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed border-border rounded-xl">
                No active threshold warning rules defined. Define triggers below.
              </p>
            ) : (
              alertThresholds.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-border bg-background/50 rounded-xl text-xs">
                  <div>
                    <span className="font-bold capitalize text-foreground">
                      {t.type === "low_balance" ? "Low Balance Warning" : "Budget Overrun Limit"}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Triggers warning below: {currencySymbol}{t.thresholdValue.toLocaleString()} ({
                        t.type === "low_balance" 
                          ? accounts.find(a => a.id === t.targetId)?.name || "Wallet" 
                          : t.targetId
                      })
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteThreshold(t.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Remove rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Form to Add Rule */}
          <form onSubmit={handleAddThreshold} className="border-t border-border pt-4 space-y-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Add Warning Trigger</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase" htmlFor="rule-type">Warning Type</label>
                <select
                  id="rule-type"
                  value={thresholdType}
                  onChange={(e) => setThresholdType(e.target.value as any)}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-[11px] font-semibold focus:outline-none"
                >
                  <option value="low_balance">Low Cash Wallet</option>
                  <option value="budget_limit">Budget Category spent</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase" htmlFor="rule-target">Target Scope</label>
                {thresholdType === "low_balance" ? (
                  <select
                    id="rule-target"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-[11px] font-semibold focus:outline-none"
                    required
                  >
                    <option value="">Select Account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    id="rule-target"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-[11px] font-semibold focus:outline-none"
                    required
                  >
                    <option value="">Select Category...</option>
                    {["Food", "Groceries", "Rent", "Transport", "Shopping", "Books & Study", "Entertainment", "Medical", "Utilities", "Other"].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase" htmlFor="rule-val">
                Limit Threshold Amount ({currencySymbol})
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id="rule-val"
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value) || 0)}
                  className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={addingThreshold || accounts.length === 0}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 flex items-center justify-center cursor-pointer disabled:opacity-40"
                >
                  {addingThreshold ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Setup & Feature Guide Card */}
      <div className="glass border border-border bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
              <Settings className="h-4 w-4 mr-1.5 text-indigo-400" />
              Setup & Feature Guide
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Need a quick reference on natural logs, GPay/Paytm scans, student loans, or parental access permissions?
            </p>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer shrink-0 hover:scale-[1.01]"
          >
            Open Setup & Feature Guide
          </button>
        </div>
      </div>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowGuideModal(false)}
          />
          <div className="glass relative w-full max-w-4xl bg-card rounded-2xl p-6 sm:p-8 shadow-2xl animate-slide-in space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                <h3 className="text-lg font-bold text-foreground">First-Time Setup & Feature Guide</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 text-xs leading-relaxed text-muted-foreground">
              <p>
                Welcome to Student Pocket! Here is a quick reference guide on how to configure and utilize the platform's advanced features:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border-t border-border pt-4">
                <div className="space-y-1.5">
                  <span className="font-bold text-indigo-400 block">1. Setup Accounts</span>
                  <p>
                    Deploy Cash, Bank, or Savings Vaults in the <strong>Transactions</strong> page to track pocket money, stipends, and allowances.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-indigo-400 block">2. Speak or Type Logs</span>
                  <p>
                    Directly type or speak entries like <strong>"purchased Chai 30"</strong> or <strong>"Salary received 5000"</strong> in the entry bar to auto-detect details instantly.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-indigo-400 block">3. Image Scan</span>
                  <p>
                    Upload payment confirmation screenshots (GPay, Paytm) or bank SMS alerts to auto-parse details (processed locally; no image data is uploaded).
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-indigo-400 block">4. Student Loans</span>
                  <p>
                    Simulate education loans, repayment structures, and draw disbursements directly into active accounts or savings vaults.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-indigo-400 block">5. Parent Access</span>
                  <p>
                    Share secure read-only permission keys with parents to track college budgets transparently from their portal.
                  </p>
                </div>
              </div>

              <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2 mt-4">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                  <GraduationCap className="h-4 w-4" />
                  <span>How the Student Loan Tracker Works</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-border text-[11px]">
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">1. Register Loan Limit</span>
                    <p>Add your approved credit limit, nominal interest rate, and expected monthly EMI repayment details.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">2. Draw Disbursements</span>
                    <p>Draw approved funds into active Bank, Cash, or Savings Vaults, instantly increasing your cash balances.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">3. Make Repayments</span>
                    <p>Log payments against outstanding debt directly from any liquid card or savings vault to decrease your overall loan balance.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">4. Interest Simulator</span>
                    <p>Simulate interest rates and deferment cycles up to 10 years to understand compounding rates on outstanding debt.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 shadow-md transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
