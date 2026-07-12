"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { doc, getDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  PiggyBank,
  GraduationCap,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Loader2,
  ChevronRight
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, setUser, setProfile, setLoading, logout } = useAuthStore();
  const { subscribeAccounts, subscribeTransactions, subscribeSavingsGoals, subscribeLoans, subscribeSharing, subscribeAlertThresholds, subscribeActiveBudget, unsubscribeAll } = useFinanceStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Read local storage or default to dark
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const userEmail = user?.email || "";
  useEffect(() => {
    if (user?.uid) {
      subscribeAccounts(user.uid);
      subscribeTransactions(user.uid);
      subscribeSavingsGoals(user.uid);
      subscribeLoans(user.uid);
      subscribeSharing(user.uid, userEmail);
      subscribeAlertThresholds(user.uid);
      const currentYearMonth = new Date().toISOString().substring(0, 7);
      subscribeActiveBudget(user.uid, currentYearMonth);
    }
    return () => {
      unsubscribeAll();
    };
  }, [
    user,
    userEmail,
    subscribeAccounts,
    subscribeTransactions,
    subscribeSavingsGoals,
    subscribeLoans,
    subscribeSharing,
    subscribeAlertThresholds,
    subscribeActiveBudget,
    unsubscribeAll,
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as any);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
        setLoading(false);
      } else {
        logout();
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading, logout, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Synchronizing Session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navigationItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: ReceiptText },
    { name: "Budgets", href: "/budgets", icon: PieChart },
    { name: "Savings Goals", href: "/savings", icon: PiggyBank },
    { name: "Education Loans", href: "/loans", icon: GraduationCap },
    { name: "Parent Portal", href: "/sharing", icon: Users },
  ];

  const mobileBottomItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: ReceiptText },
    { name: "Budgets", href: "/budgets", icon: PieChart },
    { name: "Loans", href: "/loans", icon: GraduationCap },
    { name: "Parent Portal", href: "/sharing", icon: Users },
  ];

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground transition-colors duration-300">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card/40 backdrop-blur-md">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center px-6 mb-8 space-x-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain rounded-lg shadow-sm" />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group cursor-pointer ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <Icon className={`mr-3 h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Settings */}
        <div className="flex-shrink-0 flex border-t border-border p-4">
          <div className="flex items-center justify-between w-full">
            <div
              onClick={() => router.push("/settings")}
              className="flex items-center space-x-3 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
              title="Profile Settings"
            >
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary shadow shrink-0">
                {(profile?.displayName || user.email || "?")[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate leading-tight">
                  {profile?.displayName || "User"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar (Floating HUD) */}
      <div className="flex flex-col flex-1 max-w-full overflow-x-hidden md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b border-border bg-background/80 backdrop-blur-md md:hidden">
          {/* Mobile Profile Link -> Go to Settings */}
          <Link
            href="/settings"
            className="flex items-center space-x-2.5 overflow-hidden hover:opacity-85 transition-opacity max-w-[65%] cursor-pointer animate-fade-in"
            title="Profile Settings"
          >
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary shadow shrink-0">
              {(profile?.displayName || user.email || "?")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate leading-tight text-foreground">
                {profile?.displayName || "User"}
              </p>
              <p className="text-[9px] text-muted-foreground truncate leading-tight">
                View Settings
              </p>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex flex-col w-full max-w-xs bg-card border-r border-border pt-5 pb-4 h-full animate-slide-in">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center px-6 mb-8 space-x-3">
                <img src="/logo.png" alt="Logo" className="h-9 w-9 object-contain rounded-md bg-card" />
              </div>

              <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                      {(profile?.displayName || user.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{profile?.displayName || "User"}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 relative focus:outline-none overflow-x-hidden overflow-y-auto pb-24 md:pb-6">
          <div className="py-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Sticky Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-border bg-background/80 backdrop-blur-md flex items-center justify-around px-2 md:hidden">
          {mobileBottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? "text-primary scale-110" : "text-muted-foreground"}`} />
                <span className="truncate max-w-[70px]">{item.name.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
