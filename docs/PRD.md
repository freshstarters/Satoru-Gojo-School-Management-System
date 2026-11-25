# Product Requirements Document (PRD): Liberian School Management System Platform

**Document Status:** Baseline v1.0
**Target Market:** Liberian K–12 Schools (Early Childhood Education through Grade 12, Ministry of Education & WAEC aligned)
**Repositories:**
- Backend: `/home/demiz/Projects/lib_school_management_system_venv/lib_school_management_system` (Django 6.1 + DRF + PostgreSQL + Redis + Celery)
- Customized Frontend (Gojo School): `/home/demiz/Projects/gojo-school-mgt-sys` (React 19 + TypeScript + Vite + Tailwind CSS + PWA)
- General Multi-Tenant Frontend: Future client targeting `/api/v1/` (no repository path yet)

---

## 1. Executive Summary & Product Vision

### 1.1 Problem Statement
Liberian K–12 schools (private, mission, and community institutions operating from Nursery through Grade 12) largely rely on paper attendance ledgers, disconnected Excel grade sheets, manual carbon-copy receipt books, and ad-hoc WhatsApp/SMS broadcasts. Administrators struggle with:
- Tracking Liberia's **6 Marking Periods and 2 Semester Exams** (0–100 scale, 70% pass mark) alongside **WAEC / WASSCE (Grade 12)** and **LJHSCE (Grade 9)** exam readiness.
- Managing **dual-currency school finances** where tuition and fees are quoted primarily in **Liberian Dollars (LRD)** with optional **US Dollar (USD)** reference conversion and payments arriving via Cash, Bank Deposit Slips (LBDI, Ecobank, UBA, GTBank), Lonestar Cell MTN MoMo, and Orange Money Liberia.
- Enforcing **Bursar Exam Clearance** workflows fairly and transparently before period and semester exams.
- Maintaining operational continuity during **intermittent electricity and unstable mobile/broadband internet** across Monrovia and county campuses.
- Keeping parents informed via SMS/WhatsApp and giving guardians and students self-service access to attendance, grades, report cards, and fee balances.

### 1.2 Product Architecture: Dual-Product Platform (`demo` vs. `core`)
The backend repository serves a **dual-product architecture** on a single Django codebase backed exclusively by **PostgreSQL**:

1. **Gojo School (`demo` Django App — Customized SMS Client)**
   - Mounted exclusively at `/api/demo/v1/`.
   - Serves **Gojo Institute** (Sinkor Main Campus & Paynesville Campus, Monrovia, Liberia; Nursery through Grade 12) via the dedicated React TypeScript frontend in `/home/demiz/Projects/gojo-school-mgt-sys`.
   - Owns its own school-domain models (`students`, `classes`, `attendance`, `timetable`, `grades`, `waec`, `admissions`, `fees`, `library`, `transport`, `announcements`, `sms_wallet`, `campuses`) in the `demo` app on the default PostgreSQL database.
   - Calls `core` **only** for platform services (authentication, Google OAuth, RBAC primitives, audit logging, notification adapters, AI adapter, object storage helpers).
   - Must **never** import `core` school-domain models; `core` must **never** import `demo`.

2. **General Multi-Tenant SMS (`core` Django App — Platform + SaaS SMS)**
   - Mounted exclusively at `/api/v1/`.
   - Provides shared platform services AND a full multi-tenant Liberian School Management System for any school onboarding onto the general SaaS product.
   - Governed by two explicit backend `.env` switches controlling **database isolation** (`TENANCY_DB_MODE=shared|per_tenant`) and **tenant request routing** (`TENANCY_ROUTING_MODE=subdomain|header_path`).
   - Any future customized school app gets its own Django app mounted at `/api/<app-label>/v1/` with the exact same isolation boundary as `demo`.

### 1.3 Liberian School Domain Foundations
- **Campuses:** Multi-campus support per school (e.g., Gojo Main Campus in Sinkor on Tubman Blvd, Paynesville Campus), including campus catchment zone tracking across Greater Monrovia and Liberia's 15 counties.
- **Academic Divisions:**
  - Early Childhood Education (ECE): `Nursery`, `ABC`, `K1`, `K2`
  - Elementary: `Grade 1` through `Grade 6`
  - Junior High: `Grade 7` through `Grade 9` (Grade 9 LJHSCE national exam)
  - Senior High: `Grade 10` through `Grade 12` (Grade 12 WASSCE / WAEC national exam)
- **Academic Calendar:** One Academic Year (e.g., `2026/2027`, September–June) divided into **2 Semesters** and **6 Marking Periods**:
  - Semester 1: `Period 1`, `Period 2`, `Period 3`, plus `Semester 1 Exam`
  - Semester 2: `Period 4`, `Period 5`, `Period 6`, plus `Semester 2 Exam`
- **Daily Bell Schedule:** `1st Period` through `8th Period` daily slots per classroom, with uncovered slot detection and teacher substitution.
- **Currency Standard:** **LRD (Liberian Dollar) primary** across invoices, fee schedules, payment ledgers, and SMS wallets, paired with a top-bar **`+ USD` reference toggle** backed by a school-configured exchange rate (e.g., `1 USD = 192 LRD`). Payments may be tendered in LRD or USD and are normalized into the ledger with an immutable FX rate snapshot.
- **Phone Standard:** Liberian E.164 format `+231` (e.g., `+23177xxxxxxx`, `+23188xxxxxxx`, `+23155xxxxxxx`) normalized on input and used for login, guardian pickup verification, SMS, and WhatsApp.

---

## 2. User Personas & Role-Based Access Control (RBAC)

### 2.1 Personas

