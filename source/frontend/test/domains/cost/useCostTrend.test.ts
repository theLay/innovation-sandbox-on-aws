// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: cost-trend-dashboard, Property 3: Granularity별 중복 없는 데이터 포인트
// Feature: cost-trend-dashboard, Property 4: 빈 기간 0 채우기
// Feature: cost-trend-dashboard, Property 5: 오름차순 정렬
// Feature: cost-trend-dashboard, Property 6: 날짜 범위 필터링
// Feature: cost-trend-dashboard, Property 14: 집계 정확성

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ExpiredLease,
  MonitoredLease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { LeaseWithLeaseId } from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { aggregateCostData } from "../../../src/domains/cost/hooks/useCostTrend";
import { Granularity } from "../../../src/domains/cost/types";
import { getBucketKey } from "../../../src/domains/cost/utils";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const granularityArb = fc.constantFrom<Granularity>("Daily", "Weekly", "Monthly");

/**
 * Generates a valid date range (start <= end, within 2 years).
 * Uses a narrow window to keep test runs fast.
 */
const dateRangeArb = fc
  .tuple(
    fc.date({ min: new Date("2022-01-01"), max: new Date("2023-06-01") }),
    fc.integer({ min: 0, max: 365 }),
  )
  .filter(([start]) => !isNaN(start.getTime()))
  .map(([start, offsetDays]) => {
    const end = new Date(start.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    return { start, end };
  });

/**
 * Generates a minimal MonitoredLease-like object with lastCheckedDate and totalCostAccrued.
 */
const monitoredLeaseArb = (dateRange: { start: Date; end: Date }) =>
  fc
    .tuple(
      fc.date({ min: dateRange.start, max: dateRange.end }),
      fc.float({ min: 0, max: 10_000, noNaN: true }),
    )
    .map(([checkedDate, cost]): LeaseWithLeaseId => {
      return {
        leaseId: crypto.randomUUID(),
        userEmail: "test@example.com",
        uuid: crypto.randomUUID(),
        status: "Active",
        originalLeaseTemplateUuid: crypto.randomUUID(),
        originalLeaseTemplateName: "test-template",
        maxSpend: null,
        leaseDurationInHours: null,
        budgetThresholds: [],
        durationThresholds: [],
        costReportGroup: null,
        awsAccountId: "123456789012",
        approvedBy: "AUTO_APPROVED",
        startDate: new Date("2022-01-01").toISOString(),
        lastCheckedDate: checkedDate.toISOString(),
        totalCostAccrued: cost,
        schemaVersion: 3,
      } as unknown as LeaseWithLeaseId;
    });

const expiredLeaseArb = (dateRange: { start: Date; end: Date }) =>
  fc
    .tuple(
      fc.date({ min: dateRange.start, max: dateRange.end }),
      fc.float({ min: 0, max: 10_000, noNaN: true }),
    )
    .map(([checkedDate, cost]): LeaseWithLeaseId => {
      return {
        leaseId: crypto.randomUUID(),
        userEmail: "test@example.com",
        uuid: crypto.randomUUID(),
        status: "Expired",
        originalLeaseTemplateUuid: crypto.randomUUID(),
        originalLeaseTemplateName: "test-template",
        maxSpend: null,
        leaseDurationInHours: null,
        budgetThresholds: [],
        durationThresholds: [],
        costReportGroup: null,
        awsAccountId: "123456789012",
        approvedBy: "AUTO_APPROVED",
        startDate: new Date("2022-01-01").toISOString(),
        lastCheckedDate: checkedDate.toISOString(),
        totalCostAccrued: cost,
        endDate: new Date("2023-01-01").toISOString(),
        schemaVersion: 3,
      } as unknown as LeaseWithLeaseId;
    });

/** Leases that should be excluded (PendingApproval, ApprovalDenied) */
const pendingLeaseArb = (dateRange: { start: Date; end: Date }) =>
  fc
    .date({ min: dateRange.start, max: dateRange.end })
    .map((checkedDate): LeaseWithLeaseId => {
      return {
        leaseId: crypto.randomUUID(),
        userEmail: "test@example.com",
        uuid: crypto.randomUUID(),
        status: "PendingApproval",
        originalLeaseTemplateUuid: crypto.randomUUID(),
        originalLeaseTemplateName: "test-template",
        maxSpend: null,
        leaseDurationInHours: null,
        budgetThresholds: [],
        durationThresholds: [],
        costReportGroup: null,
        schemaVersion: 3,
      } as unknown as LeaseWithLeaseId;
    });

// ---------------------------------------------------------------------------
// Property 3: 중복 없는 데이터 포인트
// Validates: Requirements 3.2, 3.3, 3.4, 8.3
// ---------------------------------------------------------------------------
describe("Property 3: 중복 없는 데이터 포인트", () => {
  // Feature: cost-trend-dashboard, Property 3: 동일 date 값이 두 번 이상 등장하지 않음
  it("Property 3 — no duplicate date values in returned dataPoints", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        fc.integer({ min: 0, max: 10 }),
        (granularity, dateRange, leaseCount) => {
          // Generate leases synchronously using fixed dates
          const leases: LeaseWithLeaseId[] = Array.from({ length: leaseCount }, (_, i) => {
            const d = new Date(dateRange.start.getTime() + (i % 30) * 24 * 60 * 60 * 1000);
            return {
              leaseId: crypto.randomUUID(),
              userEmail: "test@example.com",
              uuid: crypto.randomUUID(),
              status: "Active",
              originalLeaseTemplateUuid: crypto.randomUUID(),
              originalLeaseTemplateName: "test-template",
              maxSpend: null,
              leaseDurationInHours: null,
              budgetThresholds: [],
              durationThresholds: [],
              costReportGroup: null,
              awsAccountId: "123456789012",
              approvedBy: "AUTO_APPROVED",
              startDate: new Date("2022-01-01").toISOString(),
              lastCheckedDate: d.toISOString(),
              totalCostAccrued: 100,
              schemaVersion: 3,
            } as unknown as LeaseWithLeaseId;
          });

          const dataPoints = aggregateCostData(leases, granularity, dateRange);
          const dates = dataPoints.map((dp) => dp.date);
          const uniqueDates = new Set(dates);

          expect(uniqueDates.size).toBe(dates.length);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: 빈 기간 0 채우기
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("Property 4: 빈 기간 0 채우기", () => {
  // Feature: cost-trend-dashboard, Property 4: 반환된 dataPoints 수 = dateRange 내 granularity 단위 수
  it("Property 4 — dataPoints count equals number of granularity units in dateRange", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        (granularity, dateRange) => {
          // Count expected buckets manually
          const expectedBuckets = countBuckets(dateRange, granularity);
          const dataPoints = aggregateCostData([], granularity, dateRange);

          expect(dataPoints.length).toBe(expectedBuckets);
        },
      ),
    );
  });

  it("Property 4 — periods with no lease data have periodSpend = 0", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        (granularity, dateRange) => {
          const dataPoints = aggregateCostData([], granularity, dateRange);
          dataPoints.forEach((dp) => {
            expect(dp.periodSpend).toBe(0);
          });
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: 오름차순 정렬
// Validates: Requirements 8.4
// ---------------------------------------------------------------------------
describe("Property 5: 오름차순 정렬", () => {
  // Feature: cost-trend-dashboard, Property 5: 인접한 모든 dataPoint 쌍에서 date[i] <= date[i+1]
  it("Property 5 — dataPoints are sorted in ascending order by date", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        fc.integer({ min: 0, max: 10 }),
        (granularity, dateRange, leaseCount) => {
          const leases: LeaseWithLeaseId[] = Array.from({ length: leaseCount }, (_, i) => {
            const d = new Date(dateRange.start.getTime() + (i % 30) * 24 * 60 * 60 * 1000);
            return {
              leaseId: crypto.randomUUID(),
              userEmail: "test@example.com",
              uuid: crypto.randomUUID(),
              status: "Active",
              originalLeaseTemplateUuid: crypto.randomUUID(),
              originalLeaseTemplateName: "test-template",
              maxSpend: null,
              leaseDurationInHours: null,
              budgetThresholds: [],
              durationThresholds: [],
              costReportGroup: null,
              awsAccountId: "123456789012",
              approvedBy: "AUTO_APPROVED",
              startDate: new Date("2022-01-01").toISOString(),
              lastCheckedDate: d.toISOString(),
              totalCostAccrued: 50,
              schemaVersion: 3,
            } as unknown as LeaseWithLeaseId;
          });

          const dataPoints = aggregateCostData(leases, granularity, dateRange);

          for (let i = 1; i < dataPoints.length; i++) {
            expect(dataPoints[i - 1].date <= dataPoints[i].date).toBe(true);
          }
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: 날짜 범위 필터링
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe("Property 6: 날짜 범위 필터링", () => {
  // Feature: cost-trend-dashboard, Property 6: 모든 dataPoint.date가 dateRange 내에 있음
  it("Property 6 — all dataPoint.date values are within dateRange", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        fc.integer({ min: 0, max: 10 }),
        (granularity, dateRange, leaseCount) => {
          const leases: LeaseWithLeaseId[] = Array.from({ length: leaseCount }, (_, i) => {
            const d = new Date(dateRange.start.getTime() + (i % 30) * 24 * 60 * 60 * 1000);
            return {
              leaseId: crypto.randomUUID(),
              userEmail: "test@example.com",
              uuid: crypto.randomUUID(),
              status: "Active",
              originalLeaseTemplateUuid: crypto.randomUUID(),
              originalLeaseTemplateName: "test-template",
              maxSpend: null,
              leaseDurationInHours: null,
              budgetThresholds: [],
              durationThresholds: [],
              costReportGroup: null,
              awsAccountId: "123456789012",
              approvedBy: "AUTO_APPROVED",
              startDate: new Date("2022-01-01").toISOString(),
              lastCheckedDate: d.toISOString(),
              totalCostAccrued: 50,
              schemaVersion: 3,
            } as unknown as LeaseWithLeaseId;
          });

          const dataPoints = aggregateCostData(leases, granularity, dateRange);

          const startKey = getBucketKey(dateRange.start, granularity);
          const endKey = getBucketKey(dateRange.end, granularity);

          dataPoints.forEach((dp) => {
            expect(dp.date >= startKey).toBe(true);
            expect(dp.date <= endKey).toBe(true);
          });
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: 집계 정확성
// Validates: Requirements 8.1
// ---------------------------------------------------------------------------
describe("Property 14: 집계 정확성", () => {
  // Feature: cost-trend-dashboard, Property 14: sum(periodSpend) = dateRange 내 lease들의 sum(totalCostAccrued)
  it("Property 14 — sum(periodSpend) equals sum(totalCostAccrued) of leases within dateRange", () => {
    fc.assert(
      fc.property(
        granularityArb,
        dateRangeArb,
        fc.integer({ min: 0, max: 15 }),
        (granularity, dateRange, leaseCount) => {
          // Create leases with dates inside the dateRange
          const leases: LeaseWithLeaseId[] = Array.from({ length: leaseCount }, (_, i) => {
            const rangeMs = dateRange.end.getTime() - dateRange.start.getTime();
            const offset = leaseCount > 1 ? (i / (leaseCount - 1)) * rangeMs : 0;
            const d = new Date(dateRange.start.getTime() + offset);
            const cost = (i + 1) * 10.5;
            return {
              leaseId: crypto.randomUUID(),
              userEmail: "test@example.com",
              uuid: crypto.randomUUID(),
              status: "Active",
              originalLeaseTemplateUuid: crypto.randomUUID(),
              originalLeaseTemplateName: "test-template",
              maxSpend: null,
              leaseDurationInHours: null,
              budgetThresholds: [],
              durationThresholds: [],
              costReportGroup: null,
              awsAccountId: "123456789012",
              approvedBy: "AUTO_APPROVED",
              startDate: new Date("2022-01-01").toISOString(),
              lastCheckedDate: d.toISOString(),
              totalCostAccrued: cost,
              schemaVersion: 3,
            } as unknown as LeaseWithLeaseId;
          });

          const dataPoints = aggregateCostData(leases, granularity, dateRange);

          const sumPeriodSpend = dataPoints.reduce((s, dp) => s + dp.periodSpend, 0);

          // Expected: sum of totalCostAccrued for monitored/expired leases
          // whose bucket key falls within [startKey, endKey] — same logic as aggregateCostData
          const startKey = getBucketKey(dateRange.start, granularity);
          const endKey = getBucketKey(dateRange.end, granularity);
          const expectedSum = leases
            .filter((l) => {
              // Only monitored (Active/Frozen/Provisioning) leases are included
              const status = (l as { status: string }).status;
              const isMonitored = ["Active", "Frozen", "Provisioning"].includes(status);
              const isExpired = ["Expired", "BudgetExceeded", "ManuallyTerminated",
                "AccountQuarantined", "Ejected", "ProvisioningFailed"].includes(status);
              if (!isMonitored && !isExpired) return false;

              const checkedDate = (l as { lastCheckedDate?: string }).lastCheckedDate;
              if (!checkedDate) return false;
              const key = getBucketKey(new Date(checkedDate), granularity);
              return key >= startKey && key <= endKey;
            })
            .reduce((s, l) => s + ((l as { totalCostAccrued?: number }).totalCostAccrued ?? 0), 0);

          expect(sumPeriodSpend).toBeCloseTo(expectedSum, 5);
        },
      ),
    );
  });

  it("Property 14 — pending/approval-denied leases are excluded from aggregation", () => {
    const dateRange = {
      start: new Date("2023-01-01"),
      end: new Date("2023-03-31"),
    };

    const pendingLease: LeaseWithLeaseId = {
      leaseId: crypto.randomUUID(),
      userEmail: "test@example.com",
      uuid: crypto.randomUUID(),
      status: "PendingApproval",
      originalLeaseTemplateUuid: crypto.randomUUID(),
      originalLeaseTemplateName: "test-template",
      maxSpend: null,
      leaseDurationInHours: null,
      budgetThresholds: [],
      durationThresholds: [],
      costReportGroup: null,
      schemaVersion: 3,
    } as unknown as LeaseWithLeaseId;

    const dataPoints = aggregateCostData([pendingLease], "Monthly", dateRange);
    const totalSpend = dataPoints.reduce((s, dp) => s + dp.periodSpend, 0);
    expect(totalSpend).toBe(0);
  });

  it("Property 14 — cumulativeSpend is running total of periodSpend", () => {
    const dateRange = {
      start: new Date("2023-01-01"),
      end: new Date("2023-03-31"),
    };

    const leases: LeaseWithLeaseId[] = [
      {
        leaseId: "1",
        userEmail: "a@example.com",
        uuid: "uuid-1",
        status: "Active",
        originalLeaseTemplateUuid: "t1",
        originalLeaseTemplateName: "t",
        maxSpend: null,
        leaseDurationInHours: null,
        budgetThresholds: [],
        durationThresholds: [],
        costReportGroup: null,
        awsAccountId: "123456789012",
        approvedBy: "AUTO_APPROVED",
        startDate: "2023-01-01T00:00:00Z",
        lastCheckedDate: "2023-01-15T00:00:00Z",
        totalCostAccrued: 100,
        schemaVersion: 3,
      } as unknown as LeaseWithLeaseId,
      {
        leaseId: "2",
        userEmail: "b@example.com",
        uuid: "uuid-2",
        status: "Expired",
        originalLeaseTemplateUuid: "t2",
        originalLeaseTemplateName: "t",
        maxSpend: null,
        leaseDurationInHours: null,
        budgetThresholds: [],
        durationThresholds: [],
        costReportGroup: null,
        awsAccountId: "123456789012",
        approvedBy: "AUTO_APPROVED",
        startDate: "2023-02-01T00:00:00Z",
        lastCheckedDate: "2023-02-15T00:00:00Z",
        totalCostAccrued: 200,
        endDate: "2023-02-28T00:00:00Z",
        schemaVersion: 3,
      } as unknown as LeaseWithLeaseId,
    ];

    const dataPoints = aggregateCostData(leases, "Monthly", dateRange);

    // Should have 3 months: Jan, Feb, Mar
    expect(dataPoints.length).toBe(3);

    // Jan: 100, Feb: 200, Mar: 0
    expect(dataPoints[0].date).toBe("2023-01-01");
    expect(dataPoints[0].periodSpend).toBeCloseTo(100, 5);
    expect(dataPoints[0].cumulativeSpend).toBeCloseTo(100, 5);

    expect(dataPoints[1].date).toBe("2023-02-01");
    expect(dataPoints[1].periodSpend).toBeCloseTo(200, 5);
    expect(dataPoints[1].cumulativeSpend).toBeCloseTo(300, 5);

    expect(dataPoints[2].date).toBe("2023-03-01");
    expect(dataPoints[2].periodSpend).toBeCloseTo(0, 5);
    expect(dataPoints[2].cumulativeSpend).toBeCloseTo(300, 5);
  });
});

// ---------------------------------------------------------------------------
// Helper: count expected buckets in a date range
// ---------------------------------------------------------------------------
function countBuckets(dateRange: { start: Date; end: Date }, granularity: Granularity): number {
  const seen = new Set<string>();
  const endKey = getBucketKey(dateRange.end, granularity);
  const startBucketKey = getBucketKey(dateRange.start, granularity);
  const current = new Date(startBucketKey + "T00:00:00Z");

  while (true) {
    const key = getBucketKey(current, granularity);
    if (key > endKey) break;
    seen.add(key);
    if (granularity === "Daily") {
      current.setUTCDate(current.getUTCDate() + 1);
    } else if (granularity === "Weekly") {
      current.setUTCDate(current.getUTCDate() + 7);
    } else {
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }
  return seen.size;
}
