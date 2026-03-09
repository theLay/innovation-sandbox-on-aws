// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { setupWorker } from "msw/browser";

import { handlers } from "@amzn/innovation-sandbox-frontend/mocks/handlers";

export const worker = setupWorker(...handlers);
