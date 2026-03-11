// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";

import {
  isMonitoredLease,
  isExpiredLease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { useGetLeases } from "@amzn/innovation-sandbox-frontend/domains/leases/hooks";
import {
  CostSummary,
  LeaseCostEntry,
} from "@amzn/innovation-sandbox-frontend/domains/cost/types";

export const useCostSummary = () => {
  const { data: leases, isLoading, error } = useGetLeases();

  const summary = useMemo<CostSummary | undefined>(() => {
    if (!leases) return undefined;

    const costLeases = leases.filter(
      (l) => isMonitoredLease(l) || isExpiredLease(l),
    ) as (typeof leases[number] & { totalCostAccrued: number })[];

    const entries: LeaseCostEntry[] = costLeases.map((lease) => {
      const maxSpend = lease.maxSpend ?? null;
      const totalCostAccrued = lease.totalCostAccrued;
      const usagePercent =
        maxSpend && maxSpend > 0
          ? Math.min((totalCostAccrued / maxSpend) * 100, 100)
          : null;

      return {
        leaseId: (lease as any).leaseId ?? lease.uuid,
        userEmail: lease.userEmail,
        templateName: lease.originalLeaseTemplateName,
        status: lease.status,
        totalCostAccrued,
        maxSpend,
        usagePercent,
      };
    });

    const totalSpend = entries.reduce((sum, e) => sum + e.totalCostAccrued, 0);
    const totalBudget = entries.reduce(
      (sum, e) => sum + (e.maxSpend ?? 0),
      0,
    );
    const budgetUtilizationPercent =
      totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    const activeLeaseCount = entries.filter(
      (e) => e.status === "Active" || e.status === "Frozen",
    ).length;
    const budgetExceededCount = entries.filter(
      (e) => e.status === "BudgetExceeded",
    ).length;

    const spendByStatus = [
      {
        title: "Active",
        value: entries
          .filter((e) => e.status === "Active")
          .reduce((s, e) => s + e.totalCostAccrued, 0),
      },
      {
        title: "Frozen",
        value: entries
          .filter((e) => e.status === "Frozen")
          .reduce((s, e) => s + e.totalCostAccrued, 0),
      },
      {
        title: "Expired",
        value: entries
          .filter((e) => e.status === "Expired")
          .reduce((s, e) => s + e.totalCostAccrued, 0),
      },
      {
        title: "BudgetExceeded",
        value: entries
          .filter((e) => e.status === "BudgetExceeded")
          .reduce((s, e) => s + e.totalCostAccrued, 0),
      },
      {
        title: "Other",
        value: entries
          .filter(
            (e) =>
              !["Active", "Frozen", "Expired", "BudgetExceeded"].includes(
                e.status,
              ),
          )
          .reduce((s, e) => s + e.totalCostAccrued, 0),
      },
    ].filter((item) => item.value > 0);

    return {
      totalSpend,
      totalBudget,
      budgetUtilizationPercent,
      activeLeaseCount,
      budgetExceededCount,
      leases: entries,
      spendByStatus,
    };
  }, [leases]);

  return { summary, isLoading, error };
};
