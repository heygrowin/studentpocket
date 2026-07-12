import { create } from "zustand";
import { db } from "@/lib/firebase/config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  where
} from "firebase/firestore";
import {
  FinancialAccount,
  Transaction,
  Budget,
  SavingsGoal,
  EducationLoan,
  ParentConnection,
  AlertThreshold
} from "@/types/finance";
import {
  addAccount,
  updateAccount,
  deleteAccount,
  addFinanceTransaction,
  deleteFinanceTransaction,
  saveBudgetSettings,
  addEducationLoan,
  disburseLoan,
  repayLoan,
  addSavingsGoal,
  removeSavingsGoal,
  depositToSavings,
  withdrawFromSavings,
  inviteParent,
  respondToSharingInvite,
  saveAlertThreshold,
  deleteAlertThreshold
} from "@/lib/firebase/financeService";


interface FinanceState {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  loans: EducationLoan[];
  activeBudget: Budget | null;
  parentConnections: ParentConnection[];
  alertThresholds: AlertThreshold[];
  
  loadingAccounts: boolean;
  loadingTransactions: boolean;
  loadingBudget: boolean;
  loadingSavings: boolean;
  loadingLoans: boolean;
  loadingSharing: boolean;
  loadingAlerts: boolean;

  // Listeners unsubscribers
  unsubAccounts: (() => void) | null;
  unsubTransactions: (() => void) | null;
  unsubBudget: (() => void) | null;
  unsubSavings: (() => void) | null;
  unsubLoans: (() => void) | null;
  unsubSharingStudent: (() => void) | null;
  unsubSharingParent: (() => void) | null;
  unsubAlerts: (() => void) | null;

  // Actions
  subscribeAccounts: (userId: string) => void;
  subscribeTransactions: (userId: string) => void;
  subscribeActiveBudget: (userId: string, yearMonth: string) => void;
  subscribeSavingsGoals: (userId: string) => void;
  subscribeLoans: (userId: string) => void;
  subscribeSharing: (userId: string, email: string) => void;
  subscribeAlertThresholds: (userId: string) => void;
  unsubscribeAll: () => void;

  // DB Writes
  createAccount: (
    userId: string,
    account: Omit<FinancialAccount, "id" | "userId" | "createdAt">
  ) => Promise<string>;
  updateAccount: (
    userId: string,
    accountId: string,
    updates: Partial<Omit<FinancialAccount, "id" | "userId" | "createdAt">>
  ) => Promise<void>;
  deleteAccount: (
    userId: string,
    accountId: string
  ) => Promise<void>;
  createTransaction: (
    userId: string,
    transaction: Omit<Transaction, "id" | "createdAt">
  ) => Promise<string>;
  removeTransaction: (userId: string, transaction: Transaction) => Promise<void>;
  updateBudget: (
    userId: string,
    yearMonth: string,
    totalLimit: number,
    categoryLimits: Record<string, number>
  ) => Promise<void>;

  // Loan Actions
  createLoan: (
    userId: string,
    loan: Omit<EducationLoan, "id" | "userId" | "createdAt">
  ) => Promise<string>;
  disburseLoanAmount: (
    userId: string,
    loanId: string,
    amount: number,
    targetAccountId: string
  ) => Promise<void>;
  repayLoanAmount: (
    userId: string,
    loanId: string,
    amount: number,
    sourceAccountId: string
  ) => Promise<void>;

  // Savings Actions
  createSavingsGoal: (
    userId: string,
    goal: Omit<SavingsGoal, "id" | "userId" | "createdAt" | "status">
  ) => Promise<string>;
  depositToSavingsVault: (
    userId: string,
    goalId: string,
    amount: number,
    sourceAccountId: string
  ) => Promise<void>;
  withdrawFromSavingsVault: (
    userId: string,
    goalId: string,
    amount: number,
    targetAccountId: string
  ) => Promise<void>;
  deleteSavingsGoal: (
    userId: string,
    goalId: string
  ) => Promise<void>;

