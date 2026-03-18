// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: cost-trend-dashboard, Property 7: 잘못된 날짜 범위 거부
// Feature: cost-trend-dashboard, Property 11: Budget Alert 레벨 결정
// Feature: cost-trend-dashboard, Property 13: KPI 값 정확성

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeKpis,
  getBudgetAlertLevel,
  validateDateRange,
} from "../../../src/domains/cost/utils";

// ---------------------------------------------------------------------------
// Property 7: 잘못된 날짜 범위 거부
// Validates: Requirements 4.5, 4.6
// ---------------------------------------------------------------------------
describe("validateDateRange", () => {
  // Feature: cost-trend-dashboard, Property 7: end < start 케이스
  it("Property 7 — returns error when end < start", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.date(), fc.date()).filter(([s, e]) => e < s),
        ([start, end]) => {
          const result = validateDateRange(start, end);
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
        },
      ),
    );
  });

  // Feature: cost-trend-dashboard, Property 7: 2년 초과 케이스
  it("Property 7 — returns error when range exceeds 2 years", () => {
    const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date("2000-01-01"), max: new Date("2020-01-01") })
          .filter((d) => !isNaN(d.getTime())),
        (start) => {
          // end is more than 2 years after start
          const end = new Date(start.getTime() + TWO_YEARS_MS + 24 * 60 * 60 * 1000);
          const result = validateDateRange(start, end);
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
        },
      ),
    );
  });

  it("Property 7 — returns null for valid ranges (end >= start, within 2 years)", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2023-01-01") }),
        fc.integer({ min: 0, max: 729 }), // 0 to 729 days (< 2 years)
        (start, offsetDays) => {
          const end = new Date(start.getTime() + offsetDays * 24 * 60 * 60 * 1000);
          const result = validateDateRange(start, end);
          expect(result).toBeNull();
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Budget Alert 레벨 결정
// Validates: Requirements 7.1, 7.2, 7.3
// ---------------------------------------------------------------------------
describe("getBudgetAlertLevel", () => {
  // Feature: cost-trend-dashboard, Property 11: totalSpend/overallBudget 비율별 레벨 검증
  it("Property 11 — returns 'none' when overallBudget is null", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (totalSpend) => {
        expect(getBudgetAlertLevel(totalSpend, null)).toBe("none");
      }),
    );
  });

  it("Property 11 — returns 'none' when ratio < 0.8", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (overallBudget) => {
          // totalSpend is strictly less than 80% of budget
          const totalSpend = overallBudget * 0.79;
          expect(getBudgetAlertLevel(totalSpend, overallBudget)).toBe("none");
        },
      ),
    );
  });

  it("Property 11 — returns 'warning' when 0.8 <= ratio < 1.0", () => {
    fc.assert(
      fc.property(
        // Use multiples of 100 so that 80% is always an exact integer
        fc.integer({ min: 1, max: 10_000 }).map((n) => n * 100),
        fc.integer({ min: 80, max: 99 }),
        (overallBudget, ratioPercent) => {
          const totalSpend = (overallBudget * ratioPercent) / 100;
          expect(getBudgetAlertLevel(totalSpend, overallBudget)).toBe("warning");
        },
      ),
    );
  });

  it("Property 11 — returns 'warning' for mid-range ratio (0.8 <= ratio < 1.0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }).map((n) => n * 100),
        (overallBudget) => {
          const totalSpend = (overallBudget * 90) / 100;
          expect(getBudgetAlertLevel(totalSpend, overallBudget)).toBe("warning");
        },
      ),
    );
  });

  it("Property 11 — returns 'error' when ratio >= 1.0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (overallBudget) => {
          // totalSpend equals budget (ratio = 1.0)
          expect(getBudgetAlertLevel(overallBudget, overallBudget)).toBe("error");
          // totalSpend exceeds budget
          const totalSpend = overallBudget * 1.5;
          expect(getBudgetAlertLevel(totalSpend, overallBudget)).toBe("error");
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: KPI 값 정확성
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------
describe("computeKpis", () => {
  const dataPointArb = fc.record({
    date: fc.string({ minLength: 1 }),
    periodSpend: fc.integer({ min: 0, max: 100_000 }).map((n) => n / 100),
    cumulativeSpend: fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
  });

  // Feature: cost-trend-dashboard, Property 13: totalSpend = sum(periodSpend)
  it("Property 13 — totalSpend equals sum of all periodSpend values", () => {
    fc.assert(
      fc.property(fc.array(dataPointArb, { minLength: 0, maxLength: 50 }), (dataPoints) => {
        const { totalSpend } = computeKpis(dataPoints, null);
        const expected = dataPoints.reduce((sum, dp) => sum + dp.periodSpend, 0);
        expect(totalSpend).toBeCloseTo(expected, 5);
      }),
    );
  });

  // Feature: cost-trend-dashboard, Property 13: averageSpend = totalSpend / count
  it("Property 13 — averageSpend equals totalSpend / count (non-empty)", () => {
    fc.assert(
      fc.property(fc.array(dataPointArb, { minLength: 1, maxLength: 50 }), (dataPoints) => {
        const { totalSpend, averageSpend } = computeKpis(dataPoints, null);
        const expected = totalSpend / dataPoints.length;
        expect(averageSpend).toBeCloseTo(expected, 5);
      }),
    );
  });

  it("Property 13 — averageSpend is 0 for empty array", () => {
    const { averageSpend } = computeKpis([], null);
    expect(averageSpend).toBe(0);
  });

  // Feature: cost-trend-dashboard, Property 13: peakPeriod = date of max periodSpend
  it("Property 13 — peakPeriod is the date of the maximum periodSpend", () => {
    fc.assert(
      fc.property(fc.array(dataPointArb, { minLength: 1, maxLength: 50 }), (dataPoints) => {
        const { peakPeriod } = computeKpis(dataPoints, null);
        const maxSpend = Math.max(...dataPoints.map((dp) => dp.periodSpend));
        const peakDp = dataPoints.find((dp) => dp.periodSpend === maxSpend);
        expect(peakPeriod).toBe(peakDp?.date);
      }),
    );
  });

  it("Property 13 — peakPeriod is null for empty array", () => {
    const { peakPeriod } = computeKpis([], null);
    expect(peakPeriod).toBeNull();
  });

  it("Property 13 — budgetRemaining is null when overallBudget is null", () => {
    fc.assert(
      fc.property(fc.array(dataPointArb, { minLength: 0, maxLength: 20 }), (dataPoints) => {
        const { budgetRemaining } = computeKpis(dataPoints, null);
        expect(budgetRemaining).toBeNull();
      }),
    );
  });

  it("Property 13 — budgetRemaining equals overallBudget - totalSpend", () => {
    fc.assert(
      fc.property(
        fc.array(dataPointArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
        (dataPoints, overallBudget) => {
          const { totalSpend, budgetRemaining } = computeKpis(dataPoints, overallBudget);
          expect(budgetRemaining).toBeCloseTo(overallBudget - totalSpend, 5);
        },
      ),
    );
  });
});
