// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "@amzn/innovation-sandbox-frontend/App";

async function prepare() {
  if (import.meta.env.VITE_MOCK === "true") {
    // Inject a fake JWT token so AuthService treats the user as logged in
    sessionStorage.setItem("isb-jwt", "dev-mock-token");
    const { worker } = await import(
      "@amzn/innovation-sandbox-frontend/mocks/browser"
    );
    return worker.start({ onUnhandledRequest: "bypass" });
  }
  return Promise.resolve();
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
