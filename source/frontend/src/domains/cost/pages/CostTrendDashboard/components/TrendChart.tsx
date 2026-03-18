// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  MixedLineBarChart,
  MixedLineBarChartProps,
} from "@cloudscape-design/components";

import {
  BudgetAllocation,
  CostDataPoint,
  Granularity,
} from "@amzn/innovation-sandbox-frontend/domains/cost/types";

export interface TrendChartProps {
  dataPoints: CostDataPoint[];
  overallBudget: number | null;
  allocations: BudgetAllocation[];
  granularity: Granularity;
  isLoading: boolean;
}

const formatUSD = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const TrendChart = ({
  dataPoints,
  overallBudget,
  allocations,
  isLoading,
}: TrendChartProps) => {
  const allocationDates = new Set(allocations.map((a) => a.date));

  const xDomain = dataPoints.map((dp) => {
    const label = dp.date;
    return allocationDates.has(label) ? `${label} ▲` : label;
  });

  const normalizedDate = (date: string) =>
    allocationDates.has(date) ? `${date} ▲` : date;

  const series: MixedLineBarChartProps.ChartSeries<string>[] = [
    {
      title: "Period Spend",
      type: "bar",
      data: dataPoints.map((dp) => ({
        x: normalizedDate(dp.date),
        y: dp.periodSpend,
      })),
      color: "#0972d3",
    },
    {
      title: "Cumulative Spend",
      type: "line",
      data: dataPoints.map((dp) => ({
        x: normalizedDate(dp.date),
        y: dp.cumulativeSpend,
      })),
      color: "#e07941",
    },
  ];

  if (overallBudget !== null && allocations.length > 0) {
    series.push({
      title: "Overall Budget",
      type: "threshold",
      y: overallBudget,
      color: "#d91515",
    });
  }

  const yMax =
    dataPoints.length > 0
      ? Math.max(
          ...dataPoints.map((dp) => Math.max(dp.periodSpend, dp.cumulativeSpend)),
          overallBudget ?? 0,
        )
      : 100;

  return (
    <MixedLineBarChart
      series={series}
      xDomain={xDomain}
      yDomain={[0, yMax * 1.1]}
      statusType={isLoading ? "loading" : "finished"}
      empty={
        <Box textAlign="center" color="inherit">
          No cost data available
        </Box>
      }
      xTitle="Period"
      yTitle="USD"
      height={300}
      hideFilter
      yTickFormatter={formatUSD}
    />
  );
};
