export interface ParsedTransaction {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

const CATEGORY_MAP: Record<string, string[]> = {
  Food: ["food", "lunch", "dinner", "breakfast", "snack", "canteen", "burger", "pizza", "coffee", "chai", "tea", "starbucks", "mcdonalds", "swiggy", "zomato", "dining"],
  Groceries: ["groceries", "grocery", "milk", "vegetables", "fruits", "supermarket", "maggi", "egg", "eggs", "mart"],
  Rent: ["rent", "room", "flat", "pg", "rent paid"],
  "Hostel Fee": ["hostel", "mess", "canteen fee"],
  Transport: ["uber", "ola", "metro", "auto", "bus", "train", "cab", "rickshaw", "fuel", "petrol", "diesel", "rapido", "irctc", "travel", "booking", "ticket"],
  Shopping: ["shopping", "clothes", "shoes", "amazon", "flipkart", "myntra", "purchase", "purchased", "buy", "bought"],
  "Books & Study": ["books", "stationery", "pen", "exam", "course", "college fee", "tuition", "photocopy", "xerox"],
  Entertainment: ["movie", "netflix", "spotify", "game", "clubbing", "party", "steam", "concert", "hotel"],
  Medical: ["medicine", "doctor", "hospital", "pharma", "clinic", "pharmacy", "medical", "medical expense"],
  Salary: ["salary", "job", "stipend", "wage", "wages", "bonus", "commission", "incentive"],
  Freelance: ["freelance", "freelancing", "freelancer", "gig", "project", "design", "coding", "client", "upwork", "fiverr", "customer"],
  "Parents Pocket Allow": ["dad", "mom", "parents", "allowance", "pocket money", "father", "mother", "family", "tip"],
  Refund: ["refund", "cashback", "reimbursement"],
  Utilities: ["electricity", "wifi", "broadband", "jio", "airtel", "water", "recharge", "subscription", "bill", "invoice"],
};

const inflowKeywords = [
  "receive", "received", "get", "got", "earn", "earned", "income", "salary", 
  "wage", "bonus", "commission", "profit", "revenue", "sale", "sold", "sell", 
  "payment received", "credit", "credited", "deposit", "deposited", 
  "transfer received", "transferred in", "refund", "cashback", "reimbursement", 
  "scholarship", "grant", "gift received", "donation received", "loan received", 
  "borrowed", "interest", "dividend", "rent received", "collection", "proceeds", 
  "prize", "reward", "remittance", "money in", "cash in", "inflow", "pocket money", 
  "allowance", "allowances", "tip", "freelance payment", "client payment", "advance received", 
  "settlement received", "upi received", "bank transfer received", "wire received", 
  "cash received", "cheque received", "money came in", "money added", "money credited",
  "got paid", "freelancer", "freelancing", "mom", "dad", "parents", "father", "mother",
  "friend paid me back", "paid me back", "paid back me", "cleared payment", "customer paid"
];

const outflowKeywords = [
  "give", "gave", "send", "sent", "pay", "paid", "spend", "spent", "expense", 
  "expenditure", "purchase", "purchased", "buy", "bought", "cost", "charge", 
  "fee", "bill", "invoice", "subscription", "rent paid", "emi", "installment", 
  "donation", "contribution", "invest", "investment", "lend", "lent", "loan given", 
  "withdrawal", "withdrawn", "debit", "debited", "transfer", "transferred", 
  "disbursement", "settlement", "remittance", "money out", "cash out", "outflow", 
  "tax", "fine", "penalty", "ordered", "booked", "recharge", "top-up", 
  "utility bill", "medical expense", "fuel", "petrol", "diesel", "grocery", 
  "shopping", "food", "dining", "travel", "hotel", "ticket", "booking", 
  "gift given", "advance paid", "security deposit", "money went out", 
  "money deducted", "money debited", "paid back"
];

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseTransactionText(text: string): ParsedTransaction | null {
  const cleanedText = text.trim();
  if (!cleanedText) return null;

  // Regex to extract the first positive number (integer or decimal)
  const numberRegex = /(\d+[\d,]*\.?\d*)/;
  const match = cleanedText.match(numberRegex);
  if (!match) return null;

  const amountStr = match[1].replace(/,/g, "");
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // We preserve the exact text input by the user as the title,
  // matching exactly what they said or typed.
  const title = cleanedText;

  let type: "income" | "expense" = "expense";
  let category = "Other";

  const lowerTitle = title.toLowerCase();

  // Helper to match whole words/phrases using boundaries
  const containsWholeWord = (str: string, keyword: string): boolean => {
    const escaped = escapeRegExp(keyword);
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(str);
  };

  // Contextual priority rules
  if (containsWholeWord(lowerTitle, "got paid")) {
    type = "income";
  } else if (containsWholeWord(lowerTitle, "paid back")) {
    type = "expense";
  } else if (containsWholeWord(lowerTitle, "borrowed") || containsWholeWord(lowerTitle, "loan received")) {
    type = "income";
  } else if (containsWholeWord(lowerTitle, "lent") || containsWholeWord(lowerTitle, "loan given")) {
    type = "expense";
  } else if (/returned.*?\bto\b/i.test(lowerTitle)) {
    type = "expense";
  } else if (containsWholeWord(lowerTitle, "returned")) {
    type = "income";
  } else {
    // Check keyword matches as whole words
    const hasInflow = inflowKeywords.some(k => containsWholeWord(lowerTitle, k));
    const hasOutflow = outflowKeywords.some(k => containsWholeWord(lowerTitle, k));

    if (hasInflow && !hasOutflow) {
      type = "income";
    } else if (hasOutflow && !hasInflow) {
      type = "expense";
    } else if (hasInflow && hasOutflow) {
      // Find whichever matches first in string
      const inflowIdxs = inflowKeywords
        .filter(k => containsWholeWord(lowerTitle, k))
        .map(k => lowerTitle.indexOf(k));
      const outflowIdxs = outflowKeywords
        .filter(k => containsWholeWord(lowerTitle, k))
        .map(k => lowerTitle.indexOf(k));
      
      const minInflow = inflowIdxs.length > 0 ? Math.min(...inflowIdxs) : Infinity;
      const minOutflow = outflowIdxs.length > 0 ? Math.min(...outflowIdxs) : Infinity;
      type = minInflow < minOutflow ? "income" : "expense";
    }
  }

  // Find matching category map
  for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => containsWholeWord(lowerTitle, keyword))) {
      category = catName;
      break;
    }
  }

  // Overwrite specific sub-categories for inflow types
  if (type === "income") {
    if (containsWholeWord(lowerTitle, "salary") || containsWholeWord(lowerTitle, "stipend") || containsWholeWord(lowerTitle, "wage") || containsWholeWord(lowerTitle, "bonus")) {
      category = "Salary";
    } else if (containsWholeWord(lowerTitle, "freelance") || containsWholeWord(lowerTitle, "freelancing") || containsWholeWord(lowerTitle, "freelancer") || containsWholeWord(lowerTitle, "project") || containsWholeWord(lowerTitle, "gig") || containsWholeWord(lowerTitle, "client") || containsWholeWord(lowerTitle, "customer")) {
      category = "Freelance";
    } else if (containsWholeWord(lowerTitle, "dad") || containsWholeWord(lowerTitle, "mom") || containsWholeWord(lowerTitle, "parent") || containsWholeWord(lowerTitle, "parents") || containsWholeWord(lowerTitle, "allowance") || containsWholeWord(lowerTitle, "pocket money") || containsWholeWord(lowerTitle, "gift")) {
      category = "Parents Pocket Allow";
    } else if (containsWholeWord(lowerTitle, "scholarship") || containsWholeWord(lowerTitle, "grant")) {
      category = "Scholarship";
    } else if (containsWholeWord(lowerTitle, "refund") || containsWholeWord(lowerTitle, "cashback") || containsWholeWord(lowerTitle, "reimbursement") || containsWholeWord(lowerTitle, "returned")) {
      category = "Refund";
    }
  }

  return {
    title,
    amount,
    type,
    category,
  };
}

