"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import { AlertCircle, AlertTriangle, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TriggeredAlert {
  id: string;
  type: "low_balance" | "budget_limit";
  title: string;
  message: string;
  severity: "warning" | "danger";
}

export default function AlertsBanner() {
  const { profile } = useAuthStore();
  const { accounts, activeBudget } = useFinanceStore();
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Run audit calculations whenever data changes
  useEffect(() => {
    const activeAlerts: TriggeredAlert[] = [];

    // 1. Audit Accounts (Low Balance check, threshold: < 1000)
    accounts
      .filter((a) => a.type !== "loan" && a.type !== "savings")
      .forEach((acc) => {
        const threshold = 1000;
        if (acc.balance < threshold) {
          activeAlerts.push({
            id: `low-bal-${acc.id}`,
            type: "low_balance",
            title: `Low Balance: ${acc.name}`,
            message: `Account balance is low: ${currencySymbol}${acc.balance.toLocaleString()}. Please restrict unnecessary card payments.`,
            severity: acc.balance < 300 ? "danger" : "warning",
          });
        }
      });

    // 2. Audit Budgets (Spent check, threshold: > 90%)
    if (activeBudget && activeBudget.categoryLimits) {
      const categoryLimits = activeBudget.categoryLimits;
      const currentSpend = activeBudget.currentSpend || {};

      Object.entries(categoryLimits).forEach(([category, limit]) => {
        const spent = currentSpend[category] || 0;
        if (limit > 0) {
          const ratio = spent / limit;
          if (ratio >= 0.9) {
            const percent = Math.round(ratio * 100);
            activeAlerts.push({
              id: `budget-lim-${category}`,
              type: "budget_limit",
              title: `Budget Exhausted: ${category}`,
              message: `You spent ${percent}% of your category limit (${currencySymbol}${spent.toLocaleString()} / ${currencySymbol}${limit.toLocaleString()}).`,
              severity: ratio >= 1.0 ? "danger" : "warning",
            });
          }
        }
      });
    }

    setAlerts(activeAlerts);
  }, [accounts, activeBudget, currencySymbol]);

  const handleDismiss = (id: string) => {
    setDismissedAlertIds((prev) => [...prev, id]);
  };

  // Filter out alerts that the user dismissed
  const visibleAlerts = alerts.filter((a) => !dismissedAlertIds.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2.5 w-full">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "border backdrop-blur rounded-xl p-4 shadow-sm flex items-start gap-3 relative animate-slide-in",
            alert.severity === "danger"
              ? "bg-red-500/10 border-red-500/25 text-red-500"
              : "bg-amber-500/10 border-amber-500/25 text-amber-500"
          )}
        >
          {alert.severity === "danger" ? (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}

          <div className="space-y-0.5 flex-1 pr-6">
            <h5 className="text-xs font-bold uppercase tracking-wider leading-tight">{alert.title}</h5>
            <p className="text-xs leading-normal opacity-90">{alert.message}</p>
          </div>

          <button
            onClick={() => handleDismiss(alert.id)}
            className="absolute top-3.5 right-3 p-1 rounded-md text-muted-foreground hover:bg-muted/10 hover:text-foreground cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
