"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { ArrowRight, Sparkles, ReceiptText, ShieldAlert, Cpu, CircleDollarSign } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const features = [
    {
      title: "Intelligent Quick Entry",
      description: "No complex forms. Type 'Lunch 220' or 'Salary 5000' and let our NLP parse categories instantly.",
      icon: Cpu,
    },
    {
      title: "Education Loan Board",
      description: "Manage approval limits, disbursements, track used totals, and calculate interest schedules.",
      icon: CircleDollarSign,
    },
    {
      title: "Receipt & Screenshot OCR",
      description: "Drag-and-drop screenshots of UPI bills or paper receipts. Gemini parses amount and merchant instantly.",
      icon: ReceiptText,
    },
    {
      title: "Parental Transparency Portal",
      description: "Give parents visual summaries with custom permissions, preserving student financial privacy.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-between overflow-hidden">
      {/* Visual Ambient Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_70%)]" />

      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow font-bold">
            F
          </div>
          <span className="font-bold text-lg tracking-tight">Student Pocket</span>
        </div>

        <div>
          {checkingAuth ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02] cursor-pointer"
            >
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02] cursor-pointer"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center space-y-8 z-10 py-16">
        <div className="inline-flex items-center space-x-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-indigo-300 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Intelligent Student Cashflow Management</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent max-w-3xl leading-tight">
          The Financial Operating System for Students
        </h1>

        <p className="text-md sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
          Manage allowances, freelancing logs, education loans, budgets, and savings goals in a fast, minimal space designed like Notion & Stripe.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-98 cursor-pointer"
          >
            Create Your Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            Sign In to OS
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl mx-auto px-6 py-12 border-t border-zinc-900 bg-zinc-950/30 backdrop-blur z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group border border-zinc-900 bg-zinc-900/10 rounded-xl p-6 transition-all hover:border-zinc-800 hover:bg-zinc-900/25"
              >
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900/80 border border-zinc-800 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-sm text-zinc-100">{feature.title}</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600 border-t border-zinc-900/60 z-10">
        <p>&copy; {new Date().getFullYear()} Student Pocket. All rights reserved.</p>
        <p className="mt-2 sm:mt-0 flex items-center space-x-1">
          <span>Built for students studying away from home.</span>
        </p>
      </footer>
    </div>
  );
}
