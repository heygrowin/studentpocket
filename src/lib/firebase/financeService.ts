import { db } from "./config";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { FinancialAccount, Transaction, Budget, EducationLoan, SavingsGoal, ParentConnection, AlertThreshold } from "@/types/finance";

// 1. Add Financial Account
export async function addAccount(
  userId: string,
  accountData: Omit<FinancialAccount, "id" | "userId" | "createdAt">
): Promise<string> {
  const accountRef = doc(collection(db, "users", userId, "accounts"));
  const newAccount: FinancialAccount = {
    ...accountData,
    id: accountRef.id,
    userId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(accountRef, newAccount);
  return accountRef.id;
}

// 1b. Update Financial Account
export async function updateAccount(
  userId: string,
  accountId: string,
  updates: Partial<Omit<FinancialAccount, "id" | "userId" | "createdAt">>
): Promise<void> {
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await setDoc(accountRef, updates, { merge: true });
}

// 1c. Delete Financial Account
export async function deleteAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await deleteDoc(accountRef);
}


// Helper to extract Year-Month from ISO date string
function getYearMonth(dateStr: string): string {
  // expects "YYYY-MM-DD" or similar ISO
  return dateStr.substring(0, 7);
}

// 2. Add Transaction (Atomic update of balances & budgets)
export async function addFinanceTransaction(
  userId: string,
  transactionData: Omit<Transaction, "id" | "createdAt">
): Promise<string> {
  const transactionRef = doc(collection(db, "users", userId, "transactions"));
  const newTransactionId = transactionRef.id;

  const yearMonth = getYearMonth(transactionData.date);
  const budgetRef = doc(db, "users", userId, "budgets", yearMonth);

  await runTransaction(db, async (firestoreTx) => {
    // 1. Handle Account Balance Adjustments
    if (transactionData.type === "transfer") {
      if (!transactionData.fromAccountId || !transactionData.toAccountId) {
        throw new Error("Transfers require both source and destination accounts.");
      }
      const fromAccRef = doc(db, "users", userId, "accounts", transactionData.fromAccountId);
      const toAccRef = doc(db, "users", userId, "accounts", transactionData.toAccountId);

      const fromSnap = await firestoreTx.get(fromAccRef);
      const toSnap = await firestoreTx.get(toAccRef);

      if (!fromSnap.exists() || !toSnap.exists()) {
        throw new Error("Source or destination account not found.");
      }

      const newFromBal = (fromSnap.data() as FinancialAccount).balance - transactionData.amount;
      const newToBal = (toSnap.data() as FinancialAccount).balance + transactionData.amount;

      firestoreTx.update(fromAccRef, { balance: newFromBal });
      firestoreTx.update(toAccRef, { balance: newToBal });
    } else if (
      transactionData.type === "income" ||
      transactionData.type === "salary" ||
      transactionData.type === "freelancing" ||
      transactionData.type === "scholarship" ||
      transactionData.type === "refund"
    ) {
      // INFLOWS
      if (!transactionData.toAccountId) {
        throw new Error("Inflows require a destination account.");
      }
      const accRef = doc(db, "users", userId, "accounts", transactionData.toAccountId);
      const accSnap = await firestoreTx.get(accRef);

      if (!accSnap.exists()) {
        throw new Error("Destination account not found.");
      }

      const newBal = (accSnap.data() as FinancialAccount).balance + transactionData.amount;
      firestoreTx.update(accRef, { balance: newBal });
    } else {
      // OUTFLOWS (Expense, Loan usage, Emergency)
      if (!transactionData.fromAccountId) {
        throw new Error("Outflows require a source account.");
      }
      const accRef = doc(db, "users", userId, "accounts", transactionData.fromAccountId);
      
      // Perform all reads first!
      const accSnap = await firestoreTx.get(accRef);
      const budgetSnap = await firestoreTx.get(budgetRef);

      if (!accSnap.exists()) {
        throw new Error("Source account not found.");
      }

      // Perform writes!
      const newBal = (accSnap.data() as FinancialAccount).balance - transactionData.amount;
      firestoreTx.update(accRef, { balance: newBal });

      // Update Monthly Budget
      const category = transactionData.category || "Other";
      const amount = transactionData.amount;

      if (budgetSnap.exists()) {
        const budgetData = budgetSnap.data() as Budget;
        const currentSpend = { ...(budgetData.currentSpend || {}) };
        currentSpend[category] = (currentSpend[category] || 0) + amount;
        firestoreTx.update(budgetRef, { currentSpend });
      } else {
        // Initialize an empty monthly budget with this expense tracked
        const initialBudget: Omit<Budget, "id"> = {
          yearMonth,
          totalLimit: 15000, // standard default student budget
          categoryLimits: { Food: 5000, Transport: 1500, Groceries: 2000, Rent: 5000 },
          currentSpend: { [category]: amount },
          userId,
        };
        firestoreTx.set(budgetRef, initialBudget);
      }
    }

    // 2. Save the transaction document
    const finalTx: Transaction = {
      ...transactionData,
      id: newTransactionId,
      createdAt: new Date().toISOString(),
    };
    firestoreTx.set(transactionRef, finalTx);
  });

  return newTransactionId;
}