  // Sharing Actions
  dispatchParentInvite: (
    studentId: string,
    studentName: string,
    parentEmail: string,
    permissions: ParentConnection["permissions"]
  ) => Promise<string>;
  respondParentInvite: (
    connectionId: string,
    status: "accepted" | "rejected" | "deleted"
  ) => Promise<void>;

  // Alerts Actions
  createAlertThreshold: (
    userId: string,
    threshold: Omit<AlertThreshold, "id" | "userId">
  ) => Promise<string>;
  removeAlertThreshold: (userId: string, thresholdId: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  savingsGoals: [],
  loans: [],
  parentConnections: [],
  alertThresholds: [],
  activeBudget: null,
  
  loadingAccounts: true,
  loadingTransactions: true,
  loadingBudget: true,
  loadingSavings: true,
  loadingLoans: true,
  loadingSharing: true,
  loadingAlerts: true,

  unsubAccounts: null,
  unsubTransactions: null,
  unsubBudget: null,
  unsubSavings: null,
  unsubLoans: null,
  unsubSharingStudent: null,
  unsubSharingParent: null,
  unsubAlerts: null,

  subscribeAccounts: (userId) => {
    get().unsubAccounts?.();
    const q = query(collection(db, "users", userId, "accounts"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: FinancialAccount[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as FinancialAccount));
      set({ accounts: list, loadingAccounts: false });
    }, (error) => {
      console.error("Accounts subscription error:", error);
      set({ loadingAccounts: false });
    });
    set({ unsubAccounts: unsub });
  },