| Role Key | Display Title | Scope | Primary Goals |
|---|---|---|---|
| `platform_super_admin` | Platform Super Admin | `core` Platform Only | Provision/suspend tenant schools, monitor per-tenant DB health/migrations, inspect global audit & SMS gateway health, manage tenant plans. |
| `principal` | Principal / Headteacher | Full School (All Campuses) | Morning operational overview, attendance & fee collection trends, WAEC compliance, staff management, academic year/settings governance, approvals, AI briefings. |
| `registrar` | Vice Principal / Registrar | Academic & Enrollment (Assigned or All Campuses) | Admissions pipeline (Inquiry to Enrolled), student records, welfare/pickup & conduct logs, classes & timetables, gradebook oversight, WAEC registration, report cards, transcripts, year-end promotion. |
| `bursar` | Bursar / Finance Officer | Financial Operations (Assigned or All Campuses) | Fee schedules (Tuition, Registration & ID, Uniform & Books, WAEC/PTA), student invoices, LRD/USD payment recording, receipts, receipt voiding with audit trail, Exam Clearance flags, SMS Wallet top-ups. |
| `teacher` | Classroom / Subject Teacher | Own Assigned Classes & Subjects | Daily attendance roll call, 6-period + semester exam score entry, conduct & homeroom notes, viewing own weekly timetable & substitute duties, messaging guardians of assigned students. |
| `support_staff` | Support Staff (Librarian / Transport Coordinator) | Assigned Operational Module | Manage Library & Textbooks catalog/issuance/returns and/or School Bus Routes, driver assignments, and student route rosters. |
| `parent` | Parent / Guardian | Linked Children Only | View children's daily attendance, period/semester grades, downloadable PDF report cards, WAEC status, LRD/USD invoices & receipts, exam clearance status, school announcements, and SMS consent preferences. |
| `student` | Student | Self Only | View own weekly timetable, attendance record, period/semester grades, downloadable report cards, borrowed library books, assigned bus route, and school announcements. |

### 2.2 Permission Matrix

Legend: `CRUD` = Create/Read/Update/Delete, `CRU` = Create/Read/Update, `R` = Read, `R(own)` = Read scoped to assigned classes/children/self, `RW(own)` = Read/Write scoped to own classes/records, `—` = Denied (`403 Forbidden`).

| Module / Capability | Super Admin (`core`) | Principal | Registrar | Bursar | Teacher | Support Staff | Parent | Student |
|---|---|---|---|---|---|---|---|---|
| Tenant Provisioning & DB Ops (`core`) | CRUD | — | — | — | — | — | — | — |
| Principal Dashboard & Campus Analytics | R (platform) | R | R (academic) | R (finance) | R(own) | R(own) | — | — |
| Students Directory & Inspector | — | CRUD | CRUD | R (finance tab) | R(own) + Notes | R (route/lib) | R(own) | R(self) |
| Admissions Pipeline (Kanban + Table) | — | CRUD | CRUD | R | — | — | — | — |
| Fee Schedule, Invoices, Payments, Voids | — | R + Approve Void | R (clearance) | CRUD | — | — | R(own) + Pay* | — |
| Classes, Subjects & Weekly Timetable | — | CRUD | CRUD | R | R(own) | — | R(own) | R(self) |
| Daily Attendance Register | — | CRUD | CRUD | — | RW(own) | — | R(own) | R(self) |
| Gradebook (P1–P6 + Sem Exams) & Lock | — | CRUD + Lock | CRUD + Lock | — | RW(own) | — | R(own) | R(self) |
| WAEC / WASSCE & LJHSCE Tracker | — | CRUD | CRUD | RW (exam fee) | R(own) | — | R(own) | R(self) |
| Report Cards, Transcripts & Promotion | — | CRUD | CRUD | — | R(own) | — | R(own PDF) | R(self PDF) |
| Teachers & Staff Directory | — | CRUD | R | R | R (colleagues) | R | — | — |
| Parents & Guardians Directory | — | CRUD | CRUD | R | R(own) | R (pickup) | RW(self profile) | — |
| Library & Textbooks | — | CRUD | R | — | R | CRUD (Lib) | R(own) | R(self) |
| School Bus Routes | — | CRUD | R | — | R | CRUD (Trans) | R(own) | R(self) |
| Announcements & Parent SMS / Wallet | — | CRUD + TopUp | CRU | TopUp + R | R (draft) | R | R (targeted) | R (targeted) |
| AI Assist | — | R (all) | R (academic) | R (finance) | R(own) | — | — | — |
| School Settings & FX Rate | — | CRUD | R | RW (FX/fees) | — | — | — | — |
| Audit Log Drawer | R (all) | R (school) | R (academic) | R (finance) | — | — | — | — |

*\*Online MoMo/Orange Money payment initiation for Parents is enabled in Sprint 8.*

---

## 3. Multi-Tenancy & `.env` Configuration Specification (`core`)

### 3.1 Database Engine Policy
- **PostgreSQL ONLY** in all environments (local development, CI/test, staging, and production). SQLite is not permitted because PostgreSQL-specific capabilities (transactional DDL, per-tenant database creation, `JSONB`, partial unique indexes, full-text search, advisory locks, and row-level constraints) are required for parity.

### 3.2 Backend `.env` Multi-Tenancy Switches

Two required environment variables govern `core` multi-tenancy behavior in `lib_school_management_system/settings.py`:

1. **`TENANCY_DB_MODE`** — Allowed values: `shared` | `per_tenant` (default: `shared`; invalid value fails startup with `ImproperlyConfigured`).
   - **`shared` (Central Database Mode):**
     - All `core` tenants share the central `default` PostgreSQL database.
     - Every tenant-owned model in `core` inherits from `TenantScopedModel`, enforcing a non-nullable `school` (`ForeignKey(TenantSchool, on_delete=models.PROTECT, db_index=True)`).
     - A custom `TenantManager` + thread/contextvar-local `current_tenant` automatically filters every queryset by `school=current_tenant` and rejects cross-tenant foreign-key references at both serializer and model `clean()`/`save()` levels.
     - Queries outside a resolved tenant context (except explicitly marked platform-admin operations) fail closed with `TenantContextError`.
   - **`per_tenant` (Database-Per-Tenant Mode):**
     - The central `default` PostgreSQL database stores only platform metadata: `TenantSchool` registry (slug, domain, db_name, db_alias, status, schema_version, encrypted DB credentials/connection config), `PlatformUser` / global auth index, and platform audit logs.
     - Each onboarded school gets a dedicated physical PostgreSQL database (`sms_tenant_<slug>`).
     - A custom Django `TenantDatabaseRouter` routes all `core` school-domain reads, writes, relations, and migrations to the active request's tenant DB alias dynamically registered in `django.db.connections`.
     - Tenant provisioning runs via an idempotent Celery task (`provision_tenant_database`) that creates the PostgreSQL database, verifies connectivity, runs `migrate --database=<alias>` for `core` tenant apps, seeds baseline Liberian divisions/subjects/roles, and marks the tenant `ACTIVE`.
     - A management command `python manage.py migrate_all_tenants` migrates all active tenant databases safely with per-tenant transaction logging and failure isolation.