// 3. Delete Transaction (Atomic reverse of balances & budgets)
export async function deleteFinanceTransaction(
  userId: string,
  transaction: Transaction
): Promise<void> {
  const transactionRef = doc(db, "users", userId, "transactions", transaction.id);
  const yearMonth = getYearMonth(transaction.date);
  const budgetRef = doc(db, "users", userId, "budgets", yearMonth);

  await runTransaction(db, async (firestoreTx) => {
    // 1. Reverse Account Balance Adjustments
    if (transaction.type === "transfer") {
      if (transaction.fromAccountId && transaction.toAccountId) {
        const fromAccRef = doc(db, "users", userId, "accounts", transaction.fromAccountId);
        const toAccRef = doc(db, "users", userId, "accounts", transaction.toAccountId);

        const fromSnap = await firestoreTx.get(fromAccRef);
        const toSnap = await firestoreTx.get(toAccRef);

        if (fromSnap.exists() && toSnap.exists()) {
          // Add back to fromAccount, subtract from toAccount
          const newFromBal = (fromSnap.data() as FinancialAccount).balance + transaction.amount;
          const newToBal = (toSnap.data() as FinancialAccount).balance - transaction.amount;
          firestoreTx.update(fromAccRef, { balance: newFromBal });
          firestoreTx.update(toAccRef, { balance: newToBal });
        }
      }
    } else if (
      transaction.type === "income" ||
      transaction.type === "salary" ||
      transaction.type === "freelancing" ||
      transaction.type === "scholarship" ||
      transaction.type === "refund"
    ) {
      // INFLOW (was added to account balance, now subtract it)
      if (transaction.toAccountId) {
        const accRef = doc(db, "users", userId, "accounts", transaction.toAccountId);
        const accSnap = await firestoreTx.get(accRef);
        if (accSnap.exists()) {
          const newBal = (accSnap.data() as FinancialAccount).balance - transaction.amount;
          firestoreTx.update(accRef, { balance: newBal });
        }
      }
    } else {
      // OUTFLOW (was subtracted, now add it back)
      if (transaction.fromAccountId) {
        const accRef = doc(db, "users", userId, "accounts", transaction.fromAccountId);
        
        // Perform all reads first!
        const accSnap = await firestoreTx.get(accRef);
        const budgetSnap = await firestoreTx.get(budgetRef);

        if (accSnap.exists()) {
          const newBal = (accSnap.data() as FinancialAccount).balance + transaction.amount;
          firestoreTx.update(accRef, { balance: newBal });
        }

        // Adjust Monthly Budget spent down
        if (budgetSnap.exists()) {
          const budgetData = budgetSnap.data() as Budget;
          const currentSpend = { ...(budgetData.currentSpend || {}) };
          const category = transaction.category || "Other";
          currentSpend[category] = Math.max(0, (currentSpend[category] || 0) - transaction.amount);
          firestoreTx.update(budgetRef, { currentSpend });
        }
      }
    }

    // 2. Delete the transaction document
    firestoreTx.delete(transactionRef);
  });
}

// 4. Update / Save Budget settings
export async function saveBudgetSettings(
  userId: string,
  yearMonth: string,
  totalLimit: number,
  categoryLimits: Record<string, number>
): Promise<void> {
  const budgetRef = doc(db, "users", userId, "budgets", yearMonth);
  const budgetSnap = await getDoc(budgetRef);

  if (budgetSnap.exists()) {
    await setDoc(budgetRef, { totalLimit, categoryLimits }, { merge: true });
  } else {
    const newBudget: Budget = {
      id: yearMonth,
      yearMonth,
      totalLimit,
      categoryLimits,
      currentSpend: {},
      userId,
    };
    await setDoc(budgetRef, newBudget);
  }
}

