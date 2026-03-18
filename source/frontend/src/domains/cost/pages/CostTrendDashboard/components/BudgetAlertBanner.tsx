// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Flashbar } from "@cloudscape-design/components";

import { getBudgetAlertLevel } from "@amzn/innovation-sandbox-frontend/domains/cost/utils";

export interface BudgetAlertBannerProps {
  totalSpend: number;
  overallBudget: number | null;
}

const formatUSD = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const BudgetAlertBanner = ({
  totalSpend,
  overallBudget,
}: BudgetAlertBannerProps) => {
  const level = getBudgetAlertLevel(totalSpend, overallBudget);

  if (level === "none") return null;

  const percentage = ((totalSpend / overallBudget!) * 100).toFixed(1);
  const message = `Current spend ${formatUSD(totalSpend)} has reached ${percentage}% of the overall budget ${formatUSD(overallBudget!)}.`;

  return (
    <Flashbar
      items={[
        {
          type: level,
          content: message,
          dismissible: false,
        },
      ]}
    />
  );
};
