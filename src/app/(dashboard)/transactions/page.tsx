"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  X,
  CreditCard,
  Calendar,
  Tag,
  FileText,
  Loader2,
  AlertCircle,
  Scan,
  Edit2
} from "lucide-react";
import { Transaction, FinancialAccount, TransactionType, AccountType } from "@/types/finance";
import ReceiptScanner from "@/components/transactions/ReceiptScanner";
import AlertsBanner from "@/components/dashboard/AlertsBanner";

// Zod schemas for validation
const transactionSchema = zod.object({
  title: zod.string().min(2, "Title must be at least 2 characters"),
  amount: zod.number().positive("Amount must be positive"),
  type: zod.enum([
    "income",
    "expense",
    "transfer",
    "loan_disbursement",
    "loan_usage",
    "salary",
    "freelancing",
    "scholarship",
    "refund",
    "emergency"
  ] as const),
  category: zod.string().min(1, "Please select a category"),
  fromAccountId: zod.string().optional(),
  toAccountId: zod.string().optional(),
  date: zod.string().min(1, "Date is required"),
  notes: zod.string().optional(),
  tagsInput: zod.string().optional(),
});

type TransactionFormFields = zod.infer<typeof transactionSchema>;

const accountSchema = zod.object({
  name: zod.string().min(2, "Account name must be at least 2 characters"),
  type: zod.enum(["cash", "bank", "savings", "loan"] as const),
  balance: zod.number(),
});

type AccountFormFields = zod.infer<typeof accountSchema>;

