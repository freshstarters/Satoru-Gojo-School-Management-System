# Project Scope, Milestones & Prerequisites (`SCOPE.md`)

**Project:** Liberian School Management System Platform — Gojo School (`demo`) & General Multi-Tenant SMS (`core`)
**Visual Source of Truth:** `/home/demiz/Projects/gojo-school-mgt-sys/UI-template/template1.html` (Gojo Institute · Sinkor & Paynesville Campuses)
**Companion Documents:** `docs/PRD.md`, `docs/BACKLOG.md`

---

## 1. Release Strategy & Phase Boundaries

The platform is delivered in a **unified 9-sprint roadmap** split into two major release phases:

- **Phase 1 — Gojo School v1 (`Sprints 1–6`):**
  Builds the shared `core` platform services (PostgreSQL setup, `.env` multi-tenancy switch framework, JWT + `+231` phone + Google Sign-In auth, RBAC, audit log, notification/AI adapters) AND delivers the complete customized Gojo Institute application (`demo` app at `/api/demo/v1/` + React TypeScript PWA frontend covering all 13 `template1.html` panes, Parent/Guardian Portal, Student Portal, and Full PWA Offline-First IndexedDB sync).
- **Phase 2 — General Multi-Tenant SMS & Live Liberian Payments (`Sprints 7–9`):**
  Delivers the multi-tenant `core` school domain (`/api/v1/`), automated `shared` vs. `per_tenant` PostgreSQL provisioning and `subdomain` vs. `header_path` routing verification, live Lonestar Cell MTN MoMo & Orange Money Liberia payment gateways, bulk CSV/Excel imports, Platform Super Admin Console, and production hardening.

---

## 2. In-Scope Matrix

| Domain / Capability | Phase 1: Gojo School (`demo` + `core` platform) | Phase 2: General Multi-Tenant SMS (`core`) | PRD Refs |
|---|---|---|---|
| PostgreSQL-only database layer + Redis & Celery + S3/R2 storage | Included (S1) | Multi-DB per tenant (S7) | AC-08–AC-13 |
| `.env` Multi-Tenancy Switches (`TENANCY_DB_MODE`, `TENANCY_ROUTING_MODE`) | Framework & contract built + tested (S1) | Full school-domain execution & tenant provisioning (S7) | AC-08–AC-13 |
| Auth: JWT (cookie refresh), Email / `+231` Phone, Google Sign-In, Invite-Only, Reset | Included (S1) | Tenant-scoped claims & subdomain enforcement (S7) | AC-01–AC-07 |
| RBAC (5 School Staff Roles + Parent + Student + Platform Super Admin) | Included (S1–S6) | Full Super Admin Console (S9) | AC-05, AC-69 |
| Frontend Shell, Design System (`template1.html`), Theme/Accent/Font, LRD `+ USD` Toggle | Included (S1) | Shared API contract for future general frontend | AC-14–AC-17 |
| Multi-Campus Setup, Liberian Divisions (Nursery–Grade 12), MoE Subjects & Settings | Included (S2) | Per-tenant configurable defaults (S7) | AC-18–AC-20 |
| Classes & Weekly 8-Period Timetable + Uncovered Slot Substitution | Included (S2) | Included (S7) | AC-32–AC-34 |
| Students Directory + 3-Tab Inspector (Profile, Welfare & Pickup, Conduct) | Included (S2) | Included (S7) | AC-26–AC-28 |
| Teachers/Staff & Parents/Guardians Directories + Inspectors | Included (S2) | Included (S7) | AC-49–AC-50 |
| Principal Dashboard (KPIs, P1–P6/WAEC Chart, LRD Cashflow, Catchment Map) + Global Search | Included (S3) | Included (S7) | AC-16, AC-21–AC-25 |
| Daily Attendance Register & Unexcused Absence Alerts | Included (S3) | Included (S7) | AC-35–AC-36 |
| Liberian 6-Period + 2-Semester Gradebook, Locks, Rankings & Promotion/Retention | Included (S4) | Included (S7) | AC-37–AC-39, AC-42 |
| WAEC / WASSCE (Grade 12) & LJHSCE (Grade 9) Readiness Tracker | Included (S4) | Included (S7) | AC-40 |
| Printable PDF Report Cards, Bulk Class ZIP, Grade Sheets & Senior High Transcripts | Included (S4) | Included (S7) | AC-41 |
| Admissions Pipeline (5-Stage Kanban + Table + One-Click Convert to Student) | Included (S5) | Included (S7) | AC-29–AC-31 |
| Tuition & LRD/USD Fees (Invoices, Fee Schedule, Manual Receipts, Voids, Exam Clearance) | Included (S5) | Included (S7) | AC-43–AC-47 |
| Library & Textbooks (Catalog, Issue, Return, Overdue) | Included (S5) | Included (S7) | AC-51–AC-52 |
| School Bus Routes (Routes, Stops, Driver/Conductor, Student Rosters) | Included (S5) | Included (S7) | AC-53–AC-54 |
| Announcements, Multi-Channel Notifications (Email/SMS/WhatsApp) & SMS Wallet | Included (S5) | Tenant-scoped wallets (S7) | AC-55–AC-57 |
| Fail-Closed AI Assist (Briefings, Parent Notice Drafting, Grade/Attendance Insights) | Included (S5) | Tenant-scoped quotas (S7) | AC-60–AC-61 |
| Parent/Guardian Portal & Student Portal | Included (S6) | Included (S7) | AC-58–AC-59 |
| Immutable Audit Log Drawer | Included (S6) | Platform + Tenant Audit (S9) | AC-62 |
| Full PWA Offline-First Mode (Service Worker + IndexedDB Cache + Outbox + Conflict UI) | Included (S6) | Delta sync endpoints in `core` (S7) | AC-63–AC-67 |
| Live Lonestar Cell MTN MoMo & Orange Money Liberia Checkout + Webhooks | Deferred to S8 | Included for both `demo` & `core` (S8) | AC-48 |
| Bulk CSV/Excel Imports (Students, Grades, Fee Schedules) | Deferred to S8 | Included for both `demo` & `core` (S8) | AC-68 |
| Encrypted PostgreSQL Backups, Observability, Load & Offline QA | Baseline S1 | Full Production Hardening (S9) | Section 7 |

