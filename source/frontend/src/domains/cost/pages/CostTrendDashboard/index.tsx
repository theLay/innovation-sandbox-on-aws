// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  DatePicker,
  FormField,
  Header,
  SegmentedControl,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppLayoutContext } from "@amzn/innovation-sandbox-frontend/components/AppLayout/AppLayoutContext";
import { ContentLayout } from "@amzn/innovation-sandbox-frontend/components/ContentLayout";
import { useBudgetHistory } from "@amzn/innovation-sandbox-frontend/domains/cost/hooks/useBudgetHistory";
import { useCostTrend } from "@amzn/innovation-sandbox-frontend/domains/cost/hooks/useCostTrend";
import { Granularity } from "@amzn/innovation-sandbox-frontend/domains/cost/types";
import { computeKpis, validateDateRange } from "@amzn/innovation-sandbox-frontend/domains/cost/utils";
import { useBreadcrumb } from "@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb";
import { useUser } from "@amzn/innovation-sandbox-frontend/hooks/useUser";

import { BudgetAlertBanner } from "./components/BudgetAlertBanner";
import { BudgetPanel } from "./components/BudgetPanel";
import { KpiCards } from "./components/KpiCards";
import { TrendChart } from "./components/TrendChart";

function toDateStr(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateStr(str: string): Date {
  return new Date(str + "T00:00:00");
}

function getDefaultDateRange(allocations: { date: string }[]): { start: Date; end: Date } {
  const today = new Date();
  if (allocations.length > 0) {
    const earliest = allocations
      .map((a) => a.date)
      .sort()[0];
    return { start: parseDateStr(earliest), end: today };
  }
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  return { start: sixMonthsAgo, end: today };
}

export const CostTrendDashboard = () => {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumb();
  const { setTools } = useAppLayoutContext();
  const { isAdmin, isLoading: userLoading } = useUser();

  const { allocations, overallBudget } = useBudgetHistory();

  const [granularity, setGranularity] = useState<Granularity>("Monthly");

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() =>
    getDefaultDateRange([]),
  );
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // allocations가 로드되면 기본 날짜 범위 업데이트 (최초 1회)
  const [dateRangeInitialized, setDateRangeInitialized] = useState(false);
  useEffect(() => {
    if (!dateRangeInitialized && allocations.length > 0) {
      setDateRange(getDefaultDateRange(allocations));
      setDateRangeInitialized(true);
    }
  }, [allocations, dateRangeInitialized]);

  useEffect(() => {
    setBreadcrumb([
      { text: "Home", href: "/" },
      { text: "Cost Trends", href: "/cost/trends" },
    ]);
    setTools(null);
  }, []);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, userLoading, navigate]);

  const { dataPoints, isLoading } = useCostTrend({ granularity, dateRange });

  const { totalSpend } = computeKpis(dataPoints, overallBudget > 0 ? overallBudget : null);

  const startDateStr = toDateStr(dateRange.start);
  const endDateStr = toDateStr(dateRange.end);

  const handleStartDateChange = (value: string) => {
    if (!value) return;
    const newStart = parseDateStr(value);
    const error = validateDateRange(newStart, dateRange.end);
    setDateRangeError(error);
    if (!error) {
      setDateRange({ start: newStart, end: dateRange.end });
    }
  };

  const handleEndDateChange = (value: string) => {
    if (!value) return;
    const newEnd = parseDateStr(value);
    const error = validateDateRange(dateRange.start, newEnd);
    setDateRangeError(error);
    if (!error) {
      setDateRange({ start: dateRange.start, end: newEnd });
    }
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Time-series cost trends aggregated by granularity."
        >
          Cost Trends
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Controls */}
        <SpaceBetween size="m" direction="horizontal">
          <FormField label="Granularity">
            <SegmentedControl
              selectedId={granularity}
              onChange={({ detail }) => setGranularity(detail.selectedId as Granularity)}
              options={[
                { id: "Daily", text: "Daily" },
                { id: "Weekly", text: "Weekly" },
                { id: "Monthly", text: "Monthly" },
              ]}
            />
          </FormField>

          <FormField label="Start Date" errorText={dateRangeError ?? undefined}>
            <DatePicker
              value={startDateStr}
              onChange={({ detail }) => handleStartDateChange(detail.value)}
              placeholder="YYYY/MM/DD"
            />
          </FormField>

          <FormField label="End Date">
            <DatePicker
              value={endDateStr}
              onChange={({ detail }) => handleEndDateChange(detail.value)}
              placeholder="YYYY/MM/DD"
            />
          </FormField>
        </SpaceBetween>

        {dateRangeError && (
          <Box color="text-status-error">{dateRangeError}</Box>
        )}

        <BudgetAlertBanner
          totalSpend={totalSpend}
          overallBudget={overallBudget > 0 ? overallBudget : null}
        />

        <KpiCards
          dataPoints={dataPoints}
          overallBudget={overallBudget > 0 ? overallBudget : null}
          isLoading={isLoading}
        />

        <TrendChart
          dataPoints={dataPoints}
          overallBudget={overallBudget > 0 ? overallBudget : null}
          allocations={allocations}
          granularity={granularity}
          isLoading={isLoading}
        />

        <BudgetPanel />
      </SpaceBetween>
    </ContentLayout>
  );
};