// 5. Add Education Loan
export async function addEducationLoan(
  userId: string,
  loanData: Omit<EducationLoan, "id" | "userId" | "createdAt">
): Promise<string> {
  const loanRef = doc(collection(db, "users", userId, "loans"));
  const newLoan: EducationLoan = {
    ...loanData,
    id: loanRef.id,
    userId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(loanRef, newLoan);
  return loanRef.id;
}

// 6. Disburse Loan Amount (adds balance to target account, updates loan)
export async function disburseLoan(
  userId: string,
  loanId: string,
  amount: number,
  targetAccountId: string
): Promise<void> {
  const loanRef = doc(db, "users", userId, "loans", loanId);
  const accountRef = doc(db, "users", userId, "accounts", targetAccountId);
  const transactionRef = doc(collection(db, "users", userId, "transactions"));

  await runTransaction(db, async (firestoreTx) => {
    const loanSnap = await firestoreTx.get(loanRef);
    const accountSnap = await firestoreTx.get(accountRef);

    if (!loanSnap.exists() || !accountSnap.exists()) {
      throw new Error("Loan or destination Account not found.");
    }

    const loan = loanSnap.data() as EducationLoan;
    const account = accountSnap.data() as FinancialAccount;

    if (loan.disbursedAmount + amount > loan.totalApproved) {
      throw new Error("Disbursement exceeds total approved loan limit.");
    }

    const newDisbursed = loan.disbursedAmount + amount;
    const newAccountBalance = account.balance + amount;

    firestoreTx.update(loanRef, { disbursedAmount: newDisbursed });
    firestoreTx.update(accountRef, { balance: newAccountBalance });

    const disbursementTx: Transaction = {
      id: transactionRef.id,
      title: `Loan Disbursement - ${loan.provider}`,
      amount,
      type: "loan_disbursement",
      category: "Loan Outlay",
      toAccountId: targetAccountId,
      fromAccountId: "",
      date: new Date().toISOString().split("T")[0],
      notes: "Auto-logged disbursement payment",
      createdAt: new Date().toISOString(),
    };
    firestoreTx.set(transactionRef, disbursementTx);
  });
}

// 7. Repay Loan Amount (subtracts balance from source account, reduces outstanding balance)
export async function repayLoan(
  userId: string,
  loanId: string,
  amount: number,
  sourceAccountId: string
): Promise<void> {
  const loanRef = doc(db, "users", userId, "loans", loanId);
  const accountRef = doc(db, "users", userId, "accounts", sourceAccountId);
  const transactionRef = doc(collection(db, "users", userId, "transactions"));

  await runTransaction(db, async (firestoreTx) => {
    const loanSnap = await firestoreTx.get(loanRef);
    const accountSnap = await firestoreTx.get(accountRef);

    if (!loanSnap.exists() || !accountSnap.exists()) {
      throw new Error("Loan or source Account not found.");
    }

    const loan = loanSnap.data() as EducationLoan;
    const account = accountSnap.data() as FinancialAccount;

    if (account.balance < amount) {
      throw new Error("Insufficient account balance for this repayment.");
    }

    const newDisbursed = Math.max(0, loan.disbursedAmount - amount);
    const newAccountBalance = account.balance - amount;

    firestoreTx.update(loanRef, { disbursedAmount: newDisbursed });
    firestoreTx.update(accountRef, { balance: newAccountBalance });

    const repaymentTx: Transaction = {
      id: transactionRef.id,
      title: `Loan Repayment (EMI) - ${loan.provider}`,
      amount,
      type: "expense",
      category: "Loan Outlay",
      fromAccountId: sourceAccountId,
      toAccountId: "",
      date: new Date().toISOString().split("T")[0],
      notes: "Auto-logged loan repayment",
      createdAt: new Date().toISOString(),
    };
    firestoreTx.set(transactionRef, repaymentTx);
  });
}

// 8. Add Savings Goal
export async function addSavingsGoal(
  userId: string,
  goalData: Omit<SavingsGoal, "id" | "userId" | "createdAt" | "status">
): Promise<string> {
  const goalRef = doc(collection(db, "users", userId, "savings_goals"));
  const newGoal: SavingsGoal = {
    ...goalData,
    id: goalRef.id,
    userId,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await setDoc(goalRef, newGoal);
  return goalRef.id;
}

// 8b. Delete Savings Goal
export async function removeSavingsGoal(userId: string, goalId: string): Promise<void> {
  const goalRef = doc(db, "users", userId, "savings_goals", goalId);
  await deleteDoc(goalRef);
}

// 9. Deposit into Savings Goal (takes money from account, adds to goal)
export async function depositToSavings(
  userId: string,
  goalId: string,
  amount: number,
  sourceAccountId: string
): Promise<void> {
  const goalRef = doc(db, "users", userId, "savings_goals", goalId);
  const accountRef = doc(db, "users", userId, "accounts", sourceAccountId);
  const transactionRef = doc(collection(db, "users", userId, "transactions"));

  await runTransaction(db, async (firestoreTx) => {
    const goalSnap = await firestoreTx.get(goalRef);
    const accountSnap = await firestoreTx.get(accountRef);

    if (!goalSnap.exists() || !accountSnap.exists()) {
      throw new Error("Goal or source Account not found.");
    }

    const goal = goalSnap.data() as SavingsGoal;
    const account = accountSnap.data() as FinancialAccount;

    if (account.balance < amount) {
      throw new Error("Insufficient account balance for this deposit.");
    }

    const newGoalAmount = goal.currentAmount + amount;
    const newAccountBalance = account.balance - amount;
    const status = newGoalAmount >= goal.targetAmount ? "achieved" : "active";

    firestoreTx.update(goalRef, { currentAmount: newGoalAmount, status });
    firestoreTx.update(accountRef, { balance: newAccountBalance });

    const depositTx: Transaction = {
      id: transactionRef.id,
      title: `Saved for: ${goal.name}`,
      amount,
      type: "expense",
      category: "Savings Allocation",
      fromAccountId: sourceAccountId,
      toAccountId: "",
      date: new Date().toISOString().split("T")[0],
      notes: "Auto-logged savings goal vault deposit",
      createdAt: new Date().toISOString(),
    };
    firestoreTx.set(transactionRef, depositTx);
  });
}

// 10. Withdraw from Savings Goal (returns money to liquid account, reduces goal balance)
export async function withdrawFromSavings(
  userId: string,
  goalId: string,
  amount: number,
  targetAccountId: string
): Promise<void> {
  const goalRef = doc(db, "users", userId, "savings_goals", goalId);
  const accountRef = doc(db, "users", userId, "accounts", targetAccountId);
  const transactionRef = doc(collection(db, "users", userId, "transactions"));

  await runTransaction(db, async (firestoreTx) => {
    const goalSnap = await firestoreTx.get(goalRef);
    const accountSnap = await firestoreTx.get(accountRef);

    if (!goalSnap.exists() || !accountSnap.exists()) {
      throw new Error("Goal or destination Account not found.");
    }

    const goal = goalSnap.data() as SavingsGoal;
    const account = accountSnap.data() as FinancialAccount;

    if (goal.currentAmount < amount) {
      throw new Error("Withdrawal amount exceeds current goal savings balance.");
    }

    const newGoalAmount = goal.currentAmount - amount;
    const newAccountBalance = account.balance + amount;
    const status = newGoalAmount >= goal.targetAmount ? "achieved" : "active";

    firestoreTx.update(goalRef, { currentAmount: newGoalAmount, status });
    firestoreTx.update(accountRef, { balance: newAccountBalance });

    const withdrawTx: Transaction = {
      id: transactionRef.id,
      title: `Withdrew from: ${goal.name}`,
      amount,
      type: "income",
      category: "Savings Allocation",
      toAccountId: targetAccountId,
      fromAccountId: "",
      date: new Date().toISOString().split("T")[0],
      notes: "Auto-logged savings goal vault withdrawal",
      createdAt: new Date().toISOString(),
    };
    firestoreTx.set(transactionRef, withdrawTx);
  });
}

// 11. Send Parent Invitation
export async function inviteParent(
  studentId: string,
  studentName: string,
  parentEmail: string,
  permissions: {
    viewLedger: boolean;
    viewBudgets: boolean;
    viewSavings: boolean;
    viewLoans: boolean;
  }
): Promise<string> {
  const cleanEmail = parentEmail.toLowerCase().trim();
  const connectionId = `${studentId}_${cleanEmail.replace(/[@.]/g, "_")}`;
  const connectionRef = doc(db, "parent_connections", connectionId);
  const newConnection: ParentConnection = {
    id: connectionId,
    studentId,
    studentName,
    parentEmail: cleanEmail,
    status: "pending",
    permissions,
    createdAt: new Date().toISOString(),
  };
  await setDoc(connectionRef, newConnection);
  return connectionId;
}

// 12. Update invitation status (Accept/Reject/Delete)
export async function respondToSharingInvite(
  connectionId: string,
  status: "accepted" | "rejected" | "deleted"
): Promise<void> {
  const connectionRef = doc(db, "parent_connections", connectionId);
  if (status === "deleted" || status === "rejected") {
    await deleteDoc(connectionRef);
  } else {
    await setDoc(connectionRef, { status: "accepted" }, { merge: true });
  }
}

// 13. Create or Update Alert Thresholds
export async function saveAlertThreshold(
  userId: string,
  thresholdData: Omit<AlertThreshold, "id" | "userId">
): Promise<string> {
  const thresholdRef = doc(collection(db, "users", userId, "alert_thresholds"));
  const newThreshold: AlertThreshold = {
    ...thresholdData,
    id: thresholdRef.id,
    userId,
  };
  await setDoc(thresholdRef, newThreshold);
  return thresholdRef.id;
}

// 14. Delete Alert Threshold
export async function deleteAlertThreshold(userId: string, thresholdId: string): Promise<void> {
  const thresholdRef = doc(db, "users", userId, "alert_thresholds", thresholdId);
  await deleteDoc(thresholdRef);
}


