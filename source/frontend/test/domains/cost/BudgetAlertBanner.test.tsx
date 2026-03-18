// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: cost-trend-dashboard, Property 12: Budget Alert 배너 내용
// Validates: Requirements 7.4

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { BudgetAlertBanner } from "../../../src/domains/cost/pages/CostTrendDashboard/components/BudgetAlertBanner";

// ---------------------------------------------------------------------------
// Cloudscape Flashbar mock
// ---------------------------------------------------------------------------
vi.mock("@cloudscape-design/components", () => {
  return {
    Flashbar: (props: {
      items: Array<{ type: string; content: string; dismissible?: boolean }>;
    }) => (
      <div data-testid="flashbar">
        {props.items.map((item, i) => (
          <div key={i} data-testid={`flashbar-item-${i}`} data-type={item.type}>
            {item.content}
          </div>
        ))}
      </div>
    ),
  };
});

// ---------------------------------------------------------------------------
// Property 12: Budget Alert 배너 내용
// Validates: Requirements 7.4
// ---------------------------------------------------------------------------
describe("Property 12: Budget Alert 배너 내용", () => {
  // Feature: cost-trend-dashboard, Property 12: 배너 렌더링 시 지출/예산/퍼센트 문자열이 포함됨
  it("Property 12 — banner contains spend amount, budget amount, and percentage when rendered", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: 0, noNaN: true }),
          fc.float({ min: Math.fround(0.01), noNaN: true }),
        ),
        ([totalSpend, overallBudget]) => {
          // Only test warning/error cases (ratio >= 0.8)
          const ratio = totalSpend / overallBudget;
          if (ratio < 0.8) return;

          const { unmount } = render(
            <BudgetAlertBanner
              totalSpend={totalSpend}
              overallBudget={overallBudget}
            />,
          );

          const flashbar = document.querySelector("[data-testid='flashbar']");
          expect(flashbar).not.toBeNull();

          const content = flashbar!.textContent ?? "";

          // Should contain USD-formatted spend amount
          const formattedSpend = totalSpend.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          });
          expect(content).toContain(formattedSpend);

          // Should contain USD-formatted budget amount
          const formattedBudget = overallBudget.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          });
          expect(content).toContain(formattedBudget);

          // Should contain percentage (with %)
          const percentage = ((totalSpend / overallBudget) * 100).toFixed(1);
          expect(content).toContain(`${percentage}%`);

          unmount();
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// 단위 테스트
// ---------------------------------------------------------------------------
describe("BudgetAlertBanner 단위 테스트", () => {
  // Feature: cost-trend-dashboard, Property 12: "none" 케이스에서 아무것도 렌더링되지 않음
  it("renders nothing when alert level is none (spend < 80% of budget)", () => {
    const { container } = render(
      <BudgetAlertBanner totalSpend={1000} overallBudget={5000} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when overallBudget is null", () => {
    const { container } = render(
      <BudgetAlertBanner totalSpend={5000} overallBudget={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders warning banner when spend is between 80% and 100% of budget", () => {
    render(<BudgetAlertBanner totalSpend={4200} overallBudget={5000} />);
    const item = screen.getByTestId("flashbar-item-0");
    expect(item.getAttribute("data-type")).toBe("warning");
    expect(item.textContent).toContain("$4,200.00");
    expect(item.textContent).toContain("$5,000.00");
    expect(item.textContent).toContain("84.0%");
  });

  it("renders error banner when spend equals or exceeds budget", () => {
    render(<BudgetAlertBanner totalSpend={5500} overallBudget={5000} />);
    const item = screen.getByTestId("flashbar-item-0");
    expect(item.getAttribute("data-type")).toBe("error");
    expect(item.textContent).toContain("$5,500.00");
    expect(item.textContent).toContain("$5,000.00");
    expect(item.textContent).toContain("110.0%");
  });

  it("renders correct message format matching the example", () => {
    render(<BudgetAlertBanner totalSpend={4200} overallBudget={5000} />);
    const item = screen.getByTestId("flashbar-item-0");
    expect(item.textContent).toBe(
      "Current spend $4,200.00 has reached 84.0% of the overall budget $5,000.00.",
    );
  });
});
