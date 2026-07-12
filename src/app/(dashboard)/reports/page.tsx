"use client";

import React from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useFinanceStore } from "@/lib/store/useFinanceStore";
import {
  TrendingUp,
  TrendingDown,
  LineChart as LineIcon,
  Calculator,
  Calendar
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

export default function ReportsPage() {
  const { profile } = useAuthStore();
  const { transactions, activeBudget } = useFinanceStore();
  
  const currencySymbol = profile?.currency === "EUR" ? "€" : profile?.currency === "USD" ? "$" : "₹";

  // Calculate totals
  const totalInflow = transactions
    .filter((t) => !["expense", "loan_usage"].includes(t.type))
    .reduce((acc, c) => acc + c.amount, 0);

  const totalOutflow = transactions
    .filter((t) => ["expense", "loan_usage"].includes(t.type))
    .reduce((acc, c) => acc + c.amount, 0);

  const netSavings = totalInflow - totalOutflow;
  const savingsRate = totalInflow > 0 ? Math.round((netSavings / totalInflow) * 100) : 0;

  // Group outflows by category
  const categoryOutflows: Record<string, number> = {};
  transactions
    .filter((t) => ["expense", "loan_usage"].includes(t.type))
    .forEach((t) => {
      const cat = t.category || "Other";
      categoryOutflows[cat] = (categoryOutflows[cat] || 0) + t.amount;
    });

  const pieData = Object.entries(categoryOutflows).map(([name, value]) => ({
    name,
    value,
  }));

  // Bar chart data (Group inflow vs outflow by date)
  const dailyFlows: Record<string, { date: string; income: number; expense: number }> = {};
  
  // Sort transactions by date ascending for charts
  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  
  sortedTx.slice(-30).forEach((t) => {
    const d = t.date;
    if (!dailyFlows[d]) {
      dailyFlows[d] = { date: d.substring(5), income: 0, expense: 0 };
    }
    if (["expense", "loan_usage"].includes(t.type)) {
      dailyFlows[d].expense += t.amount;
    } else {
      dailyFlows[d].income += t.amount;
    }
  });

  const barData = Object.values(dailyFlows);

  const CHART_COLORS = [
    "#6366f1", // indigo
    "#ec4899", // pink
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#64748b"  // slate
  ];

  // Daily budget math
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  
  const totalBudgetLimit = activeBudget?.totalLimit || 15000;
  const budgetSpent = Object.values(activeBudget?.currentSpend || {}).reduce((a, b) => a + b, 0);
  const remainingBudget = Math.max(0, totalBudgetLimit - budgetSpent);
  const recommendedDailyCap = Math.round(remainingBudget / daysRemaining);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center">
          <LineIcon className="mr-2 h-6 w-6 text-indigo-400" />
          Financial Reports & Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Audit cashflow velocities, savings rates, and recommended category caps.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Earnings</span>
          <h3 className="text-2xl font-bold text-emerald-500 mt-2 flex items-center">
            <TrendingUp className="h-5 w-5 mr-1" />
            {currencySymbol}{totalInflow.toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">All inflows logged to ledger</p>
        </div>

        <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Expenses</span>
          <h3 className="text-2xl font-bold text-rose-500 mt-2 flex items-center">
            <TrendingDown className="h-5 w-5 mr-1" />
            {currencySymbol}{totalOutflow.toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">All outflows logged to ledger</p>
        </div>

        <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Pocket Change</span>
          <h3 className="text-2xl font-bold text-indigo-400 mt-2">
            {netSavings >= 0 ? "+" : ""}{currencySymbol}{netSavings.toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Remaining capital changes</p>
        </div>

        <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Savings Velocity</span>
          <h3 className="text-2xl font-bold text-white mt-2">
            {savingsRate}%
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Savings to earnings ratio</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Outflow Categories Breakdown */}
        <div className="lg:col-span-5 border border-border bg-card/30 backdrop-blur rounded-2xl p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category Spend Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Where your pocket money is allocated.</p>
          </div>

          {pieData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-12 flex-grow flex items-center justify-center">
              No outflow metrics recorded. Add expenses to populate charts.
            </p>
          ) : (
            <div className="flex-grow flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, "Amount"]}
                      contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px" }}
                    />
                  </RechartPie>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 overflow-y-auto max-h-48 text-[11px] font-semibold w-full">
                {pieData.map((d, index) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="text-foreground shrink-0">{currencySymbol}{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Cashflow velocities */}
        <div className="lg:col-span-7 border border-border bg-card/30 backdrop-blur rounded-2xl p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cash Inflow vs Outflow Velocity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Timeline of financial changes.</p>
          </div>

          {barData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-12 flex-grow flex items-center justify-center">
              Timeline data requires logged transactions.
            </p>
          ) : (
            <div className="flex-grow h-60 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#71717a" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`]}
                    contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                  <Bar dataKey="income" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recommended pacing advice Card */}
      <div className="border border-border bg-indigo-600/5 backdrop-blur rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400">
          <Calculator className="h-6 w-6" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm text-foreground flex items-center">
            Pacing Calculator Recommendations
            <Calendar className="h-4 w-4 ml-1.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide ml-2">
              {daysRemaining} Days remaining in month
            </span>
          </h4>
          <p className="text-xs text-muted-foreground">
            With {currencySymbol}{remainingBudget.toLocaleString()} left in your limit, spend under{" "}
            <strong className="text-indigo-400 font-bold">{currencySymbol}{recommendedDailyCap} per day</strong> to prevent budget overruns.
          </p>
        </div>
      </div>
    </div>
  );
}