  subscribeTransactions: (userId) => {
    get().unsubTransactions?.();
    const q = query(
      collection(db, "users", userId, "transactions"),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Transaction));
      set({ transactions: list, loadingTransactions: false });
    }, (error) => {
      console.error("Transactions subscription error:", error);
      set({ loadingTransactions: false });
    });
    set({ unsubTransactions: unsub });
  },

  subscribeActiveBudget: (userId, yearMonth) => {
    get().unsubBudget?.();
    const docRef = doc(db, "users", userId, "budgets", yearMonth);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        set({ activeBudget: { ...snap.data(), id: snap.id } as Budget, loadingBudget: false });
      } else {
        set({ activeBudget: null, loadingBudget: false });
      }
    }, (error) => {
      console.error("Budget subscription error:", error);
      set({ loadingBudget: false });
    });
    set({ unsubBudget: unsub });
  },

  subscribeSavingsGoals: (userId) => {
    get().unsubSavings?.();
    const q = query(collection(db, "users", userId, "savings_goals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: SavingsGoal[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as SavingsGoal));
      set({ savingsGoals: list, loadingSavings: false });
    }, (error) => {
      console.error("Savings subscription error:", error);
      set({ loadingSavings: false });
    });
    set({ unsubSavings: unsub });
  },

  subscribeLoans: (userId) => {
    get().unsubLoans?.();
    const q = query(collection(db, "users", userId, "loans"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: EducationLoan[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as EducationLoan));
      set({ loans: list, loadingLoans: false });
    }, (error) => {
      console.error("Loans subscription error:", error);
      set({ loadingLoans: false });
    });
    set({ unsubLoans: unsub });
  },

  subscribeSharing: (userId, email) => {
    get().unsubSharingStudent?.();
    get().unsubSharingParent?.();

    if (!email) {
      set({ loadingSharing: false });
      return;
    }

    // Query 1: Connections sent by this user as student
    const studentQ = query(
      collection(db, "parent_connections"),
      where("studentId", "==", userId)
    );
    const unsubStudent = onSnapshot(studentQ, (snapshot) => {
      const list: ParentConnection[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as ParentConnection));
      
      set((state) => {
        const parentList = state.parentConnections.filter((c) => c.parentEmail === email.toLowerCase().trim());
        return { parentConnections: [...parentList, ...list], loadingSharing: false };
      });
    }, (error) => {
      console.error("Sharing student subscription error:", error);
      set({ loadingSharing: false });
    });

    // Query 2: Connections received by this user as parent
    const parentQ = query(
      collection(db, "parent_connections"),
      where("parentEmail", "==", email.toLowerCase().trim())
    );
    const unsubParent = onSnapshot(parentQ, (snapshot) => {
      const list: ParentConnection[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as ParentConnection));
      
      set((state) => {
        const studentList = state.parentConnections.filter((c) => c.studentId === userId);
        return { parentConnections: [...studentList, ...list], loadingSharing: false };
      });
    }, (error) => {
      console.error("Sharing parent subscription error:", error);
      set({ loadingSharing: false });
    });

    set({ unsubSharingStudent: unsubStudent, unsubSharingParent: unsubParent });
  },

  subscribeAlertThresholds: (userId) => {
    get().unsubAlerts?.();
    const q = query(collection(db, "users", userId, "alert_thresholds"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: AlertThreshold[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as AlertThreshold));
      set({ alertThresholds: list, loadingAlerts: false });
    }, (error) => {
      console.error("Alerts subscription error:", error);
      set({ loadingAlerts: false });
    });
    set({ unsubAlerts: unsub });
  },

  unsubscribeAll: () => {
    const {
      unsubAccounts,
      unsubTransactions,
      unsubBudget,
      unsubSavings,
      unsubLoans,
      unsubSharingStudent,
      unsubSharingParent,
      unsubAlerts
    } = get();

    unsubAccounts?.();
    unsubTransactions?.();
    unsubBudget?.();
    unsubSavings?.();
    unsubLoans?.();
    unsubSharingStudent?.();
    unsubSharingParent?.();
    unsubAlerts?.();

    set({
      unsubAccounts: null,
      unsubTransactions: null,
      unsubBudget: null,
      unsubSavings: null,
      unsubLoans: null,
      unsubSharingStudent: null,
      unsubSharingParent: null,
      unsubAlerts: null,
      accounts: [],
      transactions: [],
      savingsGoals: [],
      loans: [],
      parentConnections: [],
      alertThresholds: [],
      activeBudget: null,
    });
  },

  createAccount: async (userId, accountData) => {
    return await addAccount(userId, accountData);
  },

  updateAccount: async (userId, accountId, updates) => {
    await updateAccount(userId, accountId, updates);
  },

  deleteAccount: async (userId, accountId) => {
    await deleteAccount(userId, accountId);
  },

  createTransaction: async (userId, transactionData) => {
    return await addFinanceTransaction(userId, transactionData);
  },

  removeTransaction: async (userId, transaction) => {
    await deleteFinanceTransaction(userId, transaction);
  },

  updateBudget: async (userId, yearMonth, totalLimit, categoryLimits) => {
    await saveBudgetSettings(userId, yearMonth, totalLimit, categoryLimits);
  },

  createLoan: async (userId, loanData) => {
    return await addEducationLoan(userId, loanData);
  },

  disburseLoanAmount: async (userId, loanId, amount, targetAccountId) => {
    await disburseLoan(userId, loanId, amount, targetAccountId);
  },

  repayLoanAmount: async (userId, loanId, amount, sourceAccountId) => {
    await repayLoan(userId, loanId, amount, sourceAccountId);
  },

  createSavingsGoal: async (userId, goalData) => {
    return await addSavingsGoal(userId, goalData);
  },

  depositToSavingsVault: async (userId, goalId, amount, sourceAccountId) => {
    await depositToSavings(userId, goalId, amount, sourceAccountId);
  },

  withdrawFromSavingsVault: async (userId, goalId, amount, targetAccountId) => {
    await withdrawFromSavings(userId, goalId, amount, targetAccountId);
  },

  deleteSavingsGoal: async (userId, goalId) => {
    await removeSavingsGoal(userId, goalId);
  },

  dispatchParentInvite: async (studentId, studentName, parentEmail, permissions) => {
    return await inviteParent(studentId, studentName, parentEmail, permissions);
  },

  respondParentInvite: async (connectionId, status) => {
    await respondToSharingInvite(connectionId, status);
  },

  createAlertThreshold: async (userId, thresholdData) => {
    return await saveAlertThreshold(userId, thresholdData);
  },

  removeAlertThreshold: async (userId, thresholdId) => {
    await deleteAlertThreshold(userId, thresholdId);
  },
}));