---

## 3. Explicitly Out of Scope (Post-v1 / Future Roadmap)

The following capabilities are **excluded** from Sprints 1–9 so scope stays focused on high-impact school operations:

1. **Dormitory & Boarding House Management:** Bed allocations, exeats, and dining hall rosters are deferred to a Post-v1 Boarding module.
2. **School Store, Canteen & Uniform Inventory / POS:** While uniform/book fees appear as line items on Student Fee Schedules, SKU stockroom inventory and point-of-sale checkout are deferred.
3. **Staff Payroll, NASSCORP & LRA Tax Filing:** Staff directory and teaching load are in scope, but monthly salary disbursement, Liberian Revenue Authority (LRA) withholding tax, and NASSCORP calculations are deferred to an HR/Payroll add-on.
4. **Direct Ministry of Education (MoE) EMIS API Submission:** Printable/exportable CSV & PDF grade sheets and rosters are in scope; automated government API integration is deferred pending official MoE API access.
5. **General Multi-Tenant Frontend Repository:** Building the separate general SaaS frontend repo (consuming `/api/v1/`) is outside this workspace until that repository path is created; Phase 2 delivers and verifies the complete `/api/v1/` backend API and OpenAPI schema.
6. **Native iOS / Android Store Apps:** Mobile access is delivered via the installable Offline-First PWA; native React Native / Flutter wrappers are Post-v1.

---

## 4. Milestone Schedule & Exit Criteria

Each milestone maps 1:1 to a Sprint in `docs/BACKLOG.md`.

