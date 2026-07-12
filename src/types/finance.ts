export type AccountType = "cash" | "bank" | "loan" | "savings";

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  userId: string;
  createdAt: string;
}

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "loan_disbursement"
  | "loan_usage"
  | "scholarship"
  | "salary"
  | "freelancing"
  | "refund"
  | "emergency";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  fromAccountId: string; // Used for Expense, Transfer, Loan Usage
  toAccountId?: string;   // Used for Income, Transfer, Loan Disbursement
  date: string;
  time?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  yearMonth: string; // Format: "YYYY-MM"
  totalLimit: number;
  categoryLimits: Record<string, number>;
  currentSpend: Record<string, number>;
  userId: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: "active" | "achieved";
  userId: string;
  createdAt: string;
}

export interface EducationLoan {
  id: string;
  provider: string;
  totalApproved: number;
  disbursedAmount: number;
  usedAmount: number;
  interestRate: number;
  emi: number;
  repaymentStartDate?: string;
  userId: string;
  createdAt: string;
}

export interface ParentConnection {
  id: string;
  studentId: string;
  studentName: string;
  parentEmail: string;
  status: "pending" | "accepted";
  permissions: {
    viewLedger: boolean;
    viewBudgets: boolean;
    viewSavings: boolean;
    viewLoans: boolean;
  };
  createdAt: string;
}

export interface AlertThreshold {
  id: string;
  type: "low_balance" | "budget_limit";
  targetId: string; // accountId or category name
  thresholdValue: number; // e.g. limit under 500 rupees or spent above 90% budget
  isEnabled: boolean;
  userId: string;
}

