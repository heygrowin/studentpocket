"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { parseTransactionText, ParsedTransaction } from "@/lib/utils/nlpParser";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  X,
  Mic,
  MicOff,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReceiptScanner from "./ReceiptScanner";

export default function NLPInputBar() {
  const { user, profile } = useAuthStore();
  const { accounts, createTransaction } = useFinanceStore();
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  const [inputVal, setInputVal] = useState("");
  const [localParsed, setLocalParsed] = useState<ParsedTransaction | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Web Speech API Voice States
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Set default account when accounts list changes
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Handle live parser feedback
  useEffect(() => {
    if (!inputVal.trim()) {
      setLocalParsed(null);
      setShowConfirm(false);
      setErrorMsg(null);
      return;
    }
    const result = parseTransactionText(inputVal);
    setLocalParsed(result);
  }, [inputVal]);

  // Instantiate Web Speech Recognition on Client Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN"; // Configured for English with Indian mixed accents (e.g. canteen, rupees)

        rec.onstart = () => {
          setListening(true);
          setErrorMsg(null);
          setSuccess(false);
        };

        rec.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          setInputVal(speechToText);
        };

        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error === "no-speech") {
            setErrorMsg("No speech detected. Please speak clearly near the microphone.");
          } else if (event.error === "not-allowed") {
            setErrorMsg("Microphone permission denied by browser settings.");
          } else {
            setErrorMsg("Failed to transcribe audio speech.");
          }
          setListening(false);
        };

        rec.onend = () => {
          setListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErrorMsg("Web Speech API is not supported in this browser. Please type manually.");
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !user) return;
    setErrorMsg(null);
    setSuccess(false);

    if (accounts.length === 0) {
      setErrorMsg("Please create at least one account in the transactions page first.");
      return;
    }

    const words = inputVal.trim().split(/\s+/);
    const isSentence = words.length > 2;

    if (isSentence) {
      setApiLoading(true);
      try {
        const response = await fetch("/api/parser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputVal }),
        });
        if (!response.ok) {
          throw new Error("AI parser failed. Utilizing local parser.");
        }
        const data = await response.json();
        setLocalParsed(data);
        setShowConfirm(true);
      } catch (err: any) {
        console.warn(err);
        if (localParsed) {
          setShowConfirm(true);
        } else {
          setErrorMsg("Could not parse transaction. Try typing e.g., 'Canteen 120'.");
        }
      } finally {
        setApiLoading(false);
      }
    } else {
      if (localParsed) {
        setShowConfirm(true);
      } else {
        setErrorMsg("Try typing a description and amount (e.g. 'Coffee 180').");
      }
    }
  };

  const handleUpdateField = (field: keyof ParsedTransaction, value: any) => {
    if (!localParsed) return;
    setLocalParsed({
      ...localParsed,
      [field]: value
    });
  };

  const handleConfirmSave = async () => {
    if (!user || !localParsed || !selectedAccountId) return;
    setApiLoading(true);
    try {
      const isOutflow = ![
        "income",
        "salary",
        "freelancing",
        "scholarship",
        "refund",
        "loan_disbursement",
      ].includes(localParsed.type);

      await createTransaction(user.uid, {
        title: localParsed.title,
        amount: localParsed.amount,
        type: localParsed.type as any,
        category: localParsed.category,
        fromAccountId: isOutflow ? selectedAccountId : "",
        toAccountId: !isOutflow ? selectedAccountId : "",
        date: new Date().toISOString().split("T")[0],
        notes: "Logged via Intelligent Quick Entry Console",
      });

      setSuccess(true);
      setInputVal("");
      setLocalParsed(null);
      setShowConfirm(false);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to commit transaction.");
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={apiLoading || listening}
            placeholder={listening ? "Listening... Speak description and amount now." : "Type 'Lunch 120' or 'Dad sent 5000' and press Enter..."}
            className="w-full pl-4 pr-28 py-3.5 bg-card/60 hover:bg-card/85 focus:bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-muted-foreground transition-all"
          />

          <div className="absolute right-2 flex items-center space-x-1.5">
            {/* Voice microphone button toggle */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={apiLoading}
              className={cn(
                "p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer",
                listening && "bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20"
              )}
              title="Voice Speech Log"
            >
              {listening ? <MicOff className="h-4.5 w-4.5 animate-bounce" /> : <Mic className="h-4.5 w-4.5" />}
            </button>

            {/* Scan Screenshot button */}
            <button
              type="button"
              onClick={() => setShowScanModal(true)}
              disabled={apiLoading || listening}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
              title="Scan Screenshot"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>

            {/* Submit arrow */}
            <button
              type="submit"
              disabled={apiLoading || !inputVal.trim() || listening}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-30 transition-all cursor-pointer shadow-sm"
            >
              {apiLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <ArrowRight className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Parser Real-Time Tag feedback list */}
      {localParsed && !showConfirm && (
        <div className="flex flex-wrap gap-2 text-xs font-semibold animate-slide-in">
          <span className="text-muted-foreground flex items-center mr-1">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-400 animate-pulse" />
            Detected:
          </span>
          <span className="bg-secondary px-2.5 py-1 rounded-md text-foreground">
            Title: &ldquo;{localParsed.title}&rdquo;
          </span>
          <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md">
            Amount: {currencySymbol}{localParsed.amount}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 rounded-md capitalize",
              localParsed.type === "expense" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
            )}
          >
            {localParsed.type}
          </span>
          <span className="bg-secondary px-2.5 py-1 rounded-md text-foreground">
            Category: {localParsed.category}
          </span>
        </div>
      )}

      {/* Alerts or errors */}
      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center animate-slide-in">
          <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500 flex items-center animate-slide-in">
          <Check className="h-4 w-4 mr-2 shrink-0 animate-bounce" />
          Transaction successfully committed to your ledger!
        </div>
      )}

      {/* Inline Confirmation Drawer HUD */}
      {showConfirm && localParsed && (
        <div className="border border-border bg-card/60 backdrop-blur rounded-xl p-4 shadow-sm animate-slide-in space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Adjust & Confirm Entry
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleConfirmSave}
                disabled={apiLoading || !localParsed.title || !localParsed.amount}
                className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-40"
                title="Commit Transaction"
              >
                {apiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Entry"}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setLocalParsed(null);
                }}
                disabled={apiLoading}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 text-sm">
            {/* Title / Description */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Description / Title
              </label>
              <input
                type="text"
                value={localParsed.title}
                onChange={(e) => handleUpdateField("title", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            {/* Amount */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={localParsed.amount}
                onChange={(e) => handleUpdateField("amount", parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            {/* Type: Income / Expense */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Type
              </label>
              <select
                value={localParsed.type}
                onChange={(e) => handleUpdateField("type", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            {/* Category */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Category
              </label>
              <select
                value={localParsed.category}
                onChange={(e) => handleUpdateField("category", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {["Food", "Groceries", "Rent", "Hostel Fee", "Canteen", "Transport", "Shopping", "Books & Study", "Entertainment", "Utilities", "Medical", "Salary", "Freelance", "Parents Pocket Allow", "Scholarship", "Refund", "Other"].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Selector */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Source/Target Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({currencySymbol}{a.balance})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {showScanModal && (
        <ReceiptScanner onClose={() => setShowScanModal(false)} />
      )}
    </div>
  );
}
