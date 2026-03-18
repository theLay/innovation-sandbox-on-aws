// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, ColumnLayout, Container, Header } from "@cloudscape-design/components";

import { CostDataPoint } from "@amzn/innovation-sandbox-frontend/domains/cost/types";
import { computeKpis } from "@amzn/innovation-sandbox-frontend/domains/cost/utils";

interface KpiCardsProps {
  dataPoints: CostDataPoint[];
  overallBudget: number | null;
  isLoading: boolean;
}

const formatUSD = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const KpiCards = ({ dataPoints, overallBudget, isLoading }: KpiCardsProps) => {
  const { totalSpend, averageSpend, peakPeriod, budgetRemaining } = computeKpis(
    dataPoints,
    overallBudget,
  );

  const dash = "—";

  return (
    <Container header={<Header variant="h2">KPI Summary</Header>}>
      <ColumnLayout columns={5} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Total Spend (Period)</Box>
          <Box fontSize="display-l" fontWeight="bold">
            {isLoading ? dash : formatUSD(totalSpend)}
          </Box>
        </div>

        <div>
          <Box variant="awsui-key-label">Average Spend per Period</Box>
          <Box fontSize="display-l" fontWeight="bold">
            {isLoading ? dash : formatUSD(averageSpend)}
          </Box>
        </div>

        <div>
          <Box variant="awsui-key-label">Peak Spend Period</Box>
          <Box fontSize="display-l" fontWeight="bold">
            {isLoading ? dash : (peakPeriod ?? dash)}
          </Box>
        </div>

        <div>
          <Box variant="awsui-key-label">Budget Remaining</Box>
          {isLoading || overallBudget === null ? (
            <Box fontSize="display-l" fontWeight="bold">
              {dash}
            </Box>
          ) : (
            <Box
              fontSize="display-l"
              fontWeight="bold"
              color={budgetRemaining !== null && budgetRemaining < 0 ? "text-status-error" : undefined}
            >
              {budgetRemaining !== null ? formatUSD(budgetRemaining) : dash}
            </Box>
          )}
        </div>

        <div>
          <Box variant="awsui-key-label">Total Budget Allocated</Box>
          <Box fontSize="display-l" fontWeight="bold">
            {isLoading || overallBudget === null ? dash : formatUSD(overallBudget)}
          </Box>
        </div>
      </ColumnLayout>
    </Container>
  );
};
