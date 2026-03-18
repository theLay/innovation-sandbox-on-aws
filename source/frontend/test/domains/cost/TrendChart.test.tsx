// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: cost-trend-dashboard, Property 15: Budget Allocation vertical marker 대응
// Validates: Requirements 3.8

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { TrendChart } from "../../../src/domains/cost/pages/CostTrendDashboard/components/TrendChart";
import { BudgetAllocation, CostDataPoint } from "../../../src/domains/cost/types";

// ---------------------------------------------------------------------------
// Cloudscape 컴포넌트 mock
// MixedLineBarChart는 DOM 렌더링이 복잡하므로 series prop을 검사 가능하게 mock
// ---------------------------------------------------------------------------
vi.mock("@cloudscape-design/components", () => {
  return {
    Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    MixedLineBarChart: (props: {
      series: Array<{ title: string; type: string; data?: Array<{ x: string; y: number }>; y?: number }>;
      xDomain?: string[];
      statusType?: string;
      empty?: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <div data-testid="mixed-line-bar-chart">
        <div data-testid="series-count">{props.series.length}</div>
        <div data-testid="x-domain">{JSON.stringify(props.xDomain ?? [])}</div>
        {props.series.map((s, i) => (
          <div key={i} data-testid={`series-${i}`} data-type={s.type} data-title={s.title}>
            {s.type !== "threshold" && s.data
              ? s.data.map((d, j) => (
                  <span key={j} data-testid={`series-${i}-point-${j}`} data-x={d.x} />
                ))
              : null}
          </div>
        ))}
        {props.statusType === "loading" && <div data-testid="loading-state">loading</div>}
        {props.empty && <div data-testid="empty-slot">{props.empty}</div>}
      </div>
    ),
  };
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------
const allocationArb = fc.record({
  id: fc.uuid(),
  date: fc
    .date({ min: new Date("2023-01-01"), max: new Date("2023-12-31") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split("T")[0]),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10_000), noNaN: true }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
});

const dataPointArb = (date: string) =>
  fc.record({
    date: fc.constant(date),
    periodSpend: fc.float({ min: 0, max: 5_000, noNaN: true }),
    cumulativeSpend: fc.float({ min: 0, max: 50_000, noNaN: true }),
  });

// ---------------------------------------------------------------------------
// Property 15: Budget Allocation vertical marker 대응
// Validates: Requirements 3.8
// ---------------------------------------------------------------------------
describe("Property 15: Budget Allocation vertical marker 대응", () => {
  // Feature: cost-trend-dashboard, Property 15: allocations 수만큼 ▲ 마커가 xDomain에 포함됨
  it("Property 15 — each allocation date appears as a marked x-axis label (▲)", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 10 }),
        (allocations) => {
          // Deduplicate allocation dates (same date may appear multiple times)
          const uniqueDates = [...new Set(allocations.map((a) => a.date))];

          // Build dataPoints that include all allocation dates
          const dataPoints: CostDataPoint[] = uniqueDates.map((date) => ({
            date,
            periodSpend: 100,
            cumulativeSpend: 200,
          }));

          const { unmount } = render(
            <TrendChart
              dataPoints={dataPoints}
              overallBudget={null}
              allocations={allocations}
              granularity="Monthly"
              isLoading={false}
            />,
          );

          const xDomainEl = document.querySelector("[data-testid='x-domain']");
          const xDomain: string[] = JSON.parse(xDomainEl?.textContent ?? "[]");

          // Every unique allocation date should appear as "date ▲" in xDomain
          uniqueDates.forEach((date) => {
            expect(xDomain).toContain(`${date} ▲`);
          });

          unmount();
        },
      ),
    );
  });

  // Feature: cost-trend-dashboard, Property 15: allocation 없는 날짜는 ▲ 없이 표시됨
  it("Property 15 — non-allocation dates do not have ▲ marker", () => {
    fc.assert(
      fc.property(
        fc.array(allocationArb, { minLength: 0, maxLength: 5 }),
        (allocations) => {
          const allocationDates = new Set(allocations.map((a) => a.date));

          // Add a date that is NOT in allocations
          const nonAllocationDate = "2024-06-15";
          const dataPoints: CostDataPoint[] = [
            { date: nonAllocationDate, periodSpend: 50, cumulativeSpend: 50 },
            ...Array.from(allocationDates).map((date) => ({
              date,
              periodSpend: 100,
              cumulativeSpend: 200,
            })),
          ];

          // Ensure nonAllocationDate is not in allocations
          if (allocationDates.has(nonAllocationDate)) {
            return; // skip this case
          }

          const { unmount } = render(
            <TrendChart
              dataPoints={dataPoints}
              overallBudget={null}
              allocations={allocations}
              granularity="Monthly"
              isLoading={false}
            />,
          );

          const xDomainEl = document.querySelector("[data-testid='x-domain']");
          const xDomain: string[] = JSON.parse(xDomainEl?.textContent ?? "[]");

          // Non-allocation date should appear without ▲
          expect(xDomain).toContain(nonAllocationDate);
          expect(xDomain).not.toContain(`${nonAllocationDate} ▲`);

          unmount();
        },
      ),
    );
  });

  // 단위 테스트: isLoading 시 loading 상태 표시
  it("shows loading state when isLoading is true", () => {
    render(
      <TrendChart
        dataPoints={[]}
        overallBudget={null}
        allocations={[]}
        granularity="Monthly"
        isLoading={true}
      />,
    );
    expect(screen.getByTestId("loading-state")).toBeTruthy();
  });

  // 단위 테스트: 빈 데이터 시 empty slot 렌더링
  it("renders empty slot when dataPoints is empty and not loading", () => {
    render(
      <TrendChart
        dataPoints={[]}
        overallBudget={null}
        allocations={[]}
        granularity="Monthly"
        isLoading={false}
      />,
    );
    expect(screen.getByTestId("empty-slot")).toBeTruthy();
  });

  // 단위 테스트: overallBudget이 있고 allocations가 있을 때 threshold series 포함
  it("includes threshold series when overallBudget is set and allocations exist", () => {
    const allocations: BudgetAllocation[] = [
      { id: "1", date: "2023-01-01", amount: 5000, label: "Semester Start" },
    ];
    const dataPoints: CostDataPoint[] = [
      { date: "2023-01-01", periodSpend: 1000, cumulativeSpend: 1000 },
    ];

    render(
      <TrendChart
        dataPoints={dataPoints}
        overallBudget={5000}
        allocations={allocations}
        granularity="Monthly"
        isLoading={false}
      />,
    );

    const seriesElements = document.querySelectorAll("[data-testid^='series-'][data-type='threshold']");
    expect(seriesElements.length).toBeGreaterThan(0);
  });

  // 단위 테스트: overallBudget이 null이면 threshold series 미포함
  it("does not include threshold series when overallBudget is null", () => {
    const dataPoints: CostDataPoint[] = [
      { date: "2023-01-01", periodSpend: 1000, cumulativeSpend: 1000 },
    ];

    render(
      <TrendChart
        dataPoints={dataPoints}
        overallBudget={null}
        allocations={[]}
        granularity="Monthly"
        isLoading={false}
      />,
    );

    const seriesElements = document.querySelectorAll("[data-testid^='series-'][data-type='threshold']");
    expect(seriesElements.length).toBe(0);
  });

  // 단위 테스트: allocations가 없으면 threshold series 미포함 (overallBudget이 있어도)
  it("does not include threshold series when allocations is empty even if overallBudget is set", () => {
    const dataPoints: CostDataPoint[] = [
      { date: "2023-01-01", periodSpend: 1000, cumulativeSpend: 1000 },
    ];

    render(
      <TrendChart
        dataPoints={dataPoints}
        overallBudget={5000}
        allocations={[]}
        granularity="Monthly"
        isLoading={false}
      />,
    );

    const seriesElements = document.querySelectorAll("[data-testid^='series-'][data-type='threshold']");
    expect(seriesElements.length).toBe(0);
  });
});