| Milestone | Sprint | Target Outcome | Exit Criteria |
|---|---|---|---|
| **M1: Platform, Multi-Tenancy Core & Shell** | Sprint 1 | PostgreSQL + Redis + Celery running; `.env` multi-tenancy switches validated; Auth (Email, `+231`, Google Sign-In, Invites, RBAC) live; React shell matches `template1.html` tokens. | All S1 backend tests pass against PostgreSQL in both `shared`/`per_tenant` and `subdomain`/`header_path` config modes; user can sign in from a same-site client and toggle theme/accent/LRD+USD in browser; a refresh reopens the same pane; timestamps use Africa/Monrovia. |
| **M2: Academic Core & Directories** | Sprint 2 | Multi-campus setup, Classes, Weekly 8-Period Timetable, Students + 3-tab Inspector, Teachers/Staff, and Parents/Guardians fully wired to `/api/demo/v1/`. | Zero fixture fallbacks on wired panes; double-booked timetable slots rejected; student welfare/pickup & conduct notes persist cleanly; opening a student has an address that reopens that student's inspector; the selected Settings section, Classes subtab, and open inspector subtab survive a refresh. |
| **M3: School Day Operations** | Sprint 3 | Principal Dashboard (live KPIs, combo chart, cashflow, catchment map), Daily Attendance Register, Uncovered Bell Slot Substitution, and Global Search live. | Teacher can complete a 40-student roll call in < 30s; Principal sees live attendance & uncovered slots; Global Search jumps directly to matching inspectors. |
| **M4: Liberian Grades, WAEC & Promotion** | Sprint 4 | 6-Period + 2-Semester Gradebook, WAEC/WASSCE & LJHSCE Tracker, PDF Report Cards/Transcripts, Period Locks, and Year-End Promotion live. | Deterministic Liberian weighted averages pass unit/integration tests; branded PDF report card & transcript download cleanly; locked periods block teacher edits; the bursar opens Grades & WAEC on the WAEC tracker, updates exam-fee status, and does not see the gradebook. |
| **M5: Admissions, LRD/USD Finance, Campus Ops & AI** | Sprint 5 | Admissions Kanban/Table, Tuition/Invoices/Manual Receipts/Voids/Exam Clearance, Library, Bus Routes, Announcements + SMS Wallet + Fail-Closed Notifications, and AI Assist live. | Applicant converts to enrolled student + invoice atomically; USD-tendered payment snapshots FX rate into LRD ledger; void reverses balance with audit; missing SMS/AI keys fail closed (`503`); a configured SMS gateway sends a phone password-reset text in addition to the account email, and a missing gateway still sends that email. |
| **M6: Portals, Audit & Offline-First PWA** | Sprint 6 | Parent/Guardian Portal, Student Portal, Audit Log Drawer, and Full PWA Offline-First IndexedDB Sync Engine + Conflict UI live. | Parent sees only linked children; Student sees only self; turning network offline in browser DevTools allows browsing all cached screens, recording attendance/grades offline, and syncing cleanly upon reconnect with conflict handling; failed sign-ins and tenant-mismatch events appear in the audit log. |
| **M7: General Multi-Tenant SMS (`core`)** | Sprint 7 | Complete school domain live in `core` (`/api/v1/`) passing full test suites under all 4 `.env` combinations (`shared`/`per_tenant` × `subdomain`/`header_path`). | Automated cross-tenant isolation tests pass with zero leaks; `provision_tenant_database` & `migrate_all_tenants` succeed cleanly on fresh PostgreSQL tenants. |
| **M8: Live Liberian Mobile Money & Bulk Ops** | Sprint 8 | Live Lonestar Cell MTN MoMo & Orange Money Liberia adapters + verified webhooks, plus CSV/Excel bulk imports for students, grades, and fee schedules. | Webhook signature verification rejects tampered payloads; valid sandbox callback marks invoice paid and updates Exam Clearance; missing keys fail closed. |
| **M9: Super Admin & Production Readiness** | Sprint 9 | Platform Super Admin Console API, OpenAPI documentation, structured logging, health/readiness checks, daily encrypted PostgreSQL backup scripts, and load/offline QA sign-off. | Backup/restore drill verified on PostgreSQL; P95 latency < 250ms under synthetic load; security checklist & RBAC penetration tests pass. |

---

## 5. External Prerequisites & User-Supplied Accounts / Secrets