2. **`TENANCY_ROUTING_MODE`** — Allowed values: `subdomain` | `header_path` (default: `header_path` in local dev, `subdomain` in production; invalid value fails startup with `ImproperlyConfigured`).
   - **`subdomain` Mode:**
     - `TenantResolutionMiddleware` inspects the HTTP `Host` header against `TENANCY_BASE_DOMAIN` (e.g., `gosms.lr`).
     - `gojo.gosms.lr` resolves `tenant_slug = "gojo"`. Reserved subdomains (`www`, `api`, `admin`, `platform`) route exclusively to platform super-admin endpoints and never match a school tenant.
     - Requests to an unknown, suspended, or provisioning subdomain fail closed with HTTP `404` (unknown) or `403` (suspended).
     - Authenticated JWT tokens MUST carry a matching `tenant_slug` claim; any mismatch between subdomain and JWT `tenant_slug` returns `403 Forbidden` and logs a security audit event.
   - **`header_path` Mode:**
     - Subdomain parsing is bypassed so the platform can run on a single host/IP without wildcard DNS or wildcard TLS.
     - `TenantResolutionMiddleware` resolves the tenant from the `X-Tenant-Slug` request header (and validates it against the authenticated user's JWT `tenant_slug` claim; if unauthenticated on public/login routes, `X-Tenant-Slug` is required).
     - Missing, unknown, or mismatched `X-Tenant-Slug` fails closed with HTTP `400`/`403`/`404`.

### 3.3 Boundary for `demo` (Gojo School)
- Requests to `/api/demo/v1/*` bypass `core` tenant resolution and always route to the `demo` Django app on the `default` PostgreSQL database.
- `demo` reuses `core` platform auth/JWT/RBAC/audit/notification/AI services, with JWT claims tagged `app_scope="demo"` so a `demo` token can never authenticate against `/api/v1/` and a `core` tenant token can never authenticate against `/api/demo/v1/`.

---

## 4. Functional Requirements & Acceptance Criteria

All acceptance criteria are uniquely numbered (`AC-01` through `AC-84`) so `docs/BACKLOG.md` stories and `master-prompts` can reference them verbatim.

### 4.1 Platform Authentication, Google Sign-In, Invites & RBAC
- **AC-01 (JWT + Cookie Auth):** Users authenticate via `POST /api/<scope>/v1/auth/login/` using either email address or Liberian phone number (`+231...`) + password. The API issues a short-lived JWT access token (15 min) in the JSON body and sets an `HttpOnly`, `SameSite=Lax`, `Secure` (in prod) refresh token cookie (7 days) with refresh token rotation and blacklist on logout. The browser client is same-site with the API, sends credentials on each request, and copies the CSRF token from `GET /auth/config/` into the `X-CSRFToken` header. The access token stays in memory.
- **AC-02 (Google Sign-In OAuth 2.0 / OIDC):** Users can sign in with Google (`POST /api/<scope>/v1/auth/google/`) by exchanging a verified Google ID token. The backend verifies token signature, issuer, audience (`GOOGLE_OAUTH_CLIENT_ID`), and `email_verified=true`, matching an existing invited/active user account by email. If `GOOGLE_OAUTH_CLIENT_ID` or `GOOGLE_OAUTH_CLIENT_SECRET` is unset, the endpoint fails closed with `503 Service Unavailable` and the UI disables/hides the Google button cleanly.
- **AC-03 (Invite-Only Account Activation):** Staff, Parents, and Students cannot self-register. Admins (Principal/Registrar/Super Admin) issue time-limited (72h), single-use cryptographic invite tokens delivered via Email or SMS. Activating an invite sets a password (or binds Google Sign-In) and marks the account active.
- **AC-04 (Password Reset & Session Revocation):** Users can request a password reset via Email or a Liberian phone number. A phone number that matches an active account emails the reset link to that account's email address. The response sentence is the same when no message is sent. When the SMS gateway is configured, a phone reset also sends the link by SMS, and a missing gateway does not stop the email. Completing a reset revokes all active refresh tokens for that user. A signed-in user can review the sessions listed for this browser and revoke one session without resetting the password.
- **AC-05 (Strict Server-Side RBAC & Campus/Class Scoping):** Every API endpoint enforces role permissions per Section 2.2. Teachers receive only classes, students, grades, and attendance for their assigned sections; Parents receive only their linked children; Students receive only their own records. Frontend role UI hides unauthorized tabs, and direct API calls return `403 Forbidden`.
- **AC-06 (App Scope & Tenant Isolation):** Tokens issued for `demo` carry `app_scope="demo"` and are rejected on `/api/v1/`; tokens issued for a `core` tenant carry `app_scope="core"` and `tenant_slug` and are rejected on `/api/demo/v1/` or any other tenant.
- **AC-07 (Privacy Notice & Consent):** The login and settings views display a link to the school/platform Privacy Notice naming the configured hosting region (`HOSTING_REGION`), data controller, and guardian SMS consent rights.

### 4.2 Multi-Tenancy Engine (`core` `.env` Switches)
- **AC-08 (Environment Switch Validation):** Setting `TENANCY_DB_MODE` to any value outside `{shared, per_tenant}` or `TENANCY_ROUTING_MODE` outside `{subdomain, header_path}` raises `ImproperlyConfigured` on startup.
- **AC-09 (Shared PostgreSQL Isolation):** Under `TENANCY_DB_MODE=shared`, automated integration tests prove Tenant A cannot read, update, delete, or reference any record belonging to Tenant B across all `core` endpoints, even by guessing UUIDs/IDs.
- **AC-10 (Per-Tenant PostgreSQL Provisioning & Routing):** Under `TENANCY_DB_MODE=per_tenant`, creating a new `TenantSchool` triggers `provision_tenant_database`, creating a dedicated PostgreSQL database, running all tenant migrations, seeding default Liberian divisions/subjects, and routing all subsequent requests for that tenant exclusively to its database.
- **AC-11 (Subdomain Routing Mode):** Under `TENANCY_ROUTING_MODE=subdomain`, requests to `<slug>.<TENANCY_BASE_DOMAIN>` resolve the matching tenant; unknown slugs return `404`; suspended tenants return `403`; reserved platform subdomains route only to Super Admin endpoints.
- **AC-12 (Header Routing Mode):** Under `TENANCY_ROUTING_MODE=header_path`, requests resolve the tenant from `X-Tenant-Slug` (cross-checked against JWT `tenant_slug`), with missing/mismatched headers returning `400`/`403`.
- **AC-13 (Fleet Migration Command):** Running `python manage.py migrate_all_tenants` in `per_tenant` mode applies pending Django migrations across all active tenant databases, records the applied migration hash/timestamp per tenant, and isolates errors without halting unrelated tenants.

### 4.3 Design System, Frontend Shell & Global Search
- **AC-14 (Visual Fidelity to `template1.html`):** The React frontend implements the exact design tokens (`--bg-canvas`, `--bg-surface`, `--bg-subtle`, `--bg-modal`, `--bg-inset`, `--brand-primary`, `--text-primary`, badge tokens), light/dark `data-theme`, `data-accent` (`blue`, `slate`, `emerald`, `indigo`), `data-font` (`inter`, etc.), collapsible `.floating-sidebar`, `.floating-topbar`, `.subtab-bar` with `.tab-glide`, frosted `.crm-card` & `.btn-secondary`, and `--bg-modal` dialogs. No native `<select>` or `<input type="date">` pickers; reusable `Button`, `Card`, `Modal`, `Drawer`, `Subtabs`, `Select`, `DatePicker`, `DateTimePicker`, `Badge`, `Toast`, and `ConfirmDialog` components own all styling. Zero emojis in UI or codebase. Each workspace pane has its own address, and refreshing the app reopens that same pane. The selected Settings section, Classes subtab, and open inspector subtab are part of that address, so a refresh reopens them. Directory search, campus, division, grade, section, status, and page are part of that address, so a refresh restores them. A right-click on a directory row offers Open Inspector, Copy Record ID, and Log Quick Note.
- **AC-15 (Topbar Currency Reference Toggle):** The topbar includes an `LRD` / `+ USD` toggle button that persists user preference and conditionally displays tabular USD equivalents (`≈ USD X,XXX.XX`) alongside LRD figures across Dashboard, Students, and Fees screens using the school's active exchange rate.
- **AC-16 (Global Search):** Typing in the topbar search input (shortcut `/` or `Cmd/Ctrl+K`) queries students, guardians, LRD receipts, classes, teachers, and library books (filtered by user role) and opens the matching inspector drawer or navigates directly to the target pane.
- **AC-17 (Empty & Error States):** Every wired screen uses `/api/demo/v1/` (never falling back to fixture data on empty or failed responses) and renders clean template empty lines (`text-xs text-sub`) and actionable error banners.

### 4.4 Multi-Campus School Setup & Settings
- **AC-18 (School & Multi-Campus Profile):** Principal can configure School Name (e.g., `Gojo Institute`), MoE Registration Code, Academic Year (`2026/2027`), Active Marking Period (`Period 1`–`Period 6`), and manage multiple Campuses (e.g., `Sinkor Main Campus`, `Paynesville Campus`, address, catchment zone, grades served, campus lead).
- **AC-19 (Configurable Academic & Currency Rules):** Principal/Bursar can configure the school's LRD-to-USD reference exchange rate (e.g., `1 USD = 192 LRD`), passing grade threshold (default `70%`), marking period vs. semester exam weighting (default `60%` marking periods / `40%` semester exam, or standard Liberian `(P1+P2+P3)/3 * 0.5 + SemExam * 0.5` — configurable formula weights summing to 100%), and honor roll threshold (default `85%`).
- **AC-20 (Notification & Integration Status Panel):** Settings displays live configuration health (configured vs. unconfigured/disabled) for Email SMTP, SMS Gateway + Sender ID (e.g., `GOJOINST`), WhatsApp Business API, Google Sign-In, AI Assist, and Mobile Money providers without ever exposing raw secrets to the browser.

### 4.5 Principal Dashboard & Analytics
- **AC-21 (Role-Aware KPI Cards):** Dashboard displays live, tabular KPI cards: Total Active Enrollment (with campus split), Today's Attendance Rate (%), Tuition Collected vs. Outstanding (LRD + optional USD), and Open Admissions / WAEC Ready Candidates.
- **AC-22 (Academic vs. Collection Combo Chart):** Interactive chart with `Sem 1` / `P1–P6` / `WAEC` subtabs visualizing Liberian marking period attendance rate against LRD fee collection rate (or WAEC readiness metrics).
- **AC-23 (LRD Collections Cashflow Card):** Displays total collected revenue with `Week` / `Month` / `Term` subtabs, breakdown by method (Lonestar MTN MoMo, Orange Money, Bank Deposit, Cash), and USD reference equivalent.
- **AC-24 (Principal Action Items & WAEC Compliance Alerts):** Highlights urgent actionable items: uncovered timetable bell slots today, WAEC candidates with unpaid exam registration fees or missing documents, overdue invoices blocking exam clearance, and recent audit activity ticker.
- **AC-25 (Campus Catchment Distribution):** Interactive campus/catchment breakdown showing student enrollment distribution by Monrovia/county catchment zones (e.g., Sinkor & Central, Paynesville, Congo Town, Bushrod Island) with click-to-filter support.

### 4.6 Students Directory, Inspector, Welfare & Conduct
- **AC-26 (Students Directory & Filters):** Searchable, paginated table of students filterable by Campus, Division (`Early Childhood`, `Elementary`, `Junior High`, `Senior High`), Grade/Section, and Status (`Active`, `Honor Roll`, `At Risk`, `WAEC Candidate`, `Withdrawn`, `Graduated`), displaying Division & Grade, Primary Guardian, Attendance %, Yearly Avg %, and Exam Clearance badge.
- **AC-27 (Enroll Student & ID Generation):** Registrar/Principal can enroll a student directly (or via Admissions conversion), automatically generating a unique school student ID (e.g., `GI-2026-0142`), linking one or more Guardians, assigning Campus and Classroom, and auto-generating the applicable annual Fee Invoice.
- **AC-28 (Multi-Tab Student Inspector Drawer):** Clicking a student opens the frosted right-hand inspector (`min(100%, 32rem)`) with three subtabs:
  1. **Profile & Academics:** Attendance %, Yearly Avg, LRD Balance summary tiles, editable demographics, division/grade assignment, and WAEC candidate toggle (for Grade 9 / Grade 12).
  2. **Welfare & Pickup:** Medical conditions, allergies, blood group, emergency contact, and Authorized Pickup Persons list (name, relationship, `+231` phone, ID verification note).
  3. **Conduct & Notes:** Chronological log of behavioral incidents, commendations/merits, disciplinary actions, and teacher homeroom notes with author and timestamp.
  The open inspector has its own address, so a refresh or a shared link opens that same student.

### 4.7 Admissions Pipeline (Kanban + Table)
- **AC-29 (5-Stage Admissions Pipeline):** Supports both **Kanban Board** and **Table** subtabs across 5 Liberian admissions stages: `Inquiry`, `Application Submitted`, `Placement Test`, `Accepted`, and `Enrolled` (plus `Declined/Waitlisted` archive status).
- **AC-30 (Applicant Capture & Stage Transition):** Registrar/Principal can create new applicants (prospective student details, target campus & grade Nursery–Grade 12, guardian name & `+231` phone, previous school, placement test score & notes) and move applicants between stages via drag-and-drop or stage selector.
- **AC-31 (One-Click Convert to Enrolled Student):** Moving an applicant to `Enrolled` (or clicking `Enroll Applicant`) atomically creates the `Student` record, creates or links the `Guardian` record, assigns the target classroom, generates the initial tuition/registration invoice, and records an audit entry.

### 4.8 Classes, MoE Subjects & Weekly Timetable
- **AC-32 (Classrooms & Subject Allocation):** Manage classrooms per campus and academic year (e.g., `Nursery A`, `Grade 6A`, `Grade 12 Science`), homeroom teacher, room capacity, and Liberia MoE core + elective subjects (Mathematics, English Language, General Science, Physics, Chemistry, Biology, Social Studies, Liberian History, Literature, Economics, French, Computer Science, WAEC Practical Labs) with assigned subject teachers.
- **AC-33 (Weekly 8-Period Timetable):** Interactive Monday–Friday × `1st Period` through `8th Period` timetable grid per classroom and per teacher. Prevents double-booking a teacher or room in the same day/period slot (`400 Bad Request` with conflict details).
- **AC-34 (Uncovered Bell Slot Detection & Substitution):** Identifies any bell slot where the assigned teacher is absent/unassigned for the day and allows Principal/Registrar to assign a substitute teacher for that date, logging the substitution and updating the dashboard count.

### 4.9 Daily Attendance Register
- **AC-35 (Fast Classroom Roll Call):** Teachers (for assigned classes) and Registrar/Principal (for all classes) select Campus, Classroom, and Date to mark every student as `Present`, `Late`, `Absent`, or `Excused` with optional remarks, plus a one-click `Mark All Present` helper.
- **AC-36 (Attendance Rollups & Absence Alerts):** Automatically computes per-student attendance percentage (by marking period and academic year) and daily campus attendance rate. When a student is marked `Absent` (unexcused) and their guardian has SMS/WhatsApp consent enabled, an asynchronous absence notification can be dispatched (configurable auto or manual trigger).

### 4.10 Liberian 6-Period / 2-Semester Gradebook, WAEC Tracker & Report Cards
- **AC-37 (6-Period + 2-Semester Gradebook):** For each classroom and subject, teachers enter numeric scores (`0–100`) for `Period 1`, `Period 2`, `Period 3`, `Semester 1 Exam`, `Period 4`, `Period 5`, `Period 6`, and `Semester 2 Exam`.
- **AC-38 (Automatic Liberian Calculations):** Backend deterministically calculates:
  - `Semester 1 Average` (configured weighted combination of P1, P2, P3 and Sem 1 Exam)
  - `Semester 2 Average` (configured weighted combination of P4, P5, P6 and Sem 2 Exam)
  - `Yearly Subject Average` (`(Sem 1 Avg + Sem 2 Avg) / 2`)
  - `Student Overall Average`, `Class Rank`, and `Status` (`Honor Roll` >= honor threshold, `Pass` >= 70%, `Fail` < 70%).
- **AC-39 (Period Locking & Grade Audit):** Principal/Registrar can lock a marking period or semester once report cards are finalized. Locked scores cannot be edited by teachers without an admin unlock, and every score modification records old value, new value, actor, and timestamp in the Audit Log.
- **AC-40 (WAEC / WASSCE & Grade 9 LJHSCE Readiness Tracker):** Dedicated `WAEC / WASSCE Tracker` subtab listing all Grade 9 (LJHSCE) and Grade 12 (WASSCE) candidates with WAEC candidate number, registered subjects, practical lab completion, mock exam average, WAEC exam fee payment status (synced with Fees), and overall readiness badge (`Ready`, `Fee Pending`, `At Risk`). The bursar opens Grades & WAEC on this subtab, can update exam-fee status, and does not see the gradebook.
- **AC-41 (Printable PDF Report Cards, Grade Sheets & Senior High Transcripts):** Generates branded, downloadable PDF documents (stored in S3/R2 or streamed on demand) for:
  - Individual Period / Semester / Annual Liberian Report Cards (with Principal/Homeroom signature blocks, attendance summary, conduct remarks, and grading legend).
  - Bulk class report card ZIP/PDF generation via Celery background job.
  - Official Senior High Cumulative Transcript (Grades 10–12) for university/WAEC applications.
  - Class Grade Sheet CSV/PDF export for MoE inspection.
- **AC-42 (Automated Year-End Promotion / Retention Workflow):** At the end of an academic year, Registrar/Principal runs a Promotion Preview that classifies each student (`Promoted`, `Probation / Summer School`, `Retained`, `Graduated` for Grade 12) based on configurable pass rules (default: Yearly Average >= 70% and core Math/English pass), supports manual Principal overrides with written reason, and executes batch enrollment into the next Academic Year's grade levels.

### 4.11 Tuition, Dual-Currency LRD/USD Fees, Receipts & Exam Clearance
- **AC-43 (Itemized Fee Schedule):** Bursar/Principal configures annual/term fee schedules per Division and Campus broken down by line item: `Tuition`, `Registration & ID`, `Uniform & Books`, `WAEC / Exam Fee`, and `PTA / Activity Fee`, priced in LRD (with optional USD equivalent).
- **AC-44 (Student Invoices & Partial Payments):** Each student has itemized invoices per academic year/semester tracking `Total LRD`, `Paid LRD`, `Balance LRD`, `Payment Progress %`, and `Status` (`Paid`, `Partial`, `Overdue`, `Waived`). Supports discounts/scholarships with reason notes.
- **AC-45 (Dual-Currency Payment Recording & Receipts):** Bursar records payments in either **LRD** or **USD** via `Cash`, `Bank Deposit Slip` (bank name + slip number), `Lonestar Cell MTN MoMo` (transaction ID), or `Orange Money Liberia` (transaction ID). If tendered in USD, the backend converts to LRD using the active (or explicitly overridden) exchange rate and stores `tendered_currency`, `tendered_amount`, `fx_rate_lrd_per_usd`, and `settled_amount_lrd` immutably. Generates sequential receipt IDs (e.g., `RCP-2026-00901`) and printable PDF receipts.
- **AC-46 (Destructive Receipt Voiding):** Receipts can never be hard-deleted. Voiding a receipt requires Bursar/Principal confirmation modal (`destructive: true`) and a mandatory reason, marks the receipt `VOIDED`, reverses the ledger balance cleanly, and writes a high-priority Audit Log entry.
- **AC-47 (Exam Clearance Engine):** Automatically evaluates each student's `Exam Clearance` status (`Cleared`, `Conditional`, `Hold`) against configurable payment progress thresholds per marking period/semester (e.g., >= 50% paid for Sem 1 Exams, 100% paid for Sem 2/Final Exams), while allowing Bursar/Principal to issue a time-bound `Manual Clearance Override` (e.g., approved payment plan) with audit trail.
- **AC-48 (Live MTN MoMo & Orange Money Webhooks — Sprint 8):** Pluggable payment gateway adapters for Lonestar Cell MTN MoMo Collection API and Orange Money Liberia Web Payment API. Parents/Bursars can initiate a mobile money collection request; signed/verified webhook callbacks automatically create a confirmed payment receipt, update invoice balance & exam clearance, and send an SMS receipt. Missing API keys fail closed (`503`) with zero mock bypass.

### 4.12 Teachers/Staff & Parents/Guardians Directories
- **AC-49 (Teachers & Staff Directory + Inspector):** Manage staff profiles (full name, staff ID, role, campus, qualifications, `+231` phone, email, assigned subjects/homerooms, employment status) with inspector drawer editing, invite dispatch, and soft-deactivation (preserving historical grade/attendance attribution).
- **AC-50 (Parents & Guardians Directory + Inspector):** Manage guardian profiles (full name, relationship, `+231` phone, WhatsApp number, email, residential zone, occupation, `sms_consent` opt-in/opt-out flag, linked children, portal account status). One guardian can link to multiple siblings across divisions, with consolidated family balance visibility. A linked child in the guardian inspector opens that student's inspector.

### 4.13 Library & Textbooks
- **AC-51 (Book & Textbook Catalog):** Librarian/Principal manages catalog records (ISBN/code, title, author, subject/grade level, campus, total copies, available copies, shelf location).
- **AC-52 (Issue, Return & Overdue Tracking):** Issue copies to Students or Teachers with a due date; decrement/increment available copies transactionally (preventing issuance when `available_copies == 0`); flag overdue items and surface them in the Student Inspector and Student Portal.

### 4.14 School Bus Routes (Transport)
- **AC-53 (Bus Routes & Campus Assignments):** Transport Coordinator/Principal manages bus routes per campus (route code/name, e.g., `Sinkor–Tubman Blvd Express`, `Paynesville–Red Light Shuttle`, vehicle plate, seat capacity, driver name & `+231` phone, conductor/attendant name, ordered pickup/drop-off stops with times).
- **AC-54 (Student Route Rosters):** Assign students to routes and specific pickup stops, enforcing capacity warnings and exposing route/stop details on the Student Inspector, Parent Portal, and Student Portal.

### 4.15 Announcements, Multi-Channel Notifications & SMS Wallet
- **AC-55 (Announcements Management):** Principal/Registrar can draft, schedule, publish, edit, and archive announcements targeted by Audience (`All Campus`, `Parents Only`, `Teachers Only`, `Students Only`, specific `Campus`, specific `Division/Grade`, or `WAEC Candidates`).
- **AC-56 (Multi-Channel Notification Adapters):** Pluggable Celery-backed dispatchers for:
  - **Email** (SMTP / transactional provider)
  - **SMS** (Africa's Talking or Twilio with school Sender ID e.g. `GOJOINST`, respecting guardian `sms_consent`)
  - **WhatsApp Business Cloud API** (template notifications)
  All providers fail closed when environment credentials are absent, recording delivery status (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `UNCONFIGURED`) in a `NotificationLog`.
- **AC-57 (School SMS Wallet & Top-Up Ledger):** Tracks each school's SMS credit balance in LRD (displayed in the sidebar footer and Announcements pane), deducts estimated/actual per-SMS cost on broadcast dispatch, blocks SMS sends when balance is insufficient (unless overridden by platform credit), and supports Bursar/Principal top-up logging with wallet ledger history.

### 4.16 Parent/Guardian Portal & Student Portal
- **AC-58 (Parent/Guardian Portal):** Authenticated guardians see a streamlined portal scoped strictly to their linked children (with child switcher for families with multiple children):
  - Daily attendance summary & absence history
  - Marking period & semester grades + downloadable PDF Report Cards
  - WAEC readiness status (for Grade 9 / Grade 12 children)
  - LRD/USD fee invoices, payment receipts (PDF), Exam Clearance badge, and (Sprint 8) Pay via MTN MoMo / Orange Money
  - School announcements & SMS/WhatsApp consent toggle
  - Submit/track Parent Inquiries (billing, welfare, academic) directed to Principal/Registrar/Bursar.
- **AC-59 (Student Portal):** Authenticated students see a read-only portal scoped strictly to themselves:
  - Weekly 8-period class timetable
  - Attendance record
  - Period/Semester grades & downloadable PDF Report Cards (once published)
  - Borrowed library books & due dates
  - Assigned school bus route & stops
  - School announcements.

### 4.17 AI Assist (Fail-Closed LLM Adapter)
- **AC-60 (Context-Grounded School AI Assist):** Accessible from the Principal Dashboard quick query bar and the topbar `AI Assist` modal. Supports role-scoped actions:
  - Daily School Briefing (attendance anomalies, uncovered bell slots, WAEC deadlines, overdue fee summary)
  - Draft Parent Notice / SMS (concise Liberian school tone, character-count aware for SMS)
  - Grade & At-Risk Student Summary (highlighting students below 70% pass mark or with high absenteeism)
- **AC-61 (Fail-Closed & Privacy Guardrails):** Calls a configured LLM provider adapter (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`). When `AI_API_KEY` is unset, the endpoint returns `503 Service Unavailable` with a clear configuration message (no hardcoded fake AI responses). Prompts never leak cross-tenant data or raw sensitive credentials; all AI queries are logged with actor, role, and token count.

### 4.18 Audit Trail & Compliance
- **AC-62 (Immutable Audit Log & Drawer):** Every sensitive write action (login/logout, failed sign-in, tenant mismatch, role change, grade edit/unlock, payment recorded/voided, exam clearance override, admission conversion, receipt void, attendance edit after lock, tenant provisioning) writes an immutable `AuditEvent` (`actor`, `role`, `campus`, `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `ip_address`, `created_at`). The slide-over Audit Drawer (`36rem` frosted panel) lets authorized admins filter by actor, module, and date range.

### 4.19 Full PWA Offline-First Mode (IndexedDB Sync Engine)
- **AC-63 (Installable PWA & App Shell Caching):** Frontend registers a Workbox/Service Worker with a valid Web App Manifest (`Gojo Institute`, standalone display, icons, theme colors). Static assets and the full application shell load reliably with zero network connectivity.
- **AC-64 (IndexedDB Read Cache Across All Screens):** Every wired screen caches normalized API responses in IndexedDB (keyed by user ID, app scope/tenant, and resource collection) so navigating across Dashboard, Students, Admissions, Fees, Classes, Attendance, Grades, Teachers, Parents, Library, Transport, Announcements, and Portals renders cached data immediately while offline, displaying a subtle online/offline status pill and last-synced timestamp.
- **AC-65 (Offline Mutation Outbox & Idempotent Sync):** Any create/update/delete performed offline (e.g., marking daily attendance, entering Period 2 grades, issuing a library book, logging conduct notes, drafting an announcement) is written optimistically to IndexedDB and enqueued in a persistent `sync_outbox` with a client-generated UUID `Idempotency-Key` and `base_updated_at` timestamp. When connectivity returns, the sync engine drains the outbox in FIFO dependency order.
- **AC-66 (Server Idempotency & Conflict Resolution):** All mutating backend endpoints honor the `Idempotency-Key` header (preventing duplicate payments, duplicate students, or duplicate attendance rows on retries) and enforce optimistic concurrency via `If-Unmatched-Since` / `updated_at` checks. If a server conflict (`409 Conflict`) occurs (e.g., two staff edited the same student score offline), the UI surfaces a dedicated Conflict Resolution Drawer allowing the user to inspect Server vs. Local values and choose `Keep Server`, `Keep Mine`, or `Merge`.
- **AC-67 (Offline Security Guardrails):** Destructive financial voids (`VOID receipt`) and live external Mobile Money API checkouts require an active online connection (gracefully blocked offline with clear explanation). Logging out immediately wipes all user-scoped IndexedDB caches and outbox entries so shared school computers never leak student data.

### 4.20 General Multi-Tenant SMS Onboarding & Super Admin Console (`core`)
- **AC-68 (Full School Domain Parity in `core`):** All school domain modules built and validated in `demo` (Multi-Campus, Students, Admissions, Dual-Currency Fees, Classes/Timetable, Attendance, 6-Period Gradebook, WAEC Tracker, Report Cards, Promotion, Teachers, Parents, Library, Transport, Announcements/SMS Wallet, Portals) are implemented cleanly in `core` with `TenantScopedModel` and dual DB/routing mode compatibility.
- **AC-69 (Platform Super Admin Console API):** Super Admins can create/onboard new schools (setting slug, name, counties/campuses, initial Principal invite, currency default, and DB alias), suspend/reactivate schools, view per-tenant storage/DB migration status, inspect global notification delivery health, and trigger manual tenant DB migrations.

---

## 5. Data Model & Domain Architecture Overview

### 5.1 Backend App & Layer Structure
Per project structure rules:
- `lib_school_management_system/`: `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`, `celery.py` only.
- `core/`:
  - `models/`: `platform.py` (`User`, `RoleMembership`, `InviteToken`, `AuditEvent`, `NotificationLog`, `TenantSchool`), plus `school/` domain models for the General Multi-Tenant SMS (`Campus`, `AcademicYear`, `MarkingPeriod`, `Division`, `Classroom`, `Subject`, `TimetableSlot`, `TeacherSubstitution`, `Guardian`, `Student`, `StudentWelfare`, `ConductNote`, `AdmissionApplicant`, `AttendanceRecord`, `GradeEntry`, `WaecCandidate`, `FeeSchedule`, `StudentInvoice`, `PaymentReceipt`, `ExamClearance`, `LibraryBook`, `LibraryLoan`, `BusRoute`, `BusStop`, `StudentBusAssignment`, `Announcement`, `SmsWallet`, `SmsWalletTransaction`, `ParentInquiry`, `IdempotencyRecord`).
  - `tenancy/`: `config.py` (`.env` validators), `context.py` (contextvars), `middleware.py`, `router.py` (PostgreSQL DB router), `provisioning.py`.
  - `service/`, `views/`, `integrations/` (`google_oauth.py`, `email_adapter.py`, `sms_adapter.py`, `whatsapp_adapter.py`, `ai_adapter.py`, `mtn_momo.py`, `orange_money.py`, `storage.py`), `helpers/`, `tests/`.
- `demo/`:
  - Mirrors the school domain for **Gojo Institute** under `/api/demo/v1/` with its own `models/`, `service/`, `views/`, `helpers/`, `tests/`.
  - Imports **only** platform services from `core` (Auth, RBAC decorators, Audit writer, Notification adapters, AI adapter, PDF/Storage helpers, Idempotency helper).

### 5.2 Key Database Design Rules
- Every primary key is a UUID (`UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`) to support safe offline client generation and prevent ID enumeration.
- All mutable records include `created_at`, `updated_at`, `created_by`, `updated_by`, and soft-delete (`archived_at`) where historical integrity is required.
- Financial amounts use `DecimalField(max_digits=14, decimal_places=2)` — never floats.
- Exchange rates use `DecimalField(max_digits=10, decimal_places=4)`.
- All phone fields store normalized E.164 strings (`+231...`) validated by a shared Liberian phone validator.

---

## 6. API Surface & Contract Conventions

### 6.1 Base Prefixes
- Gojo School Customized Client: `/api/demo/v1/...`
- General Multi-Tenant SMS Client: `/api/v1/...`
- Platform Super Admin: `/api/v1/platform/...`

### 6.2 Standard Response & Error Format
- **Success (Single):** Direct JSON resource object with `id`, `updated_at`, and domain fields.
- **Success (Paginated List):**
  ```json
  {
    "count": 420,
    "next": "...",
    "previous": null,
    "results": []
  }
  ```
- **Error Envelope:**
  ```json
  {
    "code": "EXAM_CLEARANCE_REQUIRED",
    "detail": "Human-readable error message.",
    "fields": { "score": ["Must be between 0 and 100."] }
  }
  ```

### 6.3 Offline Sync & Idempotency Headers
- `Idempotency-Key: <uuid>` — Accepted on all `POST`, `PUT`, `PATCH`, `DELETE` endpoints; stored for 7 days per user/scope to replay exact responses safely on network retries.
- `If-Unmatched-Since: <ISO-8601 updated_at>` — Optional optimistic concurrency header on `PATCH`/`PUT`; returns `409 Conflict` with `{ "code": "SYNC_CONFLICT", "server_record": { ... } }` if the server record was modified more recently.
- `?updated_since=<ISO-8601>` — Supported on list endpoints so the PWA IndexedDB sync engine can perform bandwidth-efficient delta pulls instead of re-downloading entire rosters.

---

## 7. Non-Functional Requirements (NFRs)

| Category | Requirement |
|---|---|
| **Performance** | P95 API read latency < 250ms on 10,000-student datasets; delta sync payloads compressed with gzip/brotli; initial PWA shell load < 2.0s on 3G Liberian mobile networks. |
| **Offline & Low-Bandwidth** | Full PWA installability; IndexedDB read cache across all 13 staff panes + Parent/Student portals; resilient FIFO mutation outbox with exponential backoff and conflict resolution UI. |
| **Security** | Argon2/PBKDF2 password hashing; HTTP-only refresh cookies with rotation; CORS allowlist; strict RBAC & tenant isolation; CSRF protection on cookie endpoints; rate limiting on login, OTP, SMS blast, and AI endpoints; zero secrets in frontend bundles or logs; fail-closed external integrations. |
| **Data Integrity & Backups** | PostgreSQL ACID transactions on invoice/payment/void/enrollment/library loan operations; automated daily encrypted `pg_dump` backups uploaded to S3/R2 with 30-day retention and documented restore drill (`RPO <= 24h`, `RTO <= 2h`). |
| **Scalability** | Stateless Django API workers behind Gunicorn/Uvicorn; Redis + Celery worker pool for bulk PDF report cards, SMS/WhatsApp blasts, and `per_tenant` DB provisioning. |
| **Accessibility & UX** | Keyboard-navigable modals/drawers/dropdowns (`Escape` closes top overlay), high contrast in both light and dark modes, `tabular-nums` (`num-tabular`) on all LRD/USD amounts, counts, and averages, timestamps and dates displayed in `Africa/Monrovia`, responsive mobile layout for teachers taking attendance on phones/tablets. |
| **Observability** | Structured JSON logging (request ID, tenant slug, user ID, latency), `/api/health/` (liveness) and `/api/ready/` (PostgreSQL + Redis readiness), Sentry-compatible error reporting hook (fail-closed when DSN unset). |
