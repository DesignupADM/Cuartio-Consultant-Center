# Optimization Checklist

This checklist is tailored to the current ConnectFlow Pro codebase and focuses on the biggest performance and maintainability wins first.

## 1. Build and runtime reliability

- [x] Self-host fonts instead of fetching from Google at build time
  - Target: [`src/app/layout.tsx`](../src/app/layout.tsx)
  - Verify: `npm run build` works without external font access.

- [x] Keep global providers minimal in the root layout
  - Target: [`src/app/layout.tsx`](../src/app/layout.tsx)
  - Verify: only essential providers mount at the app root.

## 2. Auth and profile state

- [x] Centralize user/profile resolution in one provider
  - Target: [`src/firebase/auth/use-user.tsx`](../src/firebase/auth/use-user.tsx)
  - Verify: dashboard pages consume shared context instead of creating duplicate listeners.

- [x] Avoid repeated profile reads in nested dashboard wrappers
  - Targets: [`src/components/protected-route.tsx`](../src/components/protected-route.tsx), [`src/components/dashboard-layout.tsx`](../src/components/dashboard-layout.tsx), [`src/app/dashboard/page.tsx`](../src/app/dashboard/page.tsx)
  - Verify: no redundant `useUser()` subscriptions in the dashboard stack.

## 3. Firestore read efficiency

- [x] Replace full collection reads with aggregate counts where possible
  - Targets: [`src/app/dashboard/analytics/page.tsx`](../src/app/dashboard/analytics/page.tsx), [`src/components/dashboard/admin-overview.tsx`](../src/components/dashboard/admin-overview.tsx)
  - Verify: overview metrics use `getCountFromServer` or precomputed stats docs.

- [x] Keep analytics charts on sampled or summarized data
  - Target: [`src/app/dashboard/analytics/page.tsx`](../src/app/dashboard/analytics/page.tsx)
  - Verify: charts do not require downloading entire collections.

- [x] Keep pagination as the default for large lists
  - Targets: [`src/firebase/firestore/use-paginated-collection.tsx`](../src/firebase/firestore/use-paginated-collection.tsx), [`src/components/dashboard/directory/admin-directory.tsx`](../src/components/dashboard/directory/admin-directory.tsx), [`src/components/dashboard/opportunities/admin-opportunities.tsx`](../src/components/dashboard/opportunities/admin-opportunities.tsx)
  - Verify: list pages load the minimum page size first.

## 4. Heavy admin operations

- [x] Move legacy country migration out of mount-time logic
  - Target: [`src/components/dashboard/directory/admin-directory.tsx`](../src/components/dashboard/directory/admin-directory.tsx)
  - Verify: migration only runs when an admin explicitly triggers it.

- [x] Chunk bulk export and migration operations safely
  - Target: [`src/components/dashboard/directory/admin-directory.tsx`](../src/components/dashboard/directory/admin-directory.tsx)
  - Verify: operations commit in batches and do not freeze the browser on large datasets.

- [x] Move very large admin jobs to a backend worker or server action
  - Targets: admin export, migration, and any future large-scale cleanup flows
  - Verify: browser is no longer responsible for large long-running data jobs.

## 5. Client bundle size

- [x] Self-host fonts and remove Google font fetch dependency
  - Target: [`src/app/layout.tsx`](../src/app/layout.tsx)
  - Verify: no remote font fetch needed during build.

- [x] Lazy-load the rich text editor only on pages that need it
  - Target: [`src/components/editor/OpportunityEditor.tsx`](../src/components/editor/OpportunityEditor.tsx)
  - Verify: pages that do not edit opportunities do not ship TinyMCE upfront.

- [x] Review charting and animation imports for route-level laziness
  - Targets: [`src/components/analytics-charts.tsx`](../src/components/analytics-charts.tsx), dashboard pages that use Framer Motion
  - Verify: analytics/dashboard routes keep heavy visualization code isolated.

## 6. Dashboard shell weight

- [x] Use a shared user context instead of multiple auth subscriptions
  - Target: [`src/firebase/auth/use-user.tsx`](../src/firebase/auth/use-user.tsx)
  - Verify: one auth/profile source feeds the whole dashboard.

- [x] Trim non-essential UI from the always-mounted dashboard shell
  - Target: [`src/components/dashboard-layout.tsx`](../src/components/dashboard-layout.tsx)
  - Verify: only critical shell controls load on every dashboard route.

## 7. Data modeling and summaries

- [x] Add precomputed dashboard summary documents
  - Targets: analytics, admin overview, consultant overview
  - Verify: dashboard metrics come from summary docs instead of live scans where possible.

- [x] Denormalize read-heavy fields that are frequently displayed together
  - Targets: consultant profiles, opportunities, applicants
  - Verify: the UI does fewer cross-collection lookups.

- [x] Make common filters fully queryable in Firestore
  - Targets: directory filters, opportunity filters, analytics slices
  - Verify: filters execute in the query layer, not after fetch.

## 8. Validation and monitoring

- [x] Confirm production build passes
  - Command: `npm run build`

- [x] Confirm TypeScript typecheck passes
  - Command: `npm run typecheck`

- [x] Add a bundle analyzer or route budget check
  - Verify: route size regressions are visible early.

- [ ] Add at least one automated smoke or UI flow test for the dashboard (SKIPPED)
  - Verify: login, dashboard load, and a representative admin workflow stay healthy.

## Suggested order

1. Keep the build reliable.
2. Reduce dashboard reads.
3. Shrink the client bundle.
4. Push heavy admin jobs off the browser.
5. Add monitoring so regressions are caught early.
