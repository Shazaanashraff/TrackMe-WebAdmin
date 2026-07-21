# Web-Admin Stress Testing Implementation Plan

## 1. Executive Summary
This plan describes how to execute stress testing for web-admin-consumed endpoints with controlled, repeatable, and safe load profiles.

This plan is now aligned to the current product usage model:

1. Primary stress target is prolonged bus location fetching.
2. Managers and super admins are mostly read-heavy users.
3. Bulk creation of managers and buses is not a realistic stress path right now.

The two primary requirements are explicitly covered:

1. Hit one location endpoint with sustained stress to verify it can withstand continuous polling.
2. Hit multiple read endpoints concurrently to verify the system remains stable under realistic mixed traffic.

## 2. Non-Negotiable Environment Requirements

## 2.1 Isolation Requirement
All stress test runs must use a dedicated stress-test environment and never the main database.

Required isolation layers:

1. Separate application deployment (or dedicated autoscaled replicas).
2. Separate database cluster (stress-test cluster or equivalent non-production cluster).
3. Separate cache/message resources where applicable.
4. Separate observability namespace or tags.

## 2.2 Blocker Policy
Do not execute stress scripts if any of these conditions are true:

1. Environment points to production.
2. Connection string targets primary production database.
3. No test-data reset strategy exists.
4. Monitoring is unavailable for latency/error/resource signals.

## 3. Scope (Web-Admin Only)

Endpoint inventory source: `test/crud-web-admin/README.md`.

Priority endpoint groups:

1. Tracking and near-real-time endpoint: `GET /api/manager/buses/:busId/location`.
2. Supporting read endpoints used by manager/super-admin dashboards.
3. Optional light write verification only (not a stress focus) to confirm no regression in normal mutation behavior.

Current capacity assumptions for planning:

1. Practical stress run baseline: `10 managers`, `100 buses` seeded in stress-test environment.
2. Upper reference envelope (future): up to `50 managers`, `200 buses`.
3. Frontend behavior: each manager fetches one selected bus at a time.

## 4. Stress Test Objectives

1. Confirm sustained stability of live-location polling under concurrent manager sessions.
2. Detect throughput and latency limits for location fetch endpoint.
3. Identify bottlenecks (DB, CPU, memory, locks, queueing) during prolonged polling.
4. Validate behavior during realistic mixed read traffic across multiple endpoints.
5. Validate continuous-run behavior (soak) for 2 to 6 hour windows.
6. Keep mutation stress low priority for now because bulk creates/updates are not expected usage.

## 5. Success Criteria (SLO-Based)
Set baseline targets before execution. Suggested defaults:

1. Location endpoint error rate under stress: less than 1%.
2. Mixed read endpoint error rate: less than 1%.
3. Location endpoint P95 latency: less than 500 ms.
4. Location endpoint P99 latency: less than 1.2 s.
5. No process crash or restart loops during soak.
6. No unbounded memory growth during soak.
7. No progressive latency drift over prolonged run windows.

Adjust values after first baseline run if needed.

## 6. Workload Profiles

## 6.1 Profile A: Single Endpoint Stress
Purpose: determine maximum sustainable throughput for the bus location endpoint.

Process:

1. Target endpoint: `GET /api/manager/buses/:busId/location`.
2. Use seeded dataset of `10 managers` and `100 buses`.
3. Simulate manager sessions where each virtual manager tracks one bus at a time.
4. Ramp concurrent manager sessions gradually (for example `5 -> 10 -> 15 -> 20`).
5. Hold each stage for 10 to 15 minutes to observe steady-state behavior.
6. Record error rate, P95/P99 latency, throughput, CPU, memory, DB connections.

Notes:

1. This profile is the primary pass/fail workload for current requirements.
2. For realism, include short bus-switch intervals where each manager changes selected bus every few minutes, still one bus at a time.

## 6.2 Profile B: Multi-Endpoint Mixed Load
Purpose: simulate realistic concurrent manager and super-admin read traffic.

Traffic mix suggestion:

1. 80% to 90% location polling reads.
2. 10% to 20% supporting reads (dashboard, operations overview, requests, audit).
3. 0% to 5% optional mutation calls for health-check only, not stress emphasis.

Recommended endpoint mix:

1. `GET /api/manager/buses/:busId/location`
2. `GET /api/super-admin/dashboard`
3. `GET /api/super-admin/operations`
4. `GET /api/super-admin/bus-requests`
5. `GET /api/super-admin/audit-logs`

Suggested scenario:

1. 10 manager sessions polling 10 active buses concurrently (1 bus per manager at any instant) from a seeded pool of 100 buses.
2. 1 to 2 super-admin sessions intermittently loading dashboard and operations views.

## 6.3 Profile C: Soak (Continuous Running)
Purpose: detect memory leaks, connection leaks, and long-run degradation during prolonged location polling.

Process:

1. Run continuous location-polling-heavy traffic for 2 to 6 hours.
2. Keep dataset refresh strategy in place.
3. Track drift in latency and resource usage over time.

Key checks:

