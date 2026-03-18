// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: cost-trend-dashboard, Property 8: Budget Allocation localStorage round-trip
// Feature: cost-trend-dashboard, Property 9: Budget Allocation 삭제 후 재계산
// Feature: cost-trend-dashboard, Property 10: 비유효 금액 거부

import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetAllocation } from "../../../src/domains/cost/types";

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

// ---------------------------------------------------------------------------
// Pure logic helpers extracted for property testing
// (mirrors the logic inside useBudgetHistory without React state)
// ---------------------------------------------------------------------------
const STORAGE_KEY = "isb_budget_history";

function loadAllocations(): BudgetAllocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BudgetAllocation[];
  } catch {
    console.warn("[test] parse failed");
    return [];
  }
}

function saveAllocations(allocations: BudgetAllocation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allocations));
}

function addAllocation(
  current: BudgetAllocation[],
  amount: number,
  label?: string,
): BudgetAllocation[] {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid budget amount: ${amount}`);
  }
  const newItem: BudgetAllocation = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    amount,
    ...(label !== undefined ? { label } : {}),
  };
  return [...current, newItem];
}

function removeAllocation(
  current: BudgetAllocation[],
  id: string,
): BudgetAllocation[] {
  return current.filter((a) => a.id !== id);
}

function overallBudget(allocations: BudgetAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.amount, 0);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------
const allocationArb = fc.record({
  id: fc.uuid(),
  date: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split("T")[0]),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorageMock.clear();
});

// ---------------------------------------------------------------------------
// Property 8: localStorage round-trip
// Validates: Requirements 5.2, 5.3
// ---------------------------------------------------------------------------
describe("Property 8: localStorage round-trip", () => {
  // Feature: cost-trend-dashboard, Property 8: 저장 후 복원 시 동일 배열
  it("Property 8 — saved allocations are restored identically", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 20 }),
        (allocations) => {
          saveAllocations(allocations);
          const restored = loadAllocations();

          expect(restored).toHaveLength(allocations.length);
          restored.forEach((item, i) => {
            expect(item.id).toBe(allocations[i].id);
            expect(item.date).toBe(allocations[i].date);
            expect(item.amount).toBeCloseTo(allocations[i].amount, 5);
            expect(item.label).toBe(allocations[i].label);
          });
        },
      ),
    );
  });

  // Feature: cost-trend-dashboard, Property 8: overallBudget = sum(amounts)
  it("Property 8 — overallBudget equals sum of all amounts after round-trip", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 20 }),
        (allocations) => {
          saveAllocations(allocations);
          const restored = loadAllocations();

          const expectedSum = allocations.reduce((s, a) => s + a.amount, 0);
          expect(overallBudget(restored)).toBeCloseTo(expectedSum, 5);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: 삭제 후 재계산
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------
describe("Property 9: 삭제 후 재계산", () => {
  // Feature: cost-trend-dashboard, Property 9: 임의 항목 삭제 후 overallBudget이 나머지 합계와 일치
  it("Property 9 — overallBudget matches remaining sum after removal", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (allocations, rawIndex) => {
          const index = rawIndex % allocations.length;
          const targetId = allocations[index].id;

          saveAllocations(allocations);
          const after = removeAllocation(loadAllocations(), targetId);
          saveAllocations(after);

          const restored = loadAllocations();
          const expectedSum = allocations
            .filter((a) => a.id !== targetId)
            .reduce((s, a) => s + a.amount, 0);

          expect(overallBudget(restored)).toBeCloseTo(expectedSum, 5);
          expect(restored.find((a) => a.id === targetId)).toBeUndefined();
        },
      ),
    );
  });

  it("Property 9 — removed item is absent from localStorage", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (allocations, rawIndex) => {
          const index = rawIndex % allocations.length;
          const targetId = allocations[index].id;

          const after = removeAllocation(allocations, targetId);
          saveAllocations(after);

          const raw = localStorage.getItem(STORAGE_KEY);
          expect(raw).not.toContain(targetId);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: 비유효 금액 거부
// Validates: Requirements 5.6
// ---------------------------------------------------------------------------
describe("Property 10: 비유효 금액 거부", () => {
  const invalidAmountArb = fc.oneof(
    fc.constant(0),
    fc.integer({ min: -1_000_000, max: -1 }).map(Number),
    fc.constant(NaN),
    fc.constant(-Infinity),
    fc.constant(+Infinity),
  );

  // Feature: cost-trend-dashboard, Property 10: 비유효 금액 입력 시 에러 throw
  it("Property 10 — addAllocation throws for invalid amounts", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 5 }),
        invalidAmountArb,
        (initial, invalidAmount) => {
          expect(() => addAllocation(initial, invalidAmount)).toThrow();
        },
      ),
    );
  });

  // Feature: cost-trend-dashboard, Property 10: 비유효 금액 입력 시 배열 불변
  it("Property 10 — allocations array is unchanged after invalid addAllocation", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 5 }),
        invalidAmountArb,
        (initial, invalidAmount) => {
          const before = [...initial];
          try {
            addAllocation(initial, invalidAmount);
          } catch {
            // expected
          }
          // original array must be unchanged
          expect(initial).toHaveLength(before.length);
          initial.forEach((item, i) => {
            expect(item.id).toBe(before[i].id);
          });
        },
      ),
    );
  });

  it("Property 10 — zero amount is rejected", () => {
    expect(() => addAllocation([], 0)).toThrow();
  });

  it("Property 10 — negative amount is rejected", () => {
    expect(() => addAllocation([], -100)).toThrow();
  });

  it("Property 10 — NaN amount is rejected", () => {
    expect(() => addAllocation([], NaN)).toThrow();
  });
});
