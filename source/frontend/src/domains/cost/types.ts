// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type Granularity = "Daily" | "Weekly" | "Monthly";

export interface CostDataPoint {
  /** 집계 기간의 시작 날짜 (ISO 8601 date string, e.g. "2024-01-15") */
  date: string;
  /** 해당 기간의 지출 합계 (USD) */
  periodSpend: number;
  /** 조회 시작일부터의 누적 지출 (USD) */
  cumulativeSpend: number;
}

export interface BudgetAllocation {
  id: string;
  date: string;
  amount: number;
  label?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface LeaseCostEntry {
  leaseId: string;
  userEmail: string;
  templateName: string;
  status: string;
  totalCostAccrued: number;
  maxSpend: number | null;
  usagePercent: number | null;
}

export interface CostSummary {
  totalSpend: number;
  totalBudget: number;
  budgetUtilizationPercent: number;
  activeLeaseCount: number;
  budgetExceededCount: number;
  leases: LeaseCostEntry[];
  spendByStatus: { title: string; value: number }[];
}