This table is consumed by `.agent/skills/master-prompts/SKILL.md` to determine when a story requires manual user action (an account, API key, provider dashboard step, or hosting decision). **Every integration must fail closed when its credentials are missing.**

| Prereq ID | Category | Required For (Sprint / Story) | User Action / Env Variables Needed | Fail-Closed Behavior if Absent |
|---|---|---|---|---|
| **PR-01** | PostgreSQL Database | S1.1, S7.2 | Provision local & staging/prod PostgreSQL 16+ instance with `CREATEDB` privilege (required for `TENANCY_DB_MODE=per_tenant`). Set `DATABASE_URL` and `TENANCY_PG_ADMIN_URL` in backend `.env`. | Django fails startup cleanly if `DATABASE_URL` is missing or non-PostgreSQL. |
| **PR-02** | Redis Broker | S1.1, S4.4, S5.5, S7.2 | Provision Redis 7+ instance and set `REDIS_URL` / `CELERY_BROKER_URL` in backend `.env`. | Readiness check (`/api/ready/`) reports degraded; async tasks raise clear broker-unavailable error. |
| **PR-03** | Hosting Region & Privacy Notice | S1.3, S1.5 | Decide production hosting region (e.g., `eu-west-1` / `af-south-1`) and legal entity name for the Privacy Notice. Set `HOSTING_REGION` and `DATA_CONTROLLER_NAME` in `.env`. | Privacy notice displays explicit unconfigured placeholder warning until set. |
| **PR-04** | Google Sign-In OAuth 2.0 | S1.3 | Create OAuth 2.0 Web Client in Google Cloud Console, configure authorized origins/redirect URIs, and set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` (backend) + `VITE_GOOGLE_CLIENT_ID` (frontend). | Backend `/auth/google/` returns `503 Service Unavailable`; frontend disables Google Sign-In button. |
| **PR-05** | S3-Compatible Object Storage | S2.3, S4.4, S9.3 | Create Cloudflare R2 or AWS S3 private bucket for student photos, PDF report cards/receipts, and encrypted DB backups. Set `STORAGE_BACKEND`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL`. | Falls back to local media only when `DEBUG=True` and `STORAGE_BACKEND=local`; in production fails closed (`ImproperlyConfigured`). |
| **PR-06** | Email SMTP Provider | S1.4, S5.5 | Provision transactional email account (e.g., Resend, Postmark, SendGrid, or SMTP) and verify sender domain. Set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`. | Dev uses console backend when `DEBUG=True`; prod/adapter returns `UNCONFIGURED` status in `NotificationLog`. |
| **PR-07** | SMS Gateway & Sender ID | S5.5 | Choose provider (Africa's Talking or Twilio), fund test credits, and register Liberian alphanumeric Sender ID (e.g., `GOJOINST`). Set `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_USERNAME` / `SMS_ACCOUNT_SID`, `SMS_SENDER_ID`. | Adapter refuses send (`503` / `NotificationLog.status=UNCONFIGURED`) with zero fake delivery logs. |
| **PR-08** | WhatsApp Business Cloud API | S5.5 | Set up Meta WhatsApp Business App, phone number ID, and approved notification templates. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`. | Adapter returns `UNCONFIGURED` and hides WhatsApp channel option until configured. |
| **PR-09** | LLM Provider (AI Assist) | S5.6 | Choose LLM provider (Google Gemini, OpenAI, or Anthropic) and supply API key. Set `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`. | `/ai/assist/` fails closed with `503 Service Unavailable`; UI shows "AI Assist is not configured". |
| **PR-10** | Wildcard DNS & TLS (Subdomain Mode) | S7.3, S9.4 | Configure wildcard DNS (`*.<TENANCY_BASE_DOMAIN>`) and wildcard TLS certificate at hosting/DNS provider; set `TENANCY_BASE_DOMAIN` and `ALLOWED_HOSTS`. | Only needed when `TENANCY_ROUTING_MODE=subdomain`; dev/staging can run fully under `TENANCY_ROUTING_MODE=header_path`. |
| **PR-11** | Lonestar Cell MTN MoMo API | S8.1 | Register merchant Collection API credentials on MTN MoMo Liberia Developer Portal. Set `MTN_MOMO_ENV`, `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_WEBHOOK_SECRET`. | Collection checkout returns `503`; webhook rejects all calls with `503` / `401` (never auto-approves). |
| **PR-12** | Orange Money Liberia API | S8.2 | Register merchant Web Payment API credentials with Orange Money Liberia. Set `ORANGE_MONEY_ENV`, `ORANGE_MONEY_CLIENT_ID`, `ORANGE_MONEY_CLIENT_SECRET`, `ORANGE_MONEY_MERCHANT_KEY`, `ORANGE_MONEY_WEBHOOK_SECRET`. | Collection checkout returns `503`; webhook rejects all calls with `503` / `401`. |
| **PR-13** | Error Tracking (Optional) | S9.2 | Create Sentry project (or compatible DSN) for backend & frontend error monitoring. Set `SENTRY_DSN` and `VITE_SENTRY_DSN`. | Safely no-ops monitoring initialization when unset without affecting app availability. |

