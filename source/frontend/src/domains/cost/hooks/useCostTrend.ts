// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";

import {
  isExpiredLease,
  isMonitoredLease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { LeaseWithLeaseId } from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { useGetLeases } from "@amzn/innovation-sandbox-frontend/domains/leases/hooks";
import { CostDataPoint, DateRange, Granularity } from "../types";
import { getBucketKey } from "../utils";

export interface UseCostTrendParams {
  granularity: Granularity;
  dateRange: DateRange;
}

export interface UseCostTrendResult {
  dataPoints: CostDataPoint[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Generates all bucket keys within a date range for a given granularity.
 *
 * For Weekly granularity, we start from the Monday of the week containing dateRange.start
 * and advance by 7 days until we pass the bucket of dateRange.end.
 */
function generateAllBuckets(dateRange: DateRange, granularity: Granularity): string[] {
  const buckets: string[] = [];
  const seen = new Set<string>();

  const endKey = getBucketKey(dateRange.end, granularity);

  // Start from the bucket that contains dateRange.start
  const startBucketKey = getBucketKey(dateRange.start, granularity);

  // Parse the start bucket key back to a Date to begin iteration
  const current = new Date(startBucketKey + "T00:00:00Z");

  while (true) {
    const key = getBucketKey(current, granularity);
    if (key > endKey) break;

    if (!seen.has(key)) {
      seen.add(key);
      buckets.push(key);
    }

    // Advance by one unit from the current bucket start
    if (granularity === "Daily") {
      current.setUTCDate(current.getUTCDate() + 1);
    } else if (granularity === "Weekly") {
      current.setUTCDate(current.getUTCDate() + 7);
    } else {
      // Monthly: advance to next month
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }

  return buckets;
}

/**
 * Pure aggregation function — separated for testability.
 *
 * Aggregates lease cost data into CostDataPoints for the given granularity and date range.
 */
export function aggregateCostData(
  leases: LeaseWithLeaseId[],
  granularity: Granularity,
  dateRange: DateRange,
): CostDataPoint[] {
  // 1. Filter to monitored and expired leases only
  const relevantLeases = leases.filter(
    (l) => isMonitoredLease(l) || isExpiredLease(l),
  );

  // 2. Build bucket map: bucketKey -> totalCostAccrued sum
  const bucketMap = new Map<string, number>();

  for (const lease of relevantLeases) {
    const checkedDate = (lease as { lastCheckedDate?: string }).lastCheckedDate;
    if (!checkedDate) continue;

    const date = new Date(checkedDate);
    const bucketKey = getBucketKey(date, granularity);

    // 3. Apply dateRange filter — only include buckets within range
    const startKey = getBucketKey(dateRange.start, granularity);
    const endKey = getBucketKey(dateRange.end, granularity);
    if (bucketKey < startKey || bucketKey > endKey) continue;

    const cost = (lease as { totalCostAccrued?: number }).totalCostAccrued ?? 0;
    bucketMap.set(bucketKey, (bucketMap.get(bucketKey) ?? 0) + cost);
  }

  // 4. Generate all buckets in the date range (fill empty periods with 0)
  const allBuckets = generateAllBuckets(dateRange, granularity);

  // 5. Build data points (sorted ascending by bucket key)
  const sorted = allBuckets.sort();

  let cumulative = 0;
  const dataPoints: CostDataPoint[] = sorted.map((bucketKey) => {
    const periodSpend = bucketMap.get(bucketKey) ?? 0;
    cumulative += periodSpend;
    return {
      date: bucketKey,
      periodSpend,
      cumulativeSpend: cumulative,
    };
  });

  return dataPoints;
}

/**
 * React hook that returns aggregated cost trend data points.
 */
export function useCostTrend(params: UseCostTrendParams): UseCostTrendResult {
  const { granularity, dateRange } = params;
  const { data: leases, isLoading, error } = useGetLeases();

  const dataPoints = useMemo(() => {
    if (!leases) return [];
    return aggregateCostData(leases, granularity, dateRange);
  }, [leases, granularity, dateRange]);

  return {
    dataPoints,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
  };
}
