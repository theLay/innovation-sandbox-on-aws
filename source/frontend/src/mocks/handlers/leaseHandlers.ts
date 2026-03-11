// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  MonitoredLease,
  ExpiredLease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";
import {
  createActiveLease,
  createExpiredLease,
} from "@amzn/innovation-sandbox-frontend/mocks/factories/leaseFactory";
import { mockLeaseApi } from "@amzn/innovation-sandbox-frontend/mocks/mockApi";

export const mockLease: MonitoredLease = createActiveLease({
  userEmail: "alice@example.com",
  originalLeaseTemplateName: "Dev Sandbox",
  totalCostAccrued: 45.2,
  maxSpend: 100,
});

const mockLeases: (MonitoredLease | ExpiredLease)[] = [
  mockLease,
  createActiveLease({
    userEmail: "bob@example.com",
    originalLeaseTemplateName: "ML Sandbox",
    totalCostAccrued: 88.5,
    maxSpend: 100,
  }),
  createActiveLease({
    userEmail: "carol@example.com",
    originalLeaseTemplateName: "Dev Sandbox",
    totalCostAccrued: 12.0,
    maxSpend: 200,
  }),
  createExpiredLease({
    userEmail: "dave@example.com",
    originalLeaseTemplateName: "Data Sandbox",
    totalCostAccrued: 150.75,
    maxSpend: 150,
    status: "BudgetExceeded",
  }),
  createExpiredLease({
    userEmail: "eve@example.com",
    originalLeaseTemplateName: "Dev Sandbox",
    totalCostAccrued: 60.0,
    maxSpend: 100,
    status: "Expired",
  }),
  createExpiredLease({
    userEmail: "frank@example.com",
    originalLeaseTemplateName: "ML Sandbox",
    totalCostAccrued: 200.0,
    maxSpend: 300,
    status: "ManuallyTerminated",
  }),
];

mockLeaseApi.returns(mockLeases);

export const leaseHandlers = [
  mockLeaseApi.getHandler(),
  mockLeaseApi.getHandler("/:id"),
  mockLeaseApi.patchHandler("/:id"),
  mockLeaseApi.postHandler("/request"),
  mockLeaseApi.reviewHandler("/review"),
];
