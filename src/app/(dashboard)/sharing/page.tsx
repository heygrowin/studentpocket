"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Send,
  Users,
  Check,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  Clock,
  ArrowRight,
  TrendingDown,
  GraduationCap,
  PiggyBank
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { ParentConnection, FinancialAccount, Transaction, EducationLoan } from "@/types/finance";

// Form schemas
const inviteSchema = zod.object({
  email: zod.string().email("Please enter a valid email address"),
  viewLedger: zod.boolean(),
  viewBudgets: zod.boolean(),
  viewSavings: zod.boolean(),
  viewLoans: zod.boolean(),
});

type InviteFormFields = zod.infer<typeof inviteSchema>;

export default function SharingPage() {
  const { user, profile } = useAuthStore();
  const {
    parentConnections,
    dispatchParentInvite,
    respondParentInvite
  } = useFinanceStore();

  const userEmail = user?.email || "";
  const displayName = profile?.displayName || user?.displayName || "Student";
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parent dashboard view state
  const [viewingStudent, setViewingStudent] = useState<ParentConnection | null>(null);
  const [studentAccounts, setStudentAccounts] = useState<FinancialAccount[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
  const [studentLoans, setStudentLoans] = useState<EducationLoan[]>([]);
  const [loadingStudentData, setLoadingStudentData] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormFields>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      viewLedger: true,
      viewBudgets: true,
      viewSavings: false,
      viewLoans: false,
    },
  });

  // Action: Invite Parent
  const handleInvite = async (data: InviteFormFields) => {
    if (!user) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await dispatchParentInvite(user.uid, displayName, data.email, {
        viewLedger: data.viewLedger,
        viewBudgets: data.viewBudgets,
        viewSavings: data.viewSavings,
        viewLoans: data.viewLoans,
      });
      setSuccessMsg(`Invitation successfully dispatched to ${data.email}.`);
      reset();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to dispatch invite.");
    } finally {
      setSubmitting(false);
    }
  };

  // Action: Accept/Reject/Delete connection
  const handleResponse = async (connId: string, status: "accepted" | "rejected" | "deleted") => {
    setSubmitting(true);
    try {
      await respondParentInvite(connId, status);
      if (viewingStudent?.id === connId) {
        setViewingStudent(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Load student read-only data when parent launches the HUD
  useEffect(() => {
    if (!viewingStudent) return;
    
    const fetchStudentData = async () => {
      setLoadingStudentData(true);
      try {
        const studentId = viewingStudent.studentId;
        
        // 1. Fetch Accounts
        const accSnap = await getDocs(query(collection(db, "users", studentId, "accounts")));
        const accList: FinancialAccount[] = [];
        accSnap.forEach((doc) => accList.push(doc.data() as FinancialAccount));
        setStudentAccounts(accList);

        // 2. Fetch Transactions
        const txSnap = await getDocs(
          query(collection(db, "users", studentId, "transactions"), orderBy("date", "desc"))
        );
        const txList: Transaction[] = [];
        txSnap.forEach((doc) => txList.push(doc.data() as Transaction));
        setStudentTransactions(txList);

        // 3. Fetch Loans
        const loanSnap = await getDocs(query(collection(db, "users", studentId, "loans")));
        const loanList: EducationLoan[] = [];
        loanSnap.forEach((doc) => loanList.push(doc.data() as EducationLoan));
        setStudentLoans(loanList);
      } catch (err) {
        console.error("Error fetching student metrics:", err);
      } finally {
        setLoadingStudentData(false);
      }
    };

    fetchStudentData();
  }, [viewingStudent]);

  // Split connections into outbox (sent) and inbox (received)
  const sentInvites = parentConnections.filter((c) => c.studentId === user?.uid);
  const receivedInvites = parentConnections.filter(
    (c) => c.parentEmail === userEmail.toLowerCase().trim()
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Parent Portal & Transparency Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Share your ledger with your parents for stipend transparency, or view your child&rsquo;s student account as an invited parent.
        </p>
      </div>

      {/* How it Works Guide Panel */}
      {!viewingStudent && (
        <div className="border border-border bg-indigo-600/5 backdrop-blur rounded-2xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Users className="h-5 w-5" />
            <h4 className="font-bold text-sm text-foreground">How the Parent Portal Connection Works</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-indigo-400">1. Student Dispatches Invite</span>
              <p className="text-muted-foreground leading-relaxed">
                Type your parent's exact email address below, configure which folders they can view (e.g. Ledger, Loans, Budgets), and send the request.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-indigo-400">2. Parent Registers / Logs In</span>
              <p className="text-muted-foreground leading-relaxed">
                Your parent signs up or logs into Student Pocket using that exact invited email.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-indigo-400">3. Accept & Monitor HUD</span>
              <p className="text-muted-foreground leading-relaxed">
                In their Parent Portal, they accept the invite under <em>"Received Invitations"</em>. They can now click <em>"View Student"</em> to monitor your read-only cards dynamically.
              </p>
            </div>
          </div>
        </div>
      )}

      {viewingStudent ? (
        /* PARENT READ-ONLY MONITORING DASHBOARD HUD */
        <div className="border border-indigo-500/20 bg-indigo-950/5 rounded-2xl p-6 space-y-6 animate-slide-in">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Monitoring HUD (Read-Only)
              </span>
              <h3 className="text-lg font-bold mt-1">Viewing Student: {viewingStudent.studentName}</h3>
            </div>
            <button
              onClick={() => setViewingStudent(null)}
              className="inline-flex items-center text-xs border border-border rounded-lg bg-card px-3 py-1.5 font-semibold hover:bg-muted cursor-pointer"
            >
              <X className="h-4 w-4 mr-1.5" />
              Close Student View
            </button>
          </div>

          {loadingStudentData ? (
            <div className="py-20 flex justify-center items-center text-indigo-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Financial Accounts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {studentAccounts.map((acc) => (
                  <div key={acc.id} className="border border-border bg-card/40 rounded-xl p-4 space-y-1 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{acc.name}</span>
                    <p className="text-xl font-bold">
                      {currencySymbol}
                      {acc.balance.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ledger Feed */}
                {viewingStudent.permissions.viewLedger && (
                  <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-indigo-400" />
                      Recent Student Transactions
                    </h4>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {studentTransactions.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No transactions registered.</p>
                      ) : (
                        studentTransactions.slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs border-b border-border/40 pb-2">
                            <div>
                              <p className="font-semibold text-foreground">{tx.title}</p>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {tx.date} &bull; {tx.category}
                              </span>
                            </div>
                            <span className={tx.type === "expense" ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>
                              {tx.type === "expense" ? "-" : "+"}
                              {currencySymbol}
                              {tx.amount}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Loans & Debts */}
                {viewingStudent.permissions.viewLoans && (
                  <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center">
                      <GraduationCap className="h-4.5 w-4.5 mr-1.5 text-indigo-400" />
                      Student Loan Parameters
                    </h4>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {studentLoans.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No registered loan accounts.</p>
                      ) : (
                        studentLoans.map((loan) => {
                          const percent = Math.round((loan.disbursedAmount / loan.totalApproved) * 100) || 0;
                          return (
                            <div key={loan.id} className="border border-border/40 bg-card/40 rounded-lg p-3.5 space-y-2.5">
                              <div className="flex justify-between font-semibold text-xs">
                                <span>{loan.provider} Loan</span>
                                <span className="text-rose-500">
                                  Debt: {currencySymbol}
                                  {loan.disbursedAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Rate: {loan.interestRate}%</span>
                                <span>EMI: {currencySymbol}{loan.emi}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN PORTAL HUB OPTIONS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: Student controls (invite parent) */}
          <div className="space-y-6">
            <div className="border border-border bg-card/40 rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="text-md font-bold flex items-center">
                <Send className="h-4.5 w-4.5 mr-2 text-indigo-400" />
                Invite Parent or Guardian
              </h3>
              
              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500 flex items-center">
                  <Check className="h-4 w-4 mr-2 shrink-0 animate-bounce" />
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit(handleInvite)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="parent-email">
                    Parent Email Address
                  </label>
                  <input
                    id="parent-email"
                    type="email"
                    placeholder="parent@email.com"
                    {...register("email")}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-primary focus:outline-none"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Permissions checkboxes */}
                <div className="space-y-2.5 border-t border-border pt-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Permissions configuration
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2.5 text-xs font-semibold p-2 border border-border bg-background rounded-lg cursor-pointer">
                      <input type="checkbox" {...register("viewLedger")} className="rounded text-indigo-500 focus:ring-0" />
                      <span>Ledger logs</span>
                    </label>

                    <label className="flex items-center space-x-2.5 text-xs font-semibold p-2 border border-border bg-background rounded-lg cursor-pointer">
                      <input type="checkbox" {...register("viewBudgets")} className="rounded text-indigo-500 focus:ring-0" />
                      <span>Budget limits</span>
                    </label>

                    <label className="flex items-center space-x-2.5 text-xs font-semibold p-2 border border-border bg-background rounded-lg cursor-pointer">
                      <input type="checkbox" {...register("viewSavings")} className="rounded text-indigo-500 focus:ring-0" />
                      <span>Savings Vaults</span>
                    </label>

                    <label className="flex items-center space-x-2.5 text-xs font-semibold p-2 border border-border bg-background rounded-lg cursor-pointer">
                      <input type="checkbox" {...register("viewLoans")} className="rounded text-indigo-500 focus:ring-0" />
                      <span>Loan limits</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Dispatch Sharing Invitation"}
                </button>
              </form>
            </div>

            {/* Outbox tracker list */}
            <div className="border border-border bg-card/40 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Sent Invitations (Outbox)
              </h3>
              
              <div className="space-y-3">
                {sentInvites.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">You haven&rsquo;t sent any connection requests yet.</p>
                ) : (
                  sentInvites.map((conn) => (
                    <div key={conn.id} className="flex justify-between items-center p-3.5 border border-border rounded-xl text-xs bg-background/40">
                      <div>
                        <p className="font-semibold">{conn.parentEmail}</p>
                        <span className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                          Permissions: {conn.permissions.viewLedger ? "Ledger, " : ""}{conn.permissions.viewBudgets ? "Budgets, " : ""}{conn.permissions.viewSavings ? "Savings, " : ""}{conn.permissions.viewLoans ? "Loans" : ""}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {conn.status === "pending" ? (
                          <span className="inline-flex items-center text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        <button
                          onClick={() => handleResponse(conn.id, "deleted")}
                          disabled={submitting}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-muted cursor-pointer"
                          title="Revoke Permission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Parent controls (received invites) */}
          <div className="border border-border bg-card/40 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-bold flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-400" />
                Parents Control Deck (Inbox)
              </h3>
              <p className="text-xs text-muted-foreground">
                If your child shared their Student Pocket dashboard with you, their invitation will appear below. Accept the request to monitor their liquid balances and EMI repayment progress.
              </p>

              <div className="space-y-4 pt-2">
                {receivedInvites.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-xl bg-background/20">
                    <p className="text-xs text-muted-foreground">No incoming invitations received for {userEmail}.</p>
                  </div>
                ) : (
                  receivedInvites.map((conn) => (
                    <div key={conn.id} className="border border-border bg-background rounded-xl p-4 space-y-4 text-xs shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">{conn.studentName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Invited you to view their dashboard</p>
                        </div>
                        {conn.status === "pending" ? (
                          <span className="bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded text-[10px]">
                            Pending
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">
                            Approved
                          </span>
                        )}
                      </div>

                      {conn.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResponse(conn.id, "accepted")}
                            disabled={submitting}
                            className="flex-1 inline-flex items-center justify-center p-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 cursor-pointer"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept invite
                          </button>
                          <button
                            onClick={() => handleResponse(conn.id, "rejected")}
                            disabled={submitting}
                            className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingStudent(conn)}
                            className="flex-1 inline-flex items-center justify-center p-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 cursor-pointer transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View Student Finances
                          </button>
                          <button
                            onClick={() => handleResponse(conn.id, "deleted")}
                            disabled={submitting}
                            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-muted cursor-pointer"
                            title="Disconnect Connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
