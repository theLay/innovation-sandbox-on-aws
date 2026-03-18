// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

import {
  Box,
  Button,
  Container,
  Form,
  FormField,
  Header,
  Input,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";

import { useBudgetHistory } from "@amzn/innovation-sandbox-frontend/domains/cost/hooks/useBudgetHistory";

const formatUSD = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const BudgetPanel = () => {
  const { allocations, overallBudget, addAllocation, removeAllocation } =
    useBudgetHistory();

  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    const parsed = parseFloat(amount);

    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setAmountError("Please enter a valid positive amount.");
      return;
    }

    try {
      addAllocation(parsed, label.trim() || undefined);
      setAmount("");
      setLabel("");
      setAmountError(undefined);
    } catch (err) {
      setAmountError(err instanceof Error ? err.message : "Failed to add allocation.");
    }
  };

  return (
    <Container header={<Header variant="h2">Budget Allocations</Header>}>
      <SpaceBetween size="l">
        <Form header={<Header variant="h3">Add Budget Allocation</Header>}>
          <SpaceBetween size="s">
            <FormField label="Amount" errorText={amountError} constraintText="Required. Must be a positive number.">
              <Input
                value={amount}
                onChange={({ detail }) => {
                  setAmount(detail.value);
                  if (amountError) setAmountError(undefined);
                }}
                placeholder="$0.00"
                type="number"
              />
            </FormField>

            <FormField label={<span>Label <i>- optional</i></span>}>
              <Input
                value={label}
                onChange={({ detail }) => setLabel(detail.value)}
                placeholder="e.g. Semester Start"
              />
            </FormField>

            <Button variant="primary" onClick={handleAdd}>
              Add
            </Button>
          </SpaceBetween>
        </Form>

        <Table
          items={allocations}
          columnDefinitions={[
            {
              id: "date",
              header: "Date",
              cell: (item) => item.date,
            },
            {
              id: "label",
              header: "Label",
              cell: (item) => item.label ?? "—",
            },
            {
              id: "amount",
              header: "Amount",
              cell: (item) => formatUSD(item.amount),
            },
            {
              id: "actions",
              header: "",
              cell: (item) => (
                <Button
                  variant="icon"
                  iconName="remove"
                  ariaLabel={`Remove allocation from ${item.date}`}
                  onClick={() => removeAllocation(item.id)}
                />
              ),
            },
          ]}
          empty={
            <Box textAlign="center" color="inherit">
              No budget allocations yet.
            </Box>
          }
          variant="embedded"
        />

        <Box textAlign="right" fontWeight="bold">
          Total Budget: {formatUSD(overallBudget)}
        </Box>
      </SpaceBetween>
    </Container>
  );
};
