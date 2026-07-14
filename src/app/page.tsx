"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { ArrowRight, Sparkles, Receipt, GraduationCap, MessagesSquare, LayoutDashboard, Sun, Moon, Coins, CircleDollarSign } from "lucide-react";
<meta name="google-site-verification" content="K3H91hwvFVD5eFOWVjrdR-J3QfjoF3_evsw5n2N4xXs" />

export default function LandingPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference or local storage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const features = [
    {
      title: "Smart Text Logging",
      description: "Type 'Lunch 150'. The AI automatically categorizes and adds it to your budget.",
      icon: MessagesSquare,
    },
    {
      title: "Receipt Scanning",
      description: "Screenshot a GPay receipt or bank SMS. We extract the details securely.",
      icon: Receipt,
    },
    {
      title: "Student Loans",
      description: "Track disbursements and calculate interest for your education loan in one place.",
      icon: GraduationCap,
    },
    {
      title: "Parent Sharing",
      description: "Share a simplified, read-only summary with parents for complete transparency.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-500 flex flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-reverse 5s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}} />

      {/* Navigation */}
      <nav className="relative z-50 w-full max-w-6xl mx-auto px-6 py-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm bg-white" />
          <span className="font-bold text-lg tracking-tight">Student Pocket</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {checkingAuth ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isLoggedIn ? (
             <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
             <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-24 pb-20 sm:pt-32 flex flex-col items-center text-center relative z-10">
        
        {/* Floating Animation Elements */}
        <div className="absolute left-[10%] top-[20%] animate-float opacity-80 pointer-events-none hidden md:block">
          <div className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-4 rounded-full backdrop-blur-md border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <CircleDollarSign className="w-12 h-12" />
          </div>
        </div>
        
        <div className="absolute right-[15%] top-[10%] animate-float-delayed opacity-80 pointer-events-none hidden md:block">
          <div className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 p-3 rounded-full backdrop-blur-md border border-amber-500/20 shadow-lg shadow-amber-500/10">
            <Coins className="w-10 h-10" />
          </div>
        </div>
        
        <div className="absolute left-[20%] bottom-[20%] animate-float-delayed opacity-80 pointer-events-none hidden md:block">
          <div className="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 p-2 rounded-full backdrop-blur-md border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-8 ring-1 ring-inset ring-indigo-500/20">
          <Sparkles className="w-4 h-4" />
          AI-Powered Student Finance
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
          Manage your student <br className="hidden sm:block" /> budget effortlessly.
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed font-medium">
          Say goodbye to complex spreadsheets. Log expenses naturally, scan receipts instantly, and track education loans—all in one beautifully simple workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto relative z-20">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-semibold text-background hover:opacity-90 transition-all shadow-xl shadow-foreground/10 active:scale-95"
          >
            Start for free
          </Link>
        </div>

        {/* Dashboard Preview / Mockup Area */}
        <div className="mt-20 w-full max-w-4xl relative">
           <div className="absolute inset-0 -top-10 bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl -z-10 rounded-full opacity-70" />
           
           <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-2 shadow-2xl shadow-foreground/5">
              <div className="rounded-xl border border-border bg-card aspect-[16/9] w-full flex flex-col overflow-hidden">
                 <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-muted/50">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                 </div>
                 <div className="flex-1 p-6 sm:p-10 flex flex-col gap-6 bg-muted/30">
                    <div className="w-1/3 h-8 bg-muted rounded-lg animate-pulse" />
                    <div className="grid grid-cols-3 gap-4">
                       <div className="h-24 bg-muted rounded-xl animate-pulse" />
                       <div className="h-24 bg-muted rounded-xl animate-pulse delay-75" />
                       <div className="h-24 bg-indigo-500/10 rounded-xl animate-pulse delay-150" />
                    </div>
                    <div className="flex-1 bg-card border border-border rounded-xl shadow-sm" />
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 w-full bg-card border-t border-border py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need, nothing you don't.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Designed specifically for the financial realities of college life.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center">
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg">{feat.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 opacity-70 grayscale" />
            <span className="font-semibold text-sm text-muted-foreground">Student Pocket</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            &copy; {new Date().getFullYear()} HeyGrow.in
          </p>
        </div>
      </footer>
    </div>
  );
}
