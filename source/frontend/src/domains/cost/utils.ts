// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CostDataPoint, Granularity } from "./types";

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/**
 * Validates a date range.
 * Returns an error string if invalid, or null if valid.
 */
export function validateDateRange(start: Date, end: Date): string | null {
  if (end < start) {
    return "End date must not be earlier than start date.";
  }
  if (end.getTime() - start.getTime() > TWO_YEARS_MS) {
    return "Date range must not exceed 2 years.";
  }
  return null;
}

/**
 * Returns a bucket key string for the given date and granularity.
 * Daily:   "YYYY-MM-DD"
 * Weekly:  ISO week start (Monday) "YYYY-MM-DD"
 * Monthly: "YYYY-MM-01"
 */
export function getBucketKey(date: Date, granularity: Granularity): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  if (granularity === "Daily") {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  if (granularity === "Weekly") {
    // Adjust to Monday (ISO week start)
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // days to subtract to reach Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  }

  // Monthly
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

export interface KpiResult {
  totalSpend: number;
  averageSpend: number;
  peakPeriod: string | null;
  budgetRemaining: number | null;
}

/**
 * Computes KPI values from an array of CostDataPoints.
 */
export function computeKpis(
  dataPoints: CostDataPoint[],
  overallBudget: number | null,
): KpiResult {
  const totalSpend = dataPoints.reduce((sum, dp) => sum + dp.periodSpend, 0);
  const averageSpend = dataPoints.length > 0 ? totalSpend / dataPoints.length : 0;

  let peakPeriod: string | null = null;
  if (dataPoints.length > 0) {
    const peak = dataPoints.reduce((max, dp) =>
      dp.periodSpend > max.periodSpend ? dp : max,
    );
    peakPeriod = peak.date;
  }

  const budgetRemaining =
    overallBudget !== null ? overallBudget - totalSpend : null;

  return { totalSpend, averageSpend, peakPeriod, budgetRemaining };
}

/**
 * Determines the budget alert level based on spend vs budget.
 */
export function getBudgetAlertLevel(
  totalSpend: number,
  overallBudget: number | null,
): "none" | "warning" | "error" {
  if (overallBudget === null) return "none";
  const ratio = totalSpend / overallBudget;
  if (ratio >= 1.0) return "error";
  if (ratio >= 0.8) return "warning";
  return "none";
}