// Client-side local OCR text parser fallback
export function parseRawReceiptText(rawText: string): {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
} {
  const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // 1. Extract Merchant/Title (first non-numeric, non-date line in first 5 lines)
  let title = "Local OCR Scan";
  const dateRegex = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/;
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    const cleanLine = line.replace(/[^a-zA-Z\s]/g, "").trim();
    if (cleanLine.length > 3 && !dateRegex.test(line) && !/total|amount|invoice|bill/i.test(line)) {
      title = line;
      break;
    }
  }

  // 2. Extract Amount
  let amount = 0;
  const totalKeywords = /total|amount|payable|paid|sum|net|due|charge|inr|rs|₹/i;
  const numberRegex = /\b\d+(?:\.\d{2})?\b/g;

  // Search for lines with total keywords
  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const matches = line.match(/\d+(?:\.\d{2})?/g);
      if (matches && matches.length > 0) {
        const val = parseFloat(matches[matches.length - 1]);
        if (val > amount && val < 500000) {
          amount = val;
        }
      }
    }
  }

  // If no amount extracted, look for maximum realistic decimal/integer number
  if (amount === 0) {
    const numbers: number[] = [];
    rawText.replace(numberRegex, (match) => {
      const val = parseFloat(match);
      if (val > 0 && val < 500000 && val !== new Date().getFullYear()) {
        numbers.push(val);
      }
      return match;
    });
    if (numbers.length > 0) {
      amount = Math.max(...numbers);
    }
  }

  if (amount === 0) {
    amount = 100; // default backup value
  }

  // 3. Extract Category
  let category = "Other";
  let type: "income" | "expense" = "expense";
  
  const vocabulary: Record<string, { category: string; type?: "income" | "expense" }> = {
    zomato: { category: "Food" },
    swiggy: { category: "Food" },
    starbucks: { category: "Food" },
    coffee: { category: "Food" },
    canteen: { category: "Canteen" },
    mcdonald: { category: "Food" },
    dominos: { category: "Food" },
    cafe: { category: "Food" },
    pizza: { category: "Food" },
    burger: { category: "Food" },
    food: { category: "Food" },
    dinner: { category: "Food" },
    lunch: { category: "Food" },
    uber: { category: "Transport" },
    ola: { category: "Transport" },
    metro: { category: "Transport" },
    train: { category: "Transport" },
    bus: { category: "Transport" },
    cab: { category: "Transport" },
    petrol: { category: "Transport" },
    fuel: { category: "Transport" },
    ride: { category: "Transport" },
    electricity: { category: "Utilities" },
    wifi: { category: "Utilities" },
    broadband: { category: "Utilities" },
    jio: { category: "Utilities" },
    airtel: { category: "Utilities" },
    water: { category: "Utilities" },
    recharge: { category: "Utilities" },
    subscription: { category: "Utilities" },
    amazon: { category: "Shopping" },
    flipkart: { category: "Shopping" },
    myntra: { category: "Shopping" },
    clothing: { category: "Shopping" },
    shoes: { category: "Shopping" },
    mall: { category: "Shopping" },
    groceries: { category: "Groceries" },
    supermarket: { category: "Groceries" },
    mart: { category: "Groceries" },
    book: { category: "Books & Study" },
    stationery: { category: "Books & Study" },
    photocopy: { category: "Books & Study" },
    print: { category: "Books & Study" },
    course: { category: "Books & Study" },
    tuition: { category: "Books & Study" },
    salary: { category: "Salary", type: "income" },
    freelance: { category: "Freelance", type: "income" },
    upwork: { category: "Freelance", type: "income" },
    fiverr: { category: "Freelance", type: "income" },
    allowance: { category: "Parents Pocket Allow", type: "income" },
    dad: { category: "Parents Pocket Allow", type: "income" },
    mom: { category: "Parents Pocket Allow", type: "income" },
    scholarship: { category: "Scholarship", type: "income" },
    refund: { category: "Refund", type: "income" },
  };

  const lowerText = rawText.toLowerCase();
  for (const [keyword, value] of Object.entries(vocabulary)) {
    if (lowerText.includes(keyword)) {
      category = value.category;
      if (value.type) type = value.type;
      break;
    }
  }

  // 4. Extract Date
  let date = new Date().toISOString().split("T")[0];
  const dateMatch = rawText.match(dateRegex);
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[0].replace(/[./]/g, "-"));
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate.toISOString().split("T")[0];
    }
  }

  return { title, amount, type, category, date };
}
