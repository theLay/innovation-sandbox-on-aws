// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Table } from "@aws-northstar/ui";
import {
  Box,
  BarChart,
  ColumnLayout,
  Container,
  Header,
  PieChart,
  ProgressBar,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAppLayoutContext } from "@amzn/innovation-sandbox-frontend/components/AppLayout/AppLayoutContext";
import { ContentLayout } from "@amzn/innovation-sandbox-frontend/components/ContentLayout";
import { useCostSummary } from "@amzn/innovation-sandbox-frontend/domains/cost/hooks";
import { LeaseCostEntry } from "@amzn/innovation-sandbox-frontend/domains/cost/types";
import { useBreadcrumb } from "@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb";
import { useUser } from "@amzn/innovation-sandbox-frontend/hooks/useUser";

const formatUSD = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const columnDefinitions = [
  {
    id: "userEmail",
    header: "User",
    sortingField: "userEmail",
    cell: (item: LeaseCostEntry) => item.userEmail,
  },
  {
    id: "templateName",
    header: "Lease Template",
    sortingField: "templateName",
    cell: (item: LeaseCostEntry) => item.templateName,
  },
  {
    id: "status",
    header: "Status",
    sortingField: "status",
    cell: (item: LeaseCostEntry) => {
      const type =
        item.status === "BudgetExceeded"
          ? "error"
          : item.status === "Active"
            ? "success"
            : item.status === "Frozen"
              ? "warning"
              : "stopped";
      return <StatusIndicator type={type}>{item.status}</StatusIndicator>;
    },
  },
  {
    id: "totalCostAccrued",
    header: "Spend",
    sortingField: "totalCostAccrued",
    cell: (item: LeaseCostEntry) => formatUSD(item.totalCostAccrued),
  },
  {
    id: "maxSpend",
    header: "Budget",
    sortingField: "maxSpend",
    cell: (item: LeaseCostEntry) =>
      item.maxSpend != null ? formatUSD(item.maxSpend) : "Unlimited",
  },
  {
    id: "usagePercent",
    header: "Usage",
    cell: (item: LeaseCostEntry) =>
      item.usagePercent != null ? (
        <ProgressBar
          value={item.usagePercent}
          status={item.usagePercent >= 100 ? "error" : "in-progress"}
        />
      ) : (
        "—"
      ),
  },
];

export const CostDashboard = () => {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumb();
  const { setTools } = useAppLayoutContext();
  const { isAdmin, isLoading: userLoading } = useUser();
  const { summary, isLoading } = useCostSummary();

  useEffect(() => {
    setBreadcrumb([
      { text: "Home", href: "/" },
      { text: "Cost Dashboard", href: "/cost" },
    ]);
    setTools(null);
  }, []);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, userLoading, navigate]);

  const topSpenders = summary
    ? [...summary.leases]
        .sort((a, b) => b.totalCostAccrued - a.totalCostAccrued)
        .slice(0, 10)
    : [];

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Overview of sandbox account spending across all active and expired leases."
        >
          Cost Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* KPI Summary */}
        <Container header={<Header variant="h2">Summary</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Total Spend</Box>
              <Box fontSize="display-l" fontWeight="bold">
                {isLoading ? "—" : formatUSD(summary?.totalSpend ?? 0)}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Total Budget Allocated</Box>
              <Box fontSize="display-l" fontWeight="bold">
                {isLoading ? "—" : formatUSD(summary?.totalBudget ?? 0)}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Active Leases</Box>
              <Box fontSize="display-l" fontWeight="bold">
                {isLoading ? "—" : (summary?.activeLeaseCount ?? 0)}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Budget Exceeded</Box>
              <Box
                fontSize="display-l"
                fontWeight="bold"
                color={
                  (summary?.budgetExceededCount ?? 0) > 0
                    ? "text-status-error"
                    : "text-status-success"
                }
              >
                {isLoading ? "—" : (summary?.budgetExceededCount ?? 0)}
              </Box>
            </div>
          </ColumnLayout>
          {!isLoading && summary && summary.totalBudget > 0 && (
            <Box margin={{ top: "l" }}>
              <ProgressBar
                label="Overall Budget Utilization"
                value={summary.budgetUtilizationPercent}
                additionalInfo={`${formatUSD(summary.totalSpend)} of ${formatUSD(summary.totalBudget)}`}
                status={
                  summary.budgetUtilizationPercent >= 100
                    ? "error"
                    : "in-progress"
                }
              />
            </Box>
          )}
        </Container>

        {/* Charts */}
        <ColumnLayout columns={2}>
          <Container header={<Header variant="h2">Spend by Status</Header>}>
            <PieChart
              data={summary?.spendByStatus ?? []}
              variant="donut"
              statusType={isLoading ? "loading" : "finished"}
              empty={
                <Box textAlign="center" color="inherit">
                  No cost data available
                </Box>
              }
              segmentDescription={(datum, sum) =>
                `${formatUSD(datum.value)} (${((datum.value / sum) * 100).toFixed(1)}%)`
              }
              hideFilter
            />
          </Container>

          <Container header={<Header variant="h2">Top Spenders</Header>}>
            <BarChart
              series={[
                {
                  title: "Spend",
                  type: "bar",
                  data: topSpenders.map((l) => ({
                    x: l.userEmail,
                    y: l.totalCostAccrued,
                  })),
                },
              ]}
              xDomain={topSpenders.map((l) => l.userEmail)}
              yDomain={[0, Math.max(...topSpenders.map((l) => l.totalCostAccrued), 1)]}
              statusType={isLoading ? "loading" : "finished"}
              empty={
                <Box textAlign="center" color="inherit">
                  No cost data available
                </Box>
              }
              hideFilter
              hideLegend
              height={200}
              xTitle="User"
              yTitle="USD"
            />
          </Container>
        </ColumnLayout>

        {/* Detailed Table */}
        <Container>
          <Table
            variant="embedded"
            stripedRows
            trackBy="leaseId"
            columnDefinitions={columnDefinitions}
            header="Lease Cost Breakdown"
            items={summary?.leases ?? []}
            loading={isLoading}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};