export default function TransactionsPage() {
  const { user, profile } = useAuthStore();
  const {
    accounts,
    transactions,
    createAccount,
    updateAccount,
    deleteAccount,
    createTransaction,
    removeTransaction
  } = useFinanceStore();

  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // State controls
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedEditAccount, setSelectedEditAccount] = useState<FinancialAccount | null>(null);
  const [showEditAccModal, setShowEditAccModal] = useState(false);
  const [editAccName, setEditAccName] = useState("");
  const [editAccType, setEditAccType] = useState<"cash" | "bank" | "savings" | "loan">("bank");
  const [editAccBalance, setEditAccBalance] = useState(0);
  const [editAccSubmitting, setEditAccSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [accSubmitting, setAccSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Client-side CSV Exporter
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Title", "Amount", "Type", "Category", "Date", "Notes"];
    const csvRows = [headers.join(",")];

    transactions.forEach((tx) => {
      const values = [
        `"${tx.title.replace(/"/g, '""')}"`,
        tx.amount,
        tx.type,
        `"${tx.category}"`,
        tx.date,
        `"${(tx.notes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_pocket_statement_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side Custom PDF Exporter
  const handleExportPDF = () => {
    if (transactions.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF statement.");
      return;
    }

    const tableRows = transactions
      .map(
        (tx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 10px 0; text-align: left; color: #475569;">${tx.date}</td>
          <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${tx.title}</td>
          <td style="padding: 10px 0; color: #475569;">${tx.category}</td>
          <td style="padding: 10px 0; text-transform: capitalize; color: #64748b;">${tx.type}</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: ${
            tx.type === "expense" ? "#ef4444" : "#10b981"
          }">
            ${tx.type === "expense" ? "-" : "+"}${currencySymbol}${tx.amount.toLocaleString()}
          </td>
        </tr>
      `
      )
      .join("");

    const totalInflow = transactions
      .filter((t) => !["expense", "loan_usage"].includes(t.type))
      .reduce((acc, c) => acc + c.amount, 0);

    const totalOutflow = transactions
      .filter((t) => ["expense", "loan_usage"].includes(t.type))
      .reduce((acc, c) => acc + c.amount, 0);

    const netSavings = totalInflow - totalOutflow;

    const htmlContent = `
      <html>
        <head>
          <title>Student Pocket Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: 800; color: #4f46e5; }
            .title { text-align: right; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
            .card-lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .card-val { font-size: 18px; font-weight: 855; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: left; }
            td { padding: 12px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Student Pocket</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Smart Student Financial Ledger</div>
            </div>
            <div class="title">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Financial Statement</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-lbl">Total Inflows</div>
              <div class="card-val" style="color: #10b981;">+${currencySymbol}${totalInflow.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Total Outflows</div>
              <div class="card-val" style="color: #ef4444;">-${currencySymbol}${totalOutflow.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-lbl">Net Capital Change</div>
              <div class="card-val" style="color: #4f46e5;">${netSavings >= 0 ? "+" : ""}${currencySymbol}${netSavings.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%; text-align: left;">Date</th>
                <th style="width: 35%; text-align: left;">Description</th>
                <th style="width: 20%; text-align: left;">Category</th>
                <th style="width: 15%; text-align: left;">Type</th>
                <th style="width: 15%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            This statement was generated automatically by Student Pocket.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Forms setup
  const {
    register: registerTx,
    handleSubmit: handleSubmitTx,
    watch: watchTx,
    reset: resetTx,
    formState: { errors: txErrors },
  } = useForm<TransactionFormFields>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      date: new Date().toISOString().split("T")[0],
      category: "Food",
    },
  });

  const {
    register: registerAcc,
    handleSubmit: handleSubmitAcc,
    reset: resetAcc,
    formState: { errors: accErrors },
  } = useForm<AccountFormFields>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: "bank",
      balance: 0,
    },
  });

  const selectedTxType = watchTx("type");

  // Handlers
  const handleTxSubmit = async (data: TransactionFormFields) => {
    if (!user) return;
    setTxSubmitting(true);
    setSubmitError(null);

    // Validate account selections depending on transaction type
    if (["expense", "transfer", "loan_usage", "emergency"].includes(data.type) && !data.fromAccountId) {
      setSubmitError("Please specify a source account.");
      setTxSubmitting(false);
      return;
    }
    if (["income", "transfer", "salary", "freelancing", "scholarship", "refund", "loan_disbursement"].includes(data.type) && !data.toAccountId) {
      setSubmitError("Please specify a destination account.");
      setTxSubmitting(false);
      return;
    }

    try {
      const tags = data.tagsInput
        ? data.tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [];

      await createTransaction(user.uid, {
        title: data.title,
        amount: data.amount,
        type: data.type as any,
        category: data.category,
        fromAccountId: data.fromAccountId || "",
        toAccountId: data.toAccountId || "",
        date: data.date,
        notes: data.notes || "",
        tags,
      });

      setShowTxModal(false);
      resetTx();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Failed to save transaction.");
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleAccSubmit = async (data: AccountFormFields) => {
    if (!user) return;
    setAccSubmitting(true);
    setSubmitError(null);
    try {
      await createAccount(user.uid, {
        name: data.name,
        type: data.type,
        balance: data.balance,
      });
      setShowAccModal(false);
      resetAcc();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Failed to create financial account.");
    } finally {
      setAccSubmitting(false);
    }
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEditAccount || !editAccName.trim()) return;
    setEditAccSubmitting(true);
    try {
      await updateAccount(user.uid, selectedEditAccount.id, {
        name: editAccName.trim(),
        type: editAccType,
        balance: Number(editAccBalance) || 0,
      });
      setShowEditAccModal(false);
      setSelectedEditAccount(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update account.");
    } finally {
      setEditAccSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !selectedEditAccount) return;
    if (!confirm(`Are you sure you want to delete the account "${selectedEditAccount.name}"? This action cannot be undone.`)) {
      return;
    }
    setEditAccSubmitting(true);
    try {
      await deleteAccount(user.uid, selectedEditAccount.id);
      setShowEditAccModal(false);
      setSelectedEditAccount(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete account.");
    } finally {
      setEditAccSubmitting(false);
    }
  };

  const handleDeleteTx = async (tx: Transaction) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this transaction? Balance adjustments will be reversed.")) {
      try {
        await removeTransaction(user.uid, tx);
      } catch (err) {
        console.error("Error deleting transaction:", err);
        alert("Failed to delete transaction. Please try again.");
      }
    }
  };

  // Filtered transactions computed property
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesAccount =
      accountFilter === "all" ||
      tx.fromAccountId === accountFilter ||
      tx.toAccountId === accountFilter;

    return matchesSearch && matchesType && matchesAccount;
  });

  const categories = [
    "Food",
    "Groceries",
    "Rent",
    "Hostel Fee",
    "Canteen",
    "Transport",
    "Shopping",
    "Books & Study",
    "Entertainment",
    "Utilities",
    "Medical",
    "Salary",
    "Freelance",
    "Parents Pocket Allow",
    "Scholarship",
    "Loan Outlay",
    "Savings Allocation",
    "Other",
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Dynamic warning alerts */}
      <AlertsBanner />

      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ledger & Transactions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log, filter, and audit your financial accounts and ledger entries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAccModal(true)}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card/60 backdrop-blur px-3.5 py-2 text-xs font-semibold hover:bg-muted shadow-sm transition-colors cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Add Account
          </button>
          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-indigo-600/10 text-indigo-400 px-3.5 py-2 text-xs font-semibold hover:bg-indigo-600/20 shadow-sm transition-colors cursor-pointer"
          >
            <Scan className="h-3.5 w-3.5 mr-1.5" />
            Scan Screenshot
          </button>
          <button
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card/60 backdrop-blur px-3.5 py-2 text-xs font-semibold hover:bg-muted shadow-sm transition-colors cursor-pointer disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={transactions.length === 0}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card/60 backdrop-blur px-3.5 py-2 text-xs font-semibold hover:bg-muted shadow-sm transition-colors cursor-pointer disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
            Export PDF
          </button>
          <button
            onClick={() => setShowTxModal(true)}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow-md transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {accounts.length === 0 ? (
          <div className="col-span-full border border-dashed border-border rounded-xl p-5 text-center bg-card/10">
            <p className="text-xs text-muted-foreground">
              No accounts registered yet. Click &quot;Add Account&quot; to set up Cash or Bank balances.
            </p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="border border-border bg-card/50 backdrop-blur rounded-xl p-4 shadow-sm relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[100px]" title={acc.name}>
                  {acc.name}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedEditAccount(acc);
                      setEditAccName(acc.name);
                      setEditAccType(acc.type);
                      setEditAccBalance(acc.balance);
                      setShowEditAccModal(true);
                    }}
                    className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                    title="Edit Account"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] bg-secondary text-foreground px-2 py-0.5 rounded-full capitalize font-semibold shrink-0">
                    {acc.type}
                  </span>
                </div>
              </div>
              <h4 className="text-lg font-bold mt-2">
                {currencySymbol}
                {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
          ))
        )}
      </div>

      {/* Filters HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card/30 border border-border rounded-xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, notes, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="salary">Salary</option>
            <option value="freelancing">Freelance</option>
            <option value="scholarship">Scholarship</option>
            <option value="loan_disbursement">Loan Disbursed</option>
            <option value="loan_usage">Loan Utilized</option>
            <option value="refund">Refund</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        {/* Account Filter */}
        <div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions History Ledger list */}
      <div className="border border-border bg-card/20 backdrop-blur rounded-2xl overflow-hidden shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
            <div>
              <h4 className="font-semibold text-sm">No transactions found</h4>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Try refining your filters or click &quot;Add Transaction&quot; to log a new finance record.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden">
            <AnimatePresence initial={false}>
              {filteredTransactions.map((tx) => {
                const isOutflow = ![
                  "income",
                  "salary",
                  "freelancing",
                  "scholarship",
                  "refund",
                  "loan_disbursement",
                ].includes(tx.type);

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between p-4 hover:bg-card/40 transition-colors overflow-hidden"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1 mr-2">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.type === "transfer"
                            ? "bg-muted text-muted-foreground"
                            : isOutflow
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {tx.type === "transfer" ? (
                          <ArrowRightLeft className="h-4 w-4" />
                        ) : isOutflow ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <h4 className="font-semibold text-sm truncate">{tx.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] bg-secondary text-foreground px-2 py-0.5 rounded font-semibold capitalize">
                            {tx.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {tx.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right shrink-0">
                        <h5
                          className={`font-bold text-sm leading-tight ${
                            tx.type === "transfer"
                              ? "text-foreground"
                              : isOutflow
                              ? "text-rose-500"
                              : "text-emerald-500"
                          }`}
                        >
                          {tx.type === "transfer" ? "" : isOutflow ? "-" : "+"}
                          {currencySymbol}
                          {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h5>
                        <span className="text-[10px] text-muted-foreground">
                          {tx.type === "transfer"
                            ? `${accounts.find((a) => a.id === tx.fromAccountId)?.name} → ${
                                accounts.find((a) => a.id === tx.toAccountId)?.name
                              }`
                            : isOutflow
                            ? accounts.find((a) => a.id === tx.fromAccountId)?.name
                            : accounts.find((a) => a.id === tx.toAccountId)?.name}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteTx(tx)}
                        className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ADD ACCOUNT DIALOG / MODAL */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAccModal(false)}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Add Financial Account</h3>
              <button
                onClick={() => setShowAccModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitAcc(handleAccSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="acc-name">
                  Account Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  placeholder="e.g. Bank Card, Wallet Cash"
                  {...registerAcc("name")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {accErrors.name && (
                  <p className="mt-1 text-xs text-destructive">{accErrors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="acc-type">
                    Account Type
                  </label>
                  <select
                    id="acc-type"
                    {...registerAcc("type")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="bank">Bank Card / UPI</option>
                    <option value="cash">Pocket Cash</option>
                    <option value="savings">Savings Vault</option>
                    <option value="loan">Loan Account</option>
                  </select>
                  {accErrors.type && (
                    <p className="mt-1 text-xs text-destructive">{accErrors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="acc-balance">
                    Starting Balance ({currencySymbol})
                  </label>
                  <input
                    id="acc-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...registerAcc("balance", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {accErrors.balance && (
                    <p className="mt-1 text-xs text-destructive">{accErrors.balance.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={accSubmitting}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {accSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD TRANSACTION DIALOG / MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowTxModal(false)}
          />
          <div className="glass relative w-full max-w-lg bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Log Transaction Entry</h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitTx(handleTxSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Title */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-title">
                    Transaction Title / Description
                  </label>
                  <input
                    id="tx-title"
                    type="text"
                    placeholder="e.g. Semester Exam Books, Monthly Rent"
                    {...registerTx("title")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {txErrors.title && (
                    <p className="mt-1 text-xs text-destructive">{txErrors.title.message}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-amount">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...registerTx("amount", { valueAsNumber: true })}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {txErrors.amount && (
                    <p className="mt-1 text-xs text-destructive">{txErrors.amount.message}</p>
                  )}
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-type">
                    Transaction Type
                  </label>
                  <select
                    id="tx-type"
                    {...registerTx("type")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">General Inflow</option>
                    <option value="transfer">Transfer (Internal)</option>
                    <option value="salary">Salary Payment</option>
                    <option value="freelancing">Freelance Earnings</option>
                    <option value="scholarship">Scholarship Deposit</option>
                    <option value="loan_disbursement">Loan Disbursement</option>
                    <option value="loan_usage">Loan Usage payment</option>
                    <option value="refund">Refund Received</option>
                    <option value="emergency">Emergency Outlay</option>
                  </select>
                  {txErrors.type && (
                    <p className="mt-1 text-xs text-destructive">{txErrors.type.message}</p>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-category">
                    Category
                  </label>
                  <select
                    id="tx-category"
                    {...registerTx("category")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {txErrors.category && (
                    <p className="mt-1 text-xs text-destructive">{txErrors.category.message}</p>
                  )}
                </div>

                {/* Date Selection */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-date">
                    Transaction Date
                  </label>
                  <input
                    id="tx-date"
                    type="date"
                    {...registerTx("date")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {txErrors.date && (
                    <p className="mt-1 text-xs text-destructive">{txErrors.date.message}</p>
                  )}
                </div>

                {/* Dynamic Accounts mapping based on type */}
                {/* Outflow Sources */}
                {["expense", "transfer", "loan_usage", "emergency"].includes(selectedTxType) && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-from">
                      Source Account (Paid From)
                    </label>
                    <select
                      id="tx-from"
                      {...registerTx("fromAccountId")}
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select source account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({currencySymbol}{acc.balance})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Inflow Destination */}
                {["income", "transfer", "salary", "freelancing", "scholarship", "refund", "loan_disbursement"].includes(selectedTxType) && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-to">
                      Destination Account (Deposited To)
                    </label>
                    <select
                      id="tx-to"
                      {...registerTx("toAccountId")}
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select destination account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({currencySymbol}{acc.balance})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-tags">
                  Tags (comma separated)
                </label>
                <div className="relative mt-1">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="tx-tags"
                    type="text"
                    placeholder="e.g. semester1, snacks, urgent"
                    {...registerTx("tagsInput")}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="tx-notes">
                  Optional Notes
                </label>
                <textarea
                  id="tx-notes"
                  rows={2}
                  placeholder="Details regarding transaction allowance splitting etc."
                  {...registerTx("notes")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={txSubmitting}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {txSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Add Transaction"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT DIALOG / MODAL */}
      {showEditAccModal && selectedEditAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowEditAccModal(false);
              setSelectedEditAccount(null);
            }}
          />
          <div className="glass relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-slide-in space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Edit Account Details</h3>
              <button
                onClick={() => {
                  setShowEditAccModal(false);
                  setSelectedEditAccount(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="edit-acc-name">
                  Account Name
                </label>
                <input
                  id="edit-acc-name"
                  type="text"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  placeholder="e.g. Bank Card, Wallet Cash"
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="edit-acc-type">
                    Account Type
                  </label>
                  <select
                    id="edit-acc-type"
                    value={editAccType}
                    onChange={(e) => setEditAccType(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="bank">Bank Card / UPI</option>
                    <option value="cash">Pocket Cash</option>
                    <option value="savings">Savings Vault</option>
                    <option value="loan">Loan Account</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="edit-acc-balance">
                    Balance ({currencySymbol})
                  </label>
                  <input
                    id="edit-acc-balance"
                    type="number"
                    step="0.01"
                    value={editAccBalance}
                    onChange={(e) => setEditAccBalance(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={editAccSubmitting}
                  className="flex-1 flex items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Delete Account
                </button>
                <button
                  type="submit"
                  disabled={editAccSubmitting || !editAccName.trim()}
                  className="flex-1 flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {editAccSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanModal && (
        <ReceiptScanner onClose={() => setShowScanModal(false)} />
      )}
    </div>
  );
}
