// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
