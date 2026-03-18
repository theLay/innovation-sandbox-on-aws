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

// 오늘 기준 N개월 전의 특정 날짜를 ISO 8601 문자열로 반환
function monthsAgo(months: number, day: number = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

// 학기제 비용 패턴에 따른 비용 반환
function getCostForMonth(monthsBack: number): number {
  if (monthsBack >= 12 && monthsBack <= 14) {
    // 학기 시작, 높음
    return 150 + Math.random() * 50;
  } else if (monthsBack >= 9 && monthsBack <= 11) {
    // 중간
    return 80 + Math.random() * 40;
  } else if (monthsBack >= 6 && monthsBack <= 8) {
    // 학기말 텀 프로젝트, 매우 높음
    return 200 + Math.random() * 100;
  } else if (monthsBack >= 3 && monthsBack <= 5) {
    // 방학
    return 60 + Math.random() * 40;
  } else {
    // 새 학기 시작, 높음
    return 180 + Math.random() * 70;
  }
}

const users = ["alice", "bob", "carol", "dave", "eve", "frank"];
const templates = ["Dev Sandbox", "ML Sandbox", "Data Sandbox"];
const expiredStatuses: Array<"Expired" | "BudgetExceeded" | "ManuallyTerminated"> = [
  "Expired",
  "BudgetExceeded",
  "ManuallyTerminated",
];

// 14개월 전 ~ 현재를 커버하는 mock lease 배열 생성
const mockLeases: (MonitoredLease | ExpiredLease)[] = [];

let leaseIndex = 0;

for (let monthsBack = 14; monthsBack >= 0; monthsBack--) {
  // 월별 2~4개 lease 생성
  const leasesPerMonth = 2 + (leaseIndex % 3);

  for (let i = 0; i < leasesPerMonth; i++) {
    const user = users[leaseIndex % users.length];
    const template = templates[leaseIndex % templates.length];
    const cost = Math.round(getCostForMonth(monthsBack) * 100) / 100;
    const maxSpend = Math.ceil(cost * 1.5 / 50) * 50; // cost의 1.5배를 50 단위로 올림
    const day = 5 + (i * 7); // 5, 12, 19, 26일 분산
    const checkedDate = monthsAgo(monthsBack, day);

    if (monthsBack <= 1) {
      // 최근 1개월: Active 상태
      mockLeases.push(
        createActiveLease({
          userEmail: `${user}@example.com`,
          originalLeaseTemplateName: template,
          totalCostAccrued: cost,
          maxSpend,
          lastCheckedDate: checkedDate,
        }),
      );
    } else if (monthsBack <= 3) {
      // 2~3개월 전: Active 또는 Expired 혼합
      if (i % 2 === 0) {
        mockLeases.push(
          createActiveLease({
            userEmail: `${user}@example.com`,
            originalLeaseTemplateName: template,
            totalCostAccrued: cost,
            maxSpend,
            lastCheckedDate: checkedDate,
          }),
        );
      } else {
        mockLeases.push(
          createExpiredLease({
            userEmail: `${user}@example.com`,
            originalLeaseTemplateName: template,
            totalCostAccrued: cost,
            maxSpend,
            status: expiredStatuses[leaseIndex % expiredStatuses.length],
            lastCheckedDate: checkedDate,
          }),
        );
      }
    } else {
      // 4개월 이상 전: Expired 상태
      mockLeases.push(
        createExpiredLease({
          userEmail: `${user}@example.com`,
          originalLeaseTemplateName: template,
          totalCostAccrued: cost,
          maxSpend,
          status: expiredStatuses[leaseIndex % expiredStatuses.length],
          lastCheckedDate: checkedDate,
        }),
      );
    }

    leaseIndex++;
  }
}

export const mockLease: MonitoredLease = mockLeases[0] as MonitoredLease;

mockLeaseApi.returns(mockLeases);

export const leaseHandlers = [
  mockLeaseApi.getHandler(),
  mockLeaseApi.getHandler("/:id"),
  mockLeaseApi.patchHandler("/:id"),
  mockLeaseApi.postHandler("/request"),
  mockLeaseApi.reviewHandler("/review"),
];
