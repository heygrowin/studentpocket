"use client";

import React, { useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import {
  UploadCloud,
  FileImage,
  X,
  Loader2,
  Check,
  AlertCircle,
  CreditCard,
  Calendar,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createWorker } from "tesseract.js";
import { parseRawReceiptText } from "@/lib/utils/nlpParser";

interface ReceiptScannerProps {
  onClose: () => void;
}

export default function ReceiptScanner({ onClose }: ReceiptScannerProps) {
  const { user, profile } = useAuthStore();
  const { accounts, createTransaction } = useFinanceStore();
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // State controls
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [scanning, setScanning] = useState(false);
  const [parsedData, setParsedData] = useState<{
    title: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
  } | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default account
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // File Drag-Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (JPEG, PNG).");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerScan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    setErrorMsg(null);

    try {
      // 1. Convert file to base64 data string (excluding the mime header)
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
          const resultStr = reader.result as string;
          // remove data:image/png;base64, etc.
          const base64Data = resultStr.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
      });

      const base64Image = await base64Promise;

      // 2. Call OCR route with local Tesseract.js fallback
      let data;
      try {
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Image,
            mimeType: selectedFile.type,
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || "Gemini OCR is offline.");
        }

        data = await response.json();
      } catch (ocrErr: any) {
        console.warn("Gemini Cloud OCR API fallback triggered:", ocrErr);
        
        // Start client-side WebAssembly OCR
        const worker = await createWorker("eng");
        const ret = await worker.recognize(imagePreview || selectedFile);
        await worker.terminate();

        const rawText = ret.data.text;
        if (!rawText || !rawText.trim()) {
          throw new Error("No text could be extracted from this image by the local OCR engine.");
        }

        // Parse extracted text using local regex
        data = parseRawReceiptText(rawText);
      }

      setParsedData(data);
    } catch (err: any) {
      console.error("OCR Scanner Error:", err);
      setErrorMsg(err.message || "Failed to scan image. Please try again or fill manual entries.");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScannedTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !parsedData || !selectedAccountId) return;
    setScanning(true);
    setErrorMsg(null);

    try {
      const isOutflow = ![
        "income",
        "salary",
        "freelancing",
        "scholarship",
        "refund",
        "loan_disbursement",
      ].includes(parsedData.type);

      await createTransaction(user.uid, {
        title: parsedData.title,
        amount: parsedData.amount,
        type: parsedData.type,
        category: parsedData.category,
        fromAccountId: isOutflow ? selectedAccountId : "",
        toAccountId: !isOutflow ? selectedAccountId : "",
        date: parsedData.date,
        notes: "Parsed via Gemini OCR Screenshot Scanner",
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save parsed transaction.");
    } finally {
      setScanning(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="glass relative w-full max-w-2xl bg-card rounded-2xl p-6 shadow-2xl animate-slide-in flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
        {/* Absolute Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Side: Upload zone */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Screenshot & Receipt Scanner</h3>
            <p className="text-xs text-muted-foreground">
              Drop your payment screen (GPay, Paytm, SMS) or invoice to scan and extract transaction details.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500 flex items-center">
              <Check className="h-4 w-4 mr-2 shrink-0 animate-bounce" />
              Receipt entry successfully logged into ledger!
            </div>
          )}

          {/* Drag zone */}
          {!imagePreview ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer hover:border-primary/50 transition-colors bg-secondary/10 min-h-[220px]",
                dragActive ? "border-primary bg-secondary/35" : "border-border"
              )}
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground opacity-75" />
              <div>
                <p className="text-xs font-semibold">Drag & drop receipt here, or browse files</p>
                <p className="text-[10px] text-muted-foreground mt-1">Supports PNG, JPEG, JPG</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative border border-border rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center min-h-[220px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Receipt Preview" className="max-h-[260px] max-w-full object-contain" />
              
              {!parsedData && !scanning && (
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedFile(null);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border cursor-pointer"
                  title="Remove Image"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Trigger button */}
          {selectedFile && !parsedData && (
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="w-full flex items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
            >
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning screenshot...
                </>
              ) : (
                "Scan the screenshot"
              )}
            </button>
          )}
        </div>

        {/* Right Side: Parsed Confirmation Form */}
        {parsedData && (
          <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6 space-y-4 animate-slide-in">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
              <Check className="h-4 w-4 mr-1 text-emerald-500" />
              Confirm Extracted Details
            </h4>

            <form onSubmit={handleSaveScannedTx} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="ocr-title">
                  Merchant / Payee Title
                </label>
                <input
                  id="ocr-title"
                  type="text"
                  value={parsedData.title}
                  onChange={(e) => setParsedData({ ...parsedData, title: e.target.value })}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="ocr-amount">
                    Amount ({currencySymbol})
                  </label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="ocr-amount"
                      type="number"
                      step="0.01"
                      value={parsedData.amount}
                      onChange={(e) => setParsedData({ ...parsedData, amount: Number(e.target.value) })}
                      className="pl-7 pr-2.5 py-1.5 block w-full border border-border rounded-lg bg-background text-xs focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="ocr-date">
                    Transaction Date
                  </label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="ocr-date"
                      type="date"
                      value={parsedData.date}
                      onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                      className="pl-7 pr-2.5 py-1.5 block w-full border border-border rounded-lg bg-background text-xs focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="ocr-cat">
                    Category
                  </label>
                  <select
                    id="ocr-cat"
                    value={parsedData.category}
                    onChange={(e) => setParsedData({ ...parsedData, category: e.target.value })}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account card */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="ocr-acc">
                    Charge/Deposit Account
                  </label>
                  <select
                    id="ocr-acc"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs focus:border-primary focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({currencySymbol}{acc.balance})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={scanning}
                  className="flex-1 flex items-center justify-center rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm & Save Ledger"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParsedData(null);
                    setImagePreview(null);
                    setSelectedFile(null);
                  }}
                  className="px-3 border border-border rounded-lg text-xs hover:bg-muted cursor-pointer"
                >
                  Retry Scan
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
