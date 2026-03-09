// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GlobalConfigForUI } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { createConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/factories/configurationFactory";
import { mockConfigurationApi } from "@amzn/innovation-sandbox-frontend/mocks/mockApi";

export const mockConfiguration: GlobalConfigForUI = createConfiguration({
  isbManagedRegions: ["us-east-1", "us-west-2"],
  maintenanceMode: false,
});
mockConfigurationApi.returns(mockConfiguration);

export const configurationHandlers = [mockConfigurationApi.getHandler()];
