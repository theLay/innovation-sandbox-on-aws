// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

import { BudgetAllocation } from "../types";

const STORAGE_KEY = "isb_budget_history";

function loadFromStorage(): BudgetAllocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BudgetAllocation[];
  } catch {
    console.warn(
      "[useBudgetHistory] Failed to parse localStorage data. Initializing with empty array.",
    );
    return [];
  }
}

function saveToStorage(allocations: BudgetAllocation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allocations));
}

export interface UseBudgetHistoryResult {
  allocations: BudgetAllocation[];
  overallBudget: number;
  addAllocation: (amount: number, label?: string) => void;
  removeAllocation: (id: string) => void;
}

export function useBudgetHistory(): UseBudgetHistoryResult {
  const [allocations, setAllocations] = useState<BudgetAllocation[]>(() =>
    loadFromStorage(),
  );

  const overallBudget = allocations.reduce((sum, a) => sum + a.amount, 0);

  function addAllocation(amount: number, label?: string): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(
        `Invalid budget amount: ${amount}. Amount must be a positive number.`,
      );
    }

    const newAllocation: BudgetAllocation = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      amount,
      ...(label !== undefined ? { label } : {}),
    };

    setAllocations((prev) => {
      const next = [...prev, newAllocation];
      saveToStorage(next);
      return next;
    });
  }

  function removeAllocation(id: string): void {
    setAllocations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveToStorage(next);
      return next;
    });
  }

  return { allocations, overallBudget, addAllocation, removeAllocation };
}
