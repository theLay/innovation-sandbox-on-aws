# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```shell
# Install dependencies
npm install

# Initialize .env from template
npm run env:init

# Run all tests (from repo root)
npm test

# Run tests and update snapshots
npm run test:update-snapshots

# Run tests for a single package
npm test --workspace source/lambdas/api/leases

# Build all packages
npm run build

# Lint frontend
npm run lint --workspace source/frontend

# CDK bootstrap (requires .env configured)
npm run bootstrap

# Deploy all stacks
npm run deploy:all

# Deploy individual stacks
npm run deploy:account-pool
npm run deploy:idc
npm run deploy:data
npm run deploy:compute

# Clean build artifacts (preserves .env)
npm run clean
```

## Architecture Overview

This is a TypeScript npm workspaces monorepo that deploys an AWS solution for managing temporary sandbox AWS accounts. It uses **CDK** for infrastructure and **Vitest** for testing.

### Four CloudFormation Stacks (deployed to different accounts)

| Stack | Account | Purpose |
|---|---|---|
| `InnovationSandbox-AccountPool` | Org management account | Creates OUs in AWS Organizations, deploys SCPs |
| `InnovationSandbox-IDC` | IAM Identity Center account | Configures SSO groups and permission sets |
| `InnovationSandbox-Data` | Hub account | DynamoDB tables, AppConfig configuration |
| `InnovationSandbox-Compute` | Hub account | REST API, Lambda functions, EventBridge, CloudFront, account cleaner |

### Source Packages

- `source/common` (`@amzn/innovation-sandbox-commons`) — Shared library used across all lambdas: data store interfaces and DynamoDB implementations, domain types (Zod schemas), event definitions, service classes, Lambda middleware
- `source/frontend` (`@amzn/innovation-sandbox-frontend`) — React + Vite app using [Cloudscape Design](https://cloudscape.design/)
- `source/infrastructure` (`@amzn/innovation-sandbox-infrastructure`) — CDK app defining all stacks and constructs
- `source/lambdas/**` — Individual Lambda functions, each is its own npm workspace package, organized by domain: `api/`, `account-management/`, `account-cleanup/`, `blueprint-deployment/`, `metrics/`, `notification/`, `custom-resources/`, `helpers/`
- `source/layers/` — Lambda layers: `common` (shared runtime code) and `dependencies` (npm packages)

### Core Domain Concepts

**SandboxAccount** — An AWS account with status: `Available | Active | CleanUp | Quarantine | Frozen`

**Lease** — A user's request for sandbox account access. Lifecycle:
- Pending: `PendingApproval`
- Active: `Active | Frozen | Provisioning`
- Terminal: `Expired | BudgetExceeded | ManuallyTerminated | AccountQuarantined | Ejected | ProvisioningFailed | ApprovalDenied`

**LeaseTemplate** — Admin-defined template specifying budget limits, duration, and alert thresholds that users request from.

**Blueprint** — A CloudFormation StackSet registered by admins that gets deployed into sandbox accounts upon provisioning.

**GlobalConfig** — Solution-wide configuration stored in AWS AppConfig, read at Lambda runtime.

### Key Patterns

**Data stores**: Each entity has an interface in `source/common/data/<entity>/<entity>-store.ts` with a DynamoDB implementation in `dynamo-<entity>-store.ts`. Stores are instantiated via `IsbServices` factory class (`source/common/isb-services/index.ts`) which takes typed Lambda environment objects.

**Lambda environments**: Each Lambda defines a Zod schema for its required environment variables (in `source/common/lambda/environments/`). These are validated at cold start by middleware.

**Middleware**: API Lambdas use a Middy middleware bundle (`api-middleware-bundle.ts`) that handles JWT auth, environment validation, error formatting (JSend), and security headers. Background Lambdas use `base-middleware-bundle.ts`.

**Events**: Components communicate asynchronously via EventBridge. All event types are defined in `source/common/events/`. The `IsbEventBridgeClient` wraps the AWS SDK to enforce typed event publishing.

**Cross-account access**: The `IntermediateRole` IAM role in the hub account is assumed to perform operations in the org management account and IDC account. Sandbox account operations use a `SandboxAccountRole`.

**Schema versioning**: DynamoDB items include a `schemaVersion` field. Each entity defines a `SchemaVersion` constant that must be incremented on schema changes. A `createVersionRangeSchema` utility enforces backwards compatibility ranges.

### Deployment Modes

Setting `DEPLOYMENT_MODE=dev` in `.env` (or CDK context `deploymentMode=dev`) disables DynamoDB deletion protection and sets `RemovalPolicy.DESTROY` on tables, enabling clean stack teardown.

### TypeScript Path Aliases

Packages import each other using `@amzn/` scoped names:
- `@amzn/innovation-sandbox-commons/...` — common library
- `@amzn/innovation-sandbox-infrastructure/...` — CDK constructs

### Account Cleaner

The account cleanup flow uses a Step Functions state machine that invokes an AWS CodeBuild project running [aws-nuke](https://github.com/ekristen/aws-nuke) to wipe all resources from sandbox accounts before recycling them. The nuke config can be overridden via `NUKE_CONFIG_FILE_PATH` in `.env`.