1. Latency trend should be stable, not continuously rising.
2. Memory should stabilize, not grow indefinitely.
3. Error rates should remain within SLO thresholds.

## 6.4 Profile D: Spike and Recovery
Purpose: optional profile for burst resilience, lower priority than Profiles A-C.

Process:

1. Start at baseline load.
2. Spike to 5x to 10x for 1 to 3 minutes.
3. Return to baseline.
4. Measure recovery duration and residual impact.

## 7. Tooling and Implementation Approach

Recommended load tool: k6.

Why:

1. Scriptable scenarios.
2. Native support for thresholds and staged ramps.
3. Good integration with CI and dashboards.

Suggested test structure:

```text
+test/stress-testing/
+  README.md
+  IMPLEMENTATION_PLAN.md
+  scripts/
+    single-endpoint/
+      manager-bus-location.js
+    mixed/
+      manager-superadmin-read-mix.js
+    soak/
+      location-polling-soak.js
+    spike/
+      location-spike.js
+  data/
+    seed-profile.md
+    ids.sample.json
+  reports/
+    YYYY-MM-DD-baseline.md
+```

## 8. Data Strategy

## 8.1 Seeded Test Data
Prepare deterministic datasets for:

1. 10 manager accounts.
2. 100 buses distributed across routes.
3. Route assignments for all buses.
4. Minimum dashboard and operations records required for supporting read endpoints.

## 8.2 Data Lifecycle
Use one of the following per run:

1. Full environment reset before each major profile.
2. Incremental cleanup scripts between test waves.

Do not let stale stress data accumulate across runs without explicit policy.

## 9. Execution Phases

## Phase 1: Preflight
1. Confirm environment isolation.
2. Confirm stress-test DB cluster target.
3. Confirm observability dashboards and alerts.
4. Confirm test data ready.

## Phase 2: Baseline
1. Run low-concurrency location polling baseline.
2. Record normal latency and throughput.

## Phase 3: Single-Endpoint Stress
1. Run profile A on location endpoint as primary workload.
2. Identify breakpoints and bottlenecks.

## Phase 4: Multi-Endpoint Stress
1. Run profile B mixed read traffic.
2. Validate cross-endpoint interference and stability.

## Phase 5: Continuous Soak
1. Run profile C for long duration.
2. Validate long-term health metrics.

## Phase 6: Spike
1. Run profile D burst cycles.
2. Validate recovery characteristics.

## Phase 7: Report and Gate
1. Compare results against SLO targets.
2. Record bottlenecks and risk level.
3. Define release gate recommendation.

## 10. Observability Requirements
Track these metrics during every run:

Application:

1. Request rate.
2. Error rate by endpoint and status code.
3. P50/P95/P99 latency by endpoint.
4. Process CPU and memory.
5. Restart/crash events.

Database:

1. Connection pool saturation.
2. Slow query counts.
3. Lock wait/timeout signals.
4. Read/write IOPS and latency.
5. Resource utilization.

Infrastructure:

1. Pod/instance CPU and memory.
2. Autoscaling events.
3. Network saturation.

## 11. Reporting Template
For each run, capture:

1. Run ID and timestamp.
2. Environment and cluster name.
3. Profile type (single, mixed, soak, spike).
4. Endpoint set and traffic mix.
5. Concurrency levels and duration.
6. SLO pass/fail summary.
7. Top 5 bottlenecks.
8. Recommended remediations.
9. Retest recommendation.

## 12. Risk Controls and Guardrails

1. Add an environment hard-check in scripts that blocks production targets.
2. Add explicit run tags for traceability.
3. Cap max users in early runs to avoid accidental overload.
4. Use staged ramps, not immediate max load.
5. Ensure rollback or kill-switch path is known before starting.

## 13. Suggested Implementation Backlog

## Sprint 1
1. Create stress script for location endpoint (`manager-bus-location.js`).
2. Implement baseline and ramp tests for 10-manager/100-bus scenario.
3. Establish report format.

## Sprint 2
1. Implement mixed read workload script (manager + super-admin reads).
2. Add threshold assertions and CI artifact export.
3. Add dashboard links in run reports.

## Sprint 3
1. Implement soak suite as mandatory and spike suite as optional.
2. Add automated preflight validation for environment safety.
3. Add trend comparison against previous runs.

## 14. Senior Architect Notes (Readable for Interns)

1. Start simple, then scale complexity.
2. A failed stress run is useful; it reveals system limits.
3. Never tune blindly; always correlate app, DB, and infra metrics.
4. Prefer repeatable scripts over one-off manual runs.
5. Keep a run history so performance regressions are visible over time.

## 15. Definition of Done
Stress testing implementation is complete when:

1. Single-endpoint location stress script exists and is repeatable.
2. Multi-endpoint mixed read workload script exists and is repeatable.
3. Soak test is operational (spike optional for current phase).
4. Production safety guardrails are enforced.
5. Reports include SLO pass/fail and remediation guidance.
6. Runs are executed only against dedicated stress-test infrastructure and non-main database resources.