---

## 6. Assumptions, Constraints & Risk Register

### 6.1 Key Assumptions & Constraints
- `docs/PRD.md`, `docs/SCOPE.md`, and `docs/BACKLOG.md` remain **byte-identical** across both frontend and backend repositories.
- `demo` (Gojo Institute) and `core` (General Multi-Tenant SMS) strictly respect the import boundary defined in `project-structure` rules (`core` never imports `demo`; `demo` calls `core` only for platform services).
- All UI styling conforms strictly to `UI-template/template1.html`, `frontend-shell`, `frontend-overlays`, and `frontend-composition` rules (no emojis, no native selects/date pickers, reusable components only).
- Database schema modifications are performed strictly via Django migrations — never via direct manual SQL alterations.

### 6.2 Risk Register

| Risk | Severity | Impact | Mitigation |
|---|---|---|---|
| **Intermittent Liberian Internet & Power Outages** | High | Teachers lose attendance/grade entries mid-session; duplicate payment submissions on retry. | Full PWA Offline-First IndexedDB cache + FIFO outbox + server `Idempotency-Key` deduplication + conflict resolution drawer (Sprint 6). |
| **LRD/USD Exchange Rate Volatility** | High | Historical financial reports shift if live FX rates retroactively alter past receipts. | Immutable FX rate snapshot stored on every `PaymentReceipt` and `StudentInvoice` at transaction time; reports sum settled LRD + snapshotted USD. |
| **Per-Tenant Database Migration Drift (`per_tenant` mode)** | High | A tenant DB lags behind code deployments and throws `ProgrammingError`. | Automated `migrate_all_tenants` command recording applied migration version per tenant, pre-flight schema check in readiness/admin panel, and CI tests covering both `shared` and `per_tenant`. |
| **Cross-Tenant Data Leakage (`shared` mode)** | Critical | One school sees another school's students or financial ledger. | Mandatory `TenantScopedModel`, fail-closed `TenantContextError` if tenant context is unset, JWT `tenant_slug` cross-check, and automated negative isolation test suite in Sprint 7. |
| **SMS Wallet Overspend / Abuse** | Medium | Accidental or malicious mass SMS blast exhausts real gateway credit. | Pre-send cost estimation, atomic wallet balance check & deduction inside PostgreSQL transaction, role restriction (Principal/Registrar only), and per-school rate limits. |
| **Offline Financial Double-Charging or Stale Void** | High | Bursar voids a receipt or triggers live MoMo offline leading to split-brain ledger. | Receipt voids and live Mobile Money API checkouts explicitly require online connectivity; manual payment recording requires client-generated `Idempotency-Key`. |
| **Rule File Drift vs. Updated Template** | Low | Older `.agent/rules/frontend-composition.md` text still mentions legacy sample copy (`East Legon, Accra`, `GHS`). | Docs follow `UI-template/template1.html` (`Gojo Institute`, Sinkor & Paynesville, `LRD` + optional `USD`); align rule file copies in Sprint 1 story `S1.5`. |
