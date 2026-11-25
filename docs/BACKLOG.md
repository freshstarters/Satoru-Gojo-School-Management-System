# Engineering Backlog (`BACKLOG.md`)

**Platform:** Liberian School Management System — Gojo School (`demo`) & General Multi-Tenant SMS (`core`)
**Story Ordering:** Execute strictly in heading order (`S1.1`, `S1.2`, ..., `S9.4`). Compatible with `.agent/skills/master-prompts/SKILL.md`.
**Companion Documents:** `docs/PRD.md`, `docs/SCOPE.md`

---

## Sprint 1 — Platform Foundation, PostgreSQL, Multi-Tenancy Switches, Auth & Frontend Shell

### S1.1 — PostgreSQL, Redis, Celery & Project Layer Scaffolding
- **Goal:** Replace the starter SQLite settings with a PostgreSQL-only configuration, set up Redis + Celery, scaffold the `core/` and `demo/` layered package directories (`service/`, `views/`, `integrations/`, `helpers/`, `tests/`), configure Django REST Framework + CORS + OpenAPI schema, and add `/api/health/` and `/api/ready/` endpoints.
- **Repos:** Backend (`/home/demiz/Projects/lib_school_management_system_venv/lib_school_management_system`)
- **PRD Acceptance:** AC-08
- **SCOPE:** Milestone M1; Prerequisites PR-01, PR-02
- **Deliverables:**
  - Configure `settings.py` to load `.env` (`python-dotenv` or `django-environ`), enforce PostgreSQL-only `DATABASES['default']` (raising `ImproperlyConfigured` for SQLite or missing `DATABASE_URL`), and configure `TIME_ZONE = 'Africa/Monrovia'`.
  - Add `lib_school_management_system/celery.py` wired to `REDIS_URL` / `CELERY_BROKER_URL`.
  - Create `demo` Django app (`python manage.py startapp demo`) and create `service/`, `views/`, `integrations/`, `helpers/`, `tests/` packages inside both `core/` and `demo/` (with clean `__init__.py`).
  - Mount `/api/v1/` (`core.urls`) and `/api/demo/v1/` (`demo.urls`) in root `urls.py`.
  - Add standard DRF error envelope renderer/exception handler (`{ "code", "detail", "fields" }`), pagination defaults, and `/api/health/` + `/api/ready/` endpoints checking PostgreSQL and Redis.
  - Populate `.env.example` with all documented platform and multi-tenancy variables.
- **Reviewer Checks:**
  - `python manage.py check` and `python manage.py test` pass against PostgreSQL with zero warnings.
  - Starting Django with a non-PostgreSQL `DATABASE_URL` fails closed with `ImproperlyConfigured`.
  - `GET /api/health/` returns `200`; `GET /api/ready/` verifies PostgreSQL and Redis connectivity.
  - Verify `core` has zero imports from `demo`.

### S1.2 — Multi-Tenancy `.env` Switch Engine (`TENANCY_DB_MODE` & `TENANCY_ROUTING_MODE`)
- **Goal:** Build the reusable multi-tenancy core engine in `core/tenancy/` governed by `.env` switches for database isolation (`shared` vs. `per_tenant`) and request routing (`subdomain` vs. `header_path`), while keeping `/api/demo/v1/` strictly isolated on the default DB.
- **Repos:** Backend
- **PRD Acceptance:** AC-06, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13
- **SCOPE:** Milestone M1; Prerequisite PR-01
- **Deliverables:**
  - `core/tenancy/config.py`: Validate `TENANCY_DB_MODE` (`shared|per_tenant`) and `TENANCY_ROUTING_MODE` (`subdomain|header_path`) on startup; fail closed on invalid values.
  - `core/models/platform.py`: Add `TenantSchool` model (UUID, `slug`, `name`, `status` [`PROVISIONING`, `ACTIVE`, `SUSPENDED`], `db_name`, `db_alias`, `schema_version`, `created_at`) and `TenantScopedModel` abstract base class + fail-closed `TenantManager` (`TenantContextError` if queried outside tenant context).
  - `core/tenancy/context.py` & `core/tenancy/middleware.py`: `TenantResolutionMiddleware` supporting `subdomain` (`<slug>.<TENANCY_BASE_DOMAIN>`, reserving `www`, `api`, `admin`, `platform`) and `header_path` (`X-Tenant-Slug`), bypassing resolution for `/api/demo/v1/*`, `/api/health/`, `/api/ready/`, and `/admin/`.
  - `core/tenancy/router.py`: `TenantDatabaseRouter` routing `core` tenant-domain models to the active tenant's PostgreSQL alias when `TENANCY_DB_MODE=per_tenant` and to `default` when `shared`.
  - `core/tenancy/provisioning.py` & management command `migrate_all_tenants`: Idempotent PostgreSQL database creation helper and fleet migration runner.
- **Reviewer Checks:**
  - Unit & integration tests cover all 4 `.env` combinations (`shared`/`per_tenant` × `subdomain`/`header_path`) plus invalid env var rejection.
  - Unknown subdomain/header returns `404`; suspended tenant returns `403`.
  - `/api/demo/v1/*` requests succeed without requiring `X-Tenant-Slug` or tenant subdomains.

### S1.3 — Platform Auth: Custom User, `+231` Phone/Email Login, JWT Cookies & Google Sign-In
- **Goal:** Implement `core` platform authentication supporting Email OR Liberian `+231` phone login, short-lived JWT access tokens + rotating `HttpOnly` refresh cookies, fail-closed Google Sign-In (OAuth 2.0 / OIDC), and app-scope (`demo` vs. `core`) token isolation.
- **Repos:** Backend
- **PRD Acceptance:** AC-01, AC-02, AC-06, AC-07
- **SCOPE:** Milestone M1; Prerequisites PR-03, PR-04
- **Deliverables:**
  - Custom `User` model in `core` supporting unique `email` and normalized E.164 Liberian `phone` (`+231...`), plus Liberian phone normalization helper in `core/helpers/phone.py`.
  - `POST /api/demo/v1/auth/login/`, `/refresh/`, `/logout/`, `/me/` (and mirrored `/api/v1/auth/...`) issuing 15-min access JWT with `app_scope` (`demo` or `core`) + `tenant_slug` + `role` claims and setting `HttpOnly` refresh cookie with rotation & blacklist.
  - `core/integrations/google_oauth.py` & `POST .../auth/google/`: Verifies Google ID token against `GOOGLE_OAUTH_CLIENT_ID`; matches active invited users by verified email; fails closed with `503` when credentials are missing.
  - `GET .../auth/config/`: Exposes safe public auth metadata (`google_enabled`, `hosting_region`, `data_controller_name`) with zero secrets.
  - Login rate limiting middleware/throttle.
- **Reviewer Checks:**
  - User can log in with email or `+231` phone (accepting formats like `0770123456` normalized to `+231770123456`).
  - Refresh cookie rotates on `/refresh/` and is invalidated on `/logout/`.
  - `demo` JWT is rejected (`403`) on `/api/v1/`; `core` JWT is rejected (`403`) on `/api/demo/v1/`.
  - `/auth/google/` returns `503` when `GOOGLE_OAUTH_CLIENT_ID` is unset and authenticates valid mocked/verified tokens when set.

### S1.4 — Invite-Only Onboarding, Password Reset, RBAC & Idempotency Primitives
- **Goal:** Implement invite-only account activation, password reset with full session revocation, the 8-role RBAC permission system (`platform_super_admin`, `principal`, `registrar`, `bursar`, `teacher`, `support_staff`, `parent`, `student`), and shared `Idempotency-Key` middleware/helper for offline sync safety.
- **Repos:** Backend
- **PRD Acceptance:** AC-03, AC-04, AC-05, AC-66
- **SCOPE:** Milestone M1; Prerequisite PR-06
- **Deliverables:**
  - `RoleMembership`, `InviteToken` (72h expiry, single-use SHA-256 hashed token), `PasswordResetToken`, and `IdempotencyRecord` models in `core`.
  - Endpoints: `POST .../auth/invites/`, `POST .../auth/invites/accept/`, `POST .../auth/password-reset/request/`, `POST .../auth/password-reset/confirm/`.
  - Reusable DRF permission classes (`HasSchoolRole`, `IsCampusScoped`, `IsPlatformSuperAdmin`) enforcing Section 2.2 of `PRD.md`. Division and subject write endpoints use `HasSchoolRole`.
  - A signed-in user can review the sessions listed for this browser and revoke one session without resetting the password.
  - `core/helpers/idempotency.py`: Decorator/mixin honoring `Idempotency-Key` header on mutating endpoints and `If-Unmatched-Since` optimistic concurrency check returning `409 Conflict` with `server_record`.
  - Seed management command `seed_gojo_demo` creating Gojo Institute's initial Principal (`Dr. Samuel Kollie`), Registrar (`Beatrice Toe`), Bursar (`Joseph Freeman`), and Teacher (`Grace Johnson`) accounts for local dev.
- **Reviewer Checks:**
  - Public self-signup does not exist; expired or reused invite tokens return `400`.
  - Resetting password revokes existing refresh tokens immediately.
  - Permission unit tests verify every role matrix boundary (`403` for unauthorized roles).
  - Replaying a `POST` with the same `Idempotency-Key` returns the original response without duplicating rows.

### S1.5 — Frontend Shell, Design System Primitives, Auth Flows & Rule Alignment
- **Goal:** Replace the Vite starter app with the production Gojo Institute React + TypeScript shell matching `UI-template/template1.html`, build all reusable UI primitives, wire login (Email/`+231` + Google Sign-In), invite activation, Privacy Notice, and LRD `+ USD` toggle, and align `.agent/rules/frontend-composition.md` copies with the updated template.
- **Repos:** Frontend (`/home/demiz/Projects/gojo-school-mgt-sys`), Backend (rule mirror copies)
- **PRD Acceptance:** AC-01, AC-02, AC-03, AC-07, AC-14, AC-15, AC-17
- **SCOPE:** Milestone M1; Prerequisites PR-03, PR-04
- **Deliverables:**
  - Configure Tailwind CSS (`darkMode: 'class'`) and import all exact CSS custom properties (`--bg-canvas`, `--bg-surface`, `--bg-subtle`, `--bg-modal`, `--bg-inset`, `--brand-primary`, badge tokens, `.floating-sidebar`, `.floating-topbar`, `.crm-card`, `.btn-primary`, `.btn-secondary`, `.subtab-bar`, `.tab-glide`, `.num-tabular`) into `src/index.css`.
  - Build reusable components in `src/components/`: `Button`, `Card`, `Modal`, `Drawer`, `Subtabs`, `Select` (custom dropdown portal), `DatePicker`, `DateTimePicker`, `Badge`, `Toast`, `ConfirmDialog`, `DataTable`, `EmptyState`, `ErrorState`, `Tooltip`.
  - Build `AppShell` with collapsible `.floating-sidebar` (all 13 navigation items filtered by authenticated role + SMS Wallet pill), `.floating-topbar` (Global Search trigger, `LRD + USD` toggle, Theme/Accent/Font popover, AI Assist button, Audit Log button, User menu), and mobile drawer.
  - Build `src/service/apiClient.ts` targeting `/api/demo/v1/` with automatic access-token refresh, `Idempotency-Key` header support, and typed error parsing. The client is same-site with the API, sends credentials, copies the CSRF token from `GET /auth/config/` into `X-CSRFToken`, and keeps the access token in memory.
  - Each workspace pane has its own address, and a refresh reopens that pane. Timestamps and dates display in `Africa/Monrovia`. The user menu lists this browser's sessions and can revoke one.
  - Build Login, Google Sign-In (conditionally rendered from `/auth/config/`), Invite Activation, Password Reset, and Privacy Notice screens.
  - Update `frontend-composition` rules across both repos (`.cursor/rules/` and `.agent/rules/`) so sample references match `UI-template/template1.html` (`Gojo Institute`, Sinkor & Paynesville, `LRD + USD`, 13 panes).
- **Reviewer Checks:**
  - `npm run build` and `npm run lint` pass with zero errors and zero emojis.
  - Browser check confirms light/dark theme, accent colors (`blue`, `slate`, `emerald`, `indigo`), sidebar hover expand, custom Select/DatePicker portals, and `LRD + USD` toggle work seamlessly.
  - Real login against `/api/demo/v1/auth/login/` persists session across reloads via refresh cookie.

---

## Sprint 2 — Multi-Campus Academic Core, Classes/Timetable, Students, Teachers & Parents (`demo`)

### S2.1 — Multi-Campus School Profile, Academic Years & Settings (`demo`)
- **Goal:** Implement Gojo Institute's school profile, multi-campus registry (Sinkor & Paynesville), Academic Years (`2026/2027`), 6 Marking Periods + 2 Semesters calendar, configurable grading & LRD/USD FX rate settings, and wire the `Settings` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-18, AC-19, AC-20
- **SCOPE:** Milestone M2
- **Deliverables:**
  - `demo/models/school.py`: `SchoolConfig`, `Campus` (name, address, catchment_zone, grades_served, lead_staff), `AcademicYear`, `MarkingPeriod` (`P1`–`P6`, `SEM1_EXAM`, `SEM2_EXAM`, dates, `is_locked`), `Division` (`ECE`, `Elementary`, `Junior High`, `Senior High`), `GradeLevel` (`Nursery`, `ABC`, `K1`, `K2`, `Grade 1`–`Grade 12`).
  - `/api/demo/v1/settings/`, `/campuses/`, `/academic-years/`, `/integrations/status/` endpoints with Principal/Bursar RBAC.
  - Wire `SettingsScreen` (matching `template1.html` settings sections: School & Campuses, Academic Calendar & Grading Weights, Currency & FX Rate, Integration Health status cards without raw secrets).
- **Reviewer Checks:**
  - Changing LRD/USD exchange rate in Settings immediately updates the topbar `+ USD` reference calculations across the app.
  - Updating grading weights rejects payloads not summing to 100%.
  - Non-Principal/Bursar roles receive `403` on Settings writes.

### S2.2 — Classes, MoE Subjects, Weekly 8-Period Timetable & Substitutions (`demo`)
- **Goal:** Build classroom/section management, Liberia MoE core & WAEC lab subjects, the Monday–Friday `1st Period`–`8th Period` weekly timetable with conflict detection, and daily teacher substitution tracking, wiring the `Classes & Timetable` pane.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-32, AC-33, AC-34
- **SCOPE:** Milestone M2
- **Deliverables:**
  - `demo/models/academics.py`: `Subject` (code, name, division, is_core, is_waec_lab), `Classroom` (campus, academic_year, grade_level, section_name, homeroom_teacher, capacity), `ClassSubjectAssignment`, `TimetableSlot` (classroom, day_of_week, period_number `1..8`, subject, teacher, room_label), `TeacherSubstitution` (slot, date, substitute_teacher, reason).
  - Conflict validation in `demo/service/timetable_service.py` preventing teacher or room double-booking on the same day/period, plus uncovered-slot detection query.
  - Endpoints: `/api/demo/v1/classes/`, `/subjects/`, `/timetable/`, `/timetable/uncovered/`, `/timetable/substitutions/`.
  - Wire `ClassesScreen` with `Classrooms` and `Weekly Timetable` subtabs, classroom inspector drawer, slot editor modal, and uncovered-slot substitute assignment.
- **Reviewer Checks:**
  - Attempting to assign the same teacher to two classrooms in Monday 2nd Period returns `400` with conflict message.
  - Assigning a substitute for an uncovered slot clears it from `/timetable/uncovered/`.
  - Teachers only see their own assigned classrooms/timetable slots.

### S2.3 — Students Directory, 3-Tab Inspector (Profile, Welfare & Pickup, Conduct) & Storage (`demo`)
- **Goal:** Implement the complete Student record model with auto-generated Gojo student IDs, S3/R2-backed photo upload, Welfare/Medical & Authorized Pickup list, Conduct & Homeroom Notes, and wire the `Students Directory` screen and 3-tab Inspector Drawer.
- **Repos:** Backend (`demo`, `core/integrations/storage.py`), Frontend
- **PRD Acceptance:** AC-26, AC-27, AC-28
- **SCOPE:** Milestone M2; Prerequisite PR-05
- **Deliverables:**
  - `core/integrations/storage.py`: S3/R2 storage adapter (fails closed in prod if unconfigured; local media allowed only when `DEBUG=True`).
  - `demo/models/people.py`: `Student` (auto `student_code` e.g. `GI-2026-0001`, campus, current_classroom, status [`Active`, `Honor Roll`, `At Risk`, `WAEC Candidate`, `Withdrawn`, `Graduated`], photo, DOB, gender, catchment_zone), `StudentWelfare` (allergies, medical_notes, blood_group, emergency_contact), `AuthorizedPickup` (name, relationship, `+231` phone, id_note), `ConductNote` (type [`Merit`, `Incident`, `Homeroom Note`], severity, description, author).
  - Endpoints: `/api/demo/v1/students/`, `/students/<id>/welfare/`, `/students/<id>/pickups/`, `/students/<id>/conduct/`.
  - Wire `StudentsScreen` (Division & Status filters, search, summary stat cards, paginated table, `+ Enroll Student` modal) and `StudentInspectorDrawer` with `Profile & Academics`, `Welfare & Pickup`, and `Conduct & Notes` subtabs. The open inspector has its own address, so a refresh or a shared link opens that same student.
- **Reviewer Checks:**
  - Enrolling a student generates a unique `GI-YYYY-NNNN` code and displays immediately in the table without page reload.
  - Adding an authorized pickup with a Liberian phone normalizes it to `+231`.
  - Teachers can add conduct notes only for students in their assigned classes; unauthorized edits return `403`.

### S2.4 — Teachers/Staff & Parents/Guardians Directories (`demo`)
- **Goal:** Implement Staff and Guardian models, multi-child family links, guardian SMS consent flags, invite dispatch from inspectors, and wire the `Teachers & Staff` and `Parents & Guardians` screens.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-49, AC-50
- **SCOPE:** Milestone M2
- **Deliverables:**
  - `demo/models/people.py`: `StaffProfile` (user link, staff_code, role, campus, qualifications, phone, email, employment_status) and `GuardianProfile` (user link, full_name, relationship, `+231` phone, whatsapp_phone, email, residential_zone, occupation, `sms_consent`), `StudentGuardianLink` (student, guardian, is_primary, is_financial_responsible).
  - Endpoints: `/api/demo/v1/teachers/`, `/api/demo/v1/parents/`, plus `POST .../send-invite/` action calling `core` invite service.
  - Wire `TeachersScreen` + `TeacherInspectorDrawer` + `NewStaffModal` and `ParentsScreen` + `ParentInspectorDrawer` + `NewParentModal`. The open teacher or parent inspector has its own address, and the selected inspector subtab is part of that address so a refresh reopens the same person and subtab.
- **Reviewer Checks:**
  - Linking one guardian to two siblings displays both children and aggregated balance summary in the Parent Inspector.
  - Soft-deactivating a teacher preserves their historical timetable/grade attribution.
  - Clicking `Send Portal Invite` creates an `InviteToken` and updates status badge to `Invited`.

---

## Sprint 3 — Principal Dashboard, Daily Attendance Register & Global Search (`demo`)

### S3.1 — Daily Attendance Register & Absence Alert Trigger (`demo`)
- **Goal:** Build fast daily classroom attendance recording (`Present`, `Late`, `Absent`, `Excused`), per-student & per-campus attendance percentage rollups, and configurable absence alert queueing, wiring the `Daily Attendance` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-35, AC-36
- **SCOPE:** Milestone M3
- **Deliverables:**
  - `demo/models/attendance.py`: `AttendanceSession` (classroom, date, taken_by, locked_at), `AttendanceRecord` (session, student, status, arrival_time, remark; unique `(session, student)`).
  - Bulk upsert endpoint `POST /api/demo/v1/attendance/bulk/` honoring `Idempotency-Key`, plus `GET /api/demo/v1/attendance/summary/`.
  - Service calculation updating cached student period/yearly attendance percentages and queueing absence notifications for unexcused absences when guardian `sms_consent=True`.
  - Wire `AttendanceScreen` with Campus/Class/Date custom selectors, `Mark All Present` button, single-click status pills, summary counters, and mobile-friendly row layout.
- **Reviewer Checks:**
  - Submitting a 40-student roll call completes in a single atomic request and updates Student Inspector attendance percentages immediately.
  - Re-submitting the same attendance batch with the same `Idempotency-Key` produces zero duplicate rows.
  - Teachers cannot submit attendance for classes they are not assigned to (`403`).

### S3.2 — Principal Dashboard Analytics & Global Search (`demo`)
- **Goal:** Build aggregated dashboard analytics endpoints and role-scoped Global Search, wiring the complete `Principal Dashboard` (`dashboard` pane) matching `template1.html`.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-16, AC-21, AC-22, AC-23, AC-24, AC-25
- **SCOPE:** Milestone M3
- **Deliverables:**
  - `demo/service/dashboard_service.py` & `GET /api/demo/v1/dashboard/`: Returns role-scoped KPIs (active enrollment, today's attendance %, tuition collected & outstanding LRD/USD, open admissions, WAEC ready count), combo chart series (`sem1`, `all` P1–P6, `waec`), cashflow totals (`week`, `month`, `term`) by payment method, actionable Principal alerts (uncovered bell slots, WAEC unpaid fees, clearance holds), catchment zone distribution, and latest audit headline.
  - `GET /api/demo/v1/search/?q=...`: Role-scoped PostgreSQL search across students, guardians, receipts, classes, staff, and library books.
  - Wire `DashboardScreen` (KPI cards, interactive combo chart with `Sem 1 / P1–P6 / WAEC` subtabs, LRD collections card with `Week / Month / Term` subtabs, Principal action items card, interactive Greater Monrovia catchment zone breakdown, recent student watch table, audit ticker) and topbar `GlobalSearch` popover (`/` and `Cmd/Ctrl+K`).
- **Reviewer Checks:**
  - Dashboard renders 100% live database metrics (zero hardcoded fixture numbers) and reacts to the `LRD + USD` topbar toggle.
  - Switching `Sem 1` / `P1–P6` / `WAEC` and `Week` / `Month` / `Term` subtabs updates charts cleanly.
  - Global Search respects RBAC (e.g., Teacher never sees Bursar receipt totals or other classes' students).

---

## Sprint 4 — Liberian Gradebook, WAEC/WASSCE Tracker, PDF Report Cards & Promotion (`demo`)

### S4.1 — Liberian 6-Period + 2-Semester Gradebook & Locking Engine (`demo`)
- **Goal:** Implement the Liberian `0–100` gradebook covering `Period 1`–`Period 6` and `Semester 1` & `Semester 2` Exams, deterministic weighted Semester & Yearly averages, class rankings, and marking-period locking, wiring the `6-Period Gradebook` subtab.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-37, AC-38, AC-39
- **SCOPE:** Milestone M4
- **Deliverables:**
  - `demo/models/grades.py`: `GradeEntry` (student, classroom, subject, marking_period, score `0..100`, teacher_remark; unique `(student, subject, marking_period)`), `TermSummary` (computed sem1_avg, sem2_avg, yearly_avg, rank, standing [`Honor Roll`, `Pass`, `Fail`]).
  - `demo/service/grading_service.py`: Deterministic Liberian weighted average calculator reading school config weights and pass threshold (`70%`), class rank computation, and period lock enforcement (writing Audit Log entries on every grade change).
  - Endpoints: `GET/POST /api/demo/v1/grades/sheet/`, `POST /api/demo/v1/grades/periods/<id>/lock/`, `POST /api/demo/v1/grades/periods/<id>/unlock/`.
  - Wire `GradesScreen` (`6-Period Gradebook` subtab) with Classroom/Subject/Period selectors, inline tabular numeric inputs, color-coded pass/fail/honor badges, period lock banner, and bulk save.
- **Reviewer Checks:**
  - Scores outside `0–100` fail validation (`400`).
  - Weighted Semester 1, Semester 2, and Yearly averages match unit test golden fixtures to 2 decimal places.
  - Locked period rejects teacher edits (`403`) while allowing Principal unlock + edit with audit record.

### S4.2 — WAEC / WASSCE & Grade 9 LJHSCE Readiness Tracker (`demo`)
- **Goal:** Implement WAEC candidate tracking for Grade 9 (LJHSCE) and Grade 12 (WASSCE) students, integrating mock exam averages, practical lab checks, and WAEC fee payment status, wiring the `WAEC / WASSCE Tracker` subtab.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-40
- **SCOPE:** Milestone M4
- **Deliverables:**
  - `demo/models/waec.py`: `WaecCandidate` (student, academic_year, exam_level [`LJHSCE_G9`, `WASSCE_G12`], candidate_number, registered_subjects JSON, lab_practical_complete, mock_avg, exam_fee_status [`Paid`, `Unpaid`, `Partial`], readiness_status [`Ready`, `Fee Pending`, `At Risk`], notes).
  - Endpoints: `/api/demo/v1/waec/candidates/` (list, filter by campus/exam level/readiness, create/update, bulk sync from Grade 9 & Grade 12 rosters).
  - Wire `WAEC / WASSCE Tracker` subtab in `GradesScreen` with readiness KPIs, candidate table, candidate detail modal, and direct deep-link from Principal Dashboard WAEC compliance alerts. The bursar's Grades & WAEC item opens on this subtab. The gradebook subtab is hidden for the bursar, and exam-fee status remains editable there.
- **Reviewer Checks:**
  - Clicking `Inspect WAEC` on the Principal Dashboard opens `Grades -> WAEC / WASSCE Tracker` filtered to candidates needing attention.
  - Updating a candidate's WAEC fee status or mock exam average automatically recalculates `readiness_status`.
  - A bursar can update exam-fee status on the tracker and cannot edit gradebook scores.

### S4.3 — Printable PDF Report Cards, Bulk Class Export & Senior High Transcripts (`demo`)
- **Goal:** Build server-side branded PDF generation (WeasyPrint/ReportLab) for Liberian Period/Semester/Annual Report Cards, Senior High Cumulative Transcripts (Grades 10–12), Class Grade Sheets (PDF/CSV), and Celery-backed bulk class ZIP generation stored on S3/R2.
- **Repos:** Backend (`demo`, `core/integrations/storage.py`), Frontend
- **PRD Acceptance:** AC-41
- **SCOPE:** Milestone M4; Prerequisites PR-02, PR-05
- **Deliverables:**
  - HTML/CSS print templates for Gojo Institute Report Card (school crest/header, student & campus info, P1–P6 + Sem 1/2 + Yearly table, attendance summary, conduct remarks, grading scale legend, Principal & Homeroom signature lines) and Official Senior High Transcript.
  - Endpoints: `GET /api/demo/v1/reports/student/<id>/report-card.pdf`, `GET /api/demo/v1/reports/student/<id>/transcript.pdf`, `POST /api/demo/v1/reports/class/<id>/bulk-report-cards/` (async Celery task returning job status & presigned download URL), `GET /api/demo/v1/reports/class/<id>/grade-sheet.csv`.
  - Frontend download actions in `GradesScreen` and `StudentInspectorDrawer` with progress polling for bulk class exports.
- **Reviewer Checks:**
  - Generated PDF opens cleanly, shows accurate P1–P6 scores, weighted averages, attendance, and zero layout overflow.
  - Bulk generation runs asynchronously via Celery without blocking HTTP workers and stores output in configured object storage.

### S4.4 — Automated Year-End Promotion & Retention Workflow (`demo`)
- **Goal:** Build the year-end student promotion engine allowing Registrar/Principal to preview pass/fail/probation/graduation outcomes against Liberian promotion criteria, apply audited overrides, and batch-enroll students into the next Academic Year.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-42
- **SCOPE:** Milestone M4
- **Deliverables:**
  - `demo/service/promotion_service.py`: Evaluates every active student in an academic year (`Promoted`, `Probation`, `Retained`, `Graduated` for Grade 12) based on configurable yearly average (>= 70%) and core subjects rule.
  - Endpoints: `GET /api/demo/v1/promotions/preview/?from_year=...&to_year=...`, `POST /api/demo/v1/promotions/execute/` (atomic transaction recording `PromotionDecision`, updating student grade/classroom for new year, or marking Grade 12 as `Graduated`).
  - Frontend Promotion Modal/Wizard inside `GradesScreen` / `SettingsScreen` with inline override dropdown + mandatory override reason and confirmation dialog.
- **Reviewer Checks:**
  - Executing promotion is atomic and idempotent (cannot double-promote a student for the same academic year).
  - Grade 12 passing students transition to `Graduated`; failing students default to `Retained` unless explicitly overridden with an audited reason.

---

## Sprint 5 — Admissions, Dual-Currency LRD/USD Finance, Library, Bus Routes, Announcements/SMS & AI (`demo`)

### S5.1 — Admissions Pipeline (5-Stage Kanban + Table & Convert to Student) (`demo`)
- **Goal:** Implement the 5-stage Admissions Pipeline (`Inquiry`, `Application Submitted`, `Placement Test`, `Accepted`, `Enrolled`, plus `Declined`) with atomic conversion into an enrolled Student + Guardian + initial Invoice, wiring the `Admissions Pipeline` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-29, AC-30, AC-31
- **SCOPE:** Milestone M5
- **Deliverables:**
  - `demo/models/admissions.py`: `AdmissionApplicant` (full_name, DOB, gender, target_campus, target_grade, previous_school, guardian_name, guardian_phone, stage, placement_test_score, notes, converted_student FK).
  - `demo/service/admissions_service.py`: Atomic `convert_applicant_to_student` transaction creating/linking Guardian, creating Student (`GI-YYYY-NNNN`), assigning Classroom, generating annual Fee Invoice, and writing Audit Log.
  - Endpoints: `/api/demo/v1/admissions/` (CRUD + `POST .../stage/` + `POST .../enroll/`).
  - Wire `AdmissionsScreen` with `Board` (5-column Kanban) and `Table` subtabs, search, `+ New Applicant` modal, applicant inspector drawer, and one-click `Enroll Applicant` flow.
- **Reviewer Checks:**
  - Enrolling an accepted applicant atomically creates the Student, links/creates Guardian, and creates an Invoice; repeating enroll on an already-enrolled applicant fails cleanly (`400`).
  - Switching between Kanban Board and Table reflects the exact same live state.

### S5.2 — Tuition, Dual-Currency LRD/USD Fees, Receipts, Voids & Exam Clearance (`demo`)
- **Goal:** Build the Bursar finance engine: itemized Fee Schedules, Student Invoices, LRD & USD payment recording with immutable FX snapshots, sequential PDF Receipts, destructive Receipt Voiding, and automatic/overridable Exam Clearance, wiring the `Tuition & LRD Fees` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-43, AC-44, AC-45, AC-46, AC-47
- **SCOPE:** Milestone M5
- **Deliverables:**
  - `demo/models/finance.py`: `FeeSchedule` (academic_year, campus, division, tuition_lrd, registration_id_lrd, uniform_books_lrd, waec_pta_lrd), `StudentInvoice` (invoice_number, student, academic_year, itemized JSON/lines, total_lrd, discount_lrd, paid_lrd, balance_lrd, status, fx_rate_snapshot), `PaymentReceipt` (receipt_number `RCP-YYYY-NNNNN`, invoice, method [`Cash`, `Bank Deposit`, `Lonestar MTN MoMo`, `Orange Money`], reference_number, tendered_currency [`LRD`, `USD`], tendered_amount, fx_rate_lrd_per_usd, settled_amount_lrd, status [`CONFIRMED`, `VOIDED`], void_reason, voided_by), `ExamClearance` (student, marking_period, status [`Cleared`, `Conditional`, `Hold`], is_manual_override, override_reason, expires_at).
  - `demo/service/finance_service.py`: Atomic ledger updates with `select_for_update()`, Exam Clearance auto-recalculation, WAEC exam fee status sync, and PDF receipt generator (`GET /api/demo/v1/fees/receipts/<id>.pdf`).
  - Endpoints: `/api/demo/v1/fees/schedules/`, `/fees/invoices/`, `/fees/payments/`, `/fees/payments/<id>/void/`, `/fees/clearance/override/`.
  - Wire `FeesScreen` with `Student Invoices`, `Fee Schedule`, and `Payment Ledger` subtabs, summary stat cards, `Record Payment` modal (with LRD/USD currency toggle & live conversion preview), destructive `Void Receipt` confirm modal, and printable PDF receipt button.
- **Reviewer Checks:**
  - Recording a `USD 100.00` payment at `1 USD = 192 LRD` settles `LRD 19,200.00` and preserves the snapshot even if the school later changes the FX rate to `195`.
  - Voiding a receipt reverses `paid_lrd` and `balance_lrd`, re-evaluates `ExamClearance`, and logs a high-priority Audit event.
  - Non-Bursar/Principal roles cannot record or void payments (`403`).

### S5.3 — Library & Textbooks (`demo`)
- **Goal:** Implement the school Library & Textbook catalog, transactional copy issuance/return, and overdue tracking, wiring the `Library & Textbooks` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-51, AC-52
- **SCOPE:** Milestone M5
- **Deliverables:**
  - `demo/models/library.py`: `LibraryBook` (campus, code/isbn, title, author, subject, grade_level, total_copies, available_copies, shelf_location), `LibraryLoan` (book, borrower_student, borrower_staff, issued_by, issued_at, due_date, returned_at, status [`ISSUED`, `RETURNED`, `OVERDUE`]).
  - Atomic issue/return service locking the book row to guarantee `0 <= available_copies <= total_copies`.
  - Endpoints: `/api/demo/v1/library/books/`, `/library/loans/`, `POST /library/loans/<id>/return/`.
  - Wire `LibraryScreen` with catalog search, KPI summary cards, quick issue/return controls, `+ Add Book` modal, and overdue filter.
- **Reviewer Checks:**
  - Issuing the last available copy sets `available_copies = 0`; a subsequent concurrent issue attempt fails cleanly (`400`).
  - Returning a copy increments `available_copies` and updates the loan status to `RETURNED`.

### S5.4 — School Bus Routes (`demo`)
- **Goal:** Implement campus School Bus Routes, ordered stops, vehicle/driver details, and student route assignments, wiring the `School Bus Routes` screen.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-53, AC-54
- **SCOPE:** Milestone M5
- **Deliverables:**
  - `demo/models/transport.py`: `BusRoute` (campus, code, name, vehicle_plate, seat_capacity, driver_name, driver_phone, conductor_name, conductor_phone, is_active), `BusStop` (route, order, stop_name, pickup_time, dropoff_time), `StudentBusAssignment` (student, route, stop, academic_year).
  - Endpoints: `/api/demo/v1/transport/routes/`, `/transport/assignments/`.
  - Wire `TransportScreen` with campus route cards/table, route detail drawer (stops + assigned student roster + capacity indicator), and assign-student modal.
- **Reviewer Checks:**
  - Assigning a student beyond `seat_capacity` returns a clear capacity warning/error unless explicitly confirmed by Principal.
  - Student's assigned bus route appears in `StudentInspectorDrawer` (`Welfare & Pickup` subtab).

### S5.5 — Announcements, Multi-Channel Notifications (Email/SMS/WhatsApp) & SMS Wallet (`demo` + `core`)
- **Goal:** Implement pluggable fail-closed Email, SMS (Africa's Talking / Twilio), and WhatsApp Business API adapters in `core`, build the School SMS Wallet & Announcements workflow in `demo`, and wire the `Announcements & Parent SMS` screen + sidebar SMS balance widget.
- **Repos:** Backend (`core/integrations/`, `demo`), Frontend
- **PRD Acceptance:** AC-55, AC-56, AC-57
- **SCOPE:** Milestone M5; Prerequisites PR-02, PR-06, PR-07, PR-08
- **Deliverables:**
  - `core/integrations/email_adapter.py`, `sms_adapter.py`, `whatsapp_adapter.py`: Fail-closed adapters logging every attempt to `NotificationLog` (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `UNCONFIGURED`).
  - `demo/models/communications.py`: `Announcement` (title, body, audience_type, target_campus, target_division, channels [`IN_APP`, `EMAIL`, `SMS`, `WHATSAPP`], status [`DRAFT`, `PUBLISHED`, `ARCHIVED`], published_at), `SmsWallet` (balance_lrd, unit_cost_lrd, sender_id), `SmsWalletTransaction` (type [`TOPUP`, `DISPATCH_DEBIT`, `REFUND`], amount_lrd, reference, created_by).
  - Celery task `dispatch_announcement_notifications` respecting guardian `sms_consent=True` and performing atomic SMS Wallet balance checks & deductions.
  - Endpoints: `/api/demo/v1/announcements/`, `POST .../publish/`, `/api/demo/v1/sms-wallet/`, `POST .../topup/`, `/api/demo/v1/notifications/logs/`.
  - Wire `AnnouncementsScreen` (list, inspector drawer, `+ New Announcement` modal, publish confirmation modal, SMS Wallet balance & Top-Up modal) and live sidebar SMS balance pill.
  - A phone password reset keeps emailing the account and also sends the link by SMS when the gateway is configured. A missing gateway does not stop that email.
- **Reviewer Checks:**
  - Publishing an SMS announcement with missing SMS gateway keys fails closed (`NotificationLog` records `UNCONFIGURED`, wallet is not falsely drained).
  - A phone password reset with a configured gateway sends both the account email and the SMS. With no gateway, the email still goes out and no SMS is recorded as sent.
  - Publishing an SMS announcement with insufficient SMS Wallet balance returns `400` before dispatching.
  - Guardians with `sms_consent=False` are automatically excluded from SMS dispatch.

### S5.6 — Fail-Closed AI Assist (`core/integrations/ai_adapter.py` + `demo`)
- **Goal:** Build the fail-closed LLM adapter in `core` and wire the Principal Dashboard AI Query bar and Topbar `AI Assist` modal to provide role-scoped school-day briefings, parent notice drafting, and at-risk grade/attendance summaries.
- **Repos:** Backend (`core`, `demo`), Frontend
- **PRD Acceptance:** AC-60, AC-61
- **SCOPE:** Milestone M5; Prerequisite PR-09
- **Deliverables:**
  - `core/integrations/ai_adapter.py`: Provider-agnostic LLM client supporting `AI_PROVIDER` (`gemini`, `openai`, `anthropic`), `AI_API_KEY`, `AI_MODEL`; returns `503 Service Unavailable` when unconfigured (no fake responses).
  - `demo/service/ai_context_service.py`: Builds compact, role-scoped, PII-minimized operational summaries (today's attendance, uncovered bell slots, WAEC deadlines, overdue balances, at-risk counts) to ground prompts.
  - `POST /api/demo/v1/ai/assist/` logging usage metadata (`actor`, `action_type`, `tokens_used`, `latency_ms`) to `AuditEvent`.
  - Wire Dashboard AI bar and `AiAssistModal` in Frontend with graceful "AI Assist not configured" banner when `503` is returned.
- **Reviewer Checks:**
  - With `AI_API_KEY` unset, `/api/demo/v1/ai/assist/` returns `503` and UI renders a non-crashing configuration notice.
  - Teacher AI queries receive only their own assigned classes' summary context — never school-wide bursar totals.

---

## Sprint 6 — Parent/Guardian Portal, Student Portal, Audit Drawer & Full PWA Offline-First Sync (`demo`)

### S6.1 — Immutable Audit Log Engine & Audit Drawer (`core` + `demo`)
- **Goal:** Ensure all critical domain writes emit structured `AuditEvent` records and wire the slide-over `Audit Log Drawer` (`36rem` frosted panel) with filtering by actor, module, action, and date range.
- **Repos:** Backend (`core`, `demo`), Frontend
- **PRD Acceptance:** AC-62
- **SCOPE:** Milestone M6
- **Deliverables:**
  - `core/service/audit_service.py`: Centralized `write_audit_event(...)` helper verified across Auth, Grades, Grade Locks, Finance Payments/Voids, Exam Clearance Overrides, Admissions Conversions, Attendance, Settings, and AI Assist. Failed sign-ins and tenant-mismatch events go through `write_audit_event`.
  - `GET /api/demo/v1/audit-logs/` (paginated, filterable by `actor`, `module`, `entity_type`, `date_from`, `date_to`, strictly role-scoped: Principal sees all, Registrar academic, Bursar finance).
  - Wire `AuditDrawer` (`36rem` sheet) and live dashboard audit headline ticker.
- **Reviewer Checks:**
  - Voiding a receipt, unlocking a grade period, and changing a score each appear immediately in the Audit Drawer with before/after diff values.
  - `AuditEvent` records expose no update or delete endpoints.

### S6.2 — Parent/Guardian Portal (`demo` + Frontend)
- **Goal:** Build the dedicated Parent/Guardian self-service portal scoped strictly to the authenticated guardian's linked children, including attendance, grades, PDF report cards, WAEC status, LRD/USD fee balances & receipts, announcements, SMS consent, and Parent Inquiries.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-05, AC-58
- **SCOPE:** Milestone M6
- **Deliverables:**
  - `demo/models/communications.py`: Add `ParentInquiry` (guardian, student, category [`Academic`, `Fees & Clearance`, `Welfare`, `Transport`, `General`], subject, message, status [`Open`, `In Review`, `Resolved`], staff_reply, replied_by).
  - Portal APIs: `GET /api/demo/v1/portal/parent/children/`, `/children/<id>/overview/`, `/children/<id>/attendance/`, `/children/<id>/grades/`, `/children/<id>/fees/`, `PATCH /portal/parent/preferences/` (SMS/WhatsApp consent), `GET/POST /portal/parent/inquiries/` (plus staff response endpoint).
  - Frontend `ParentPortalLayout` with child switcher, Overview cards, Attendance tab, Grades & Report Card PDF tab, Fees & Receipts PDF tab, Announcements tab, and Inquiries tab.
- **Reviewer Checks:**
  - Automated security test confirms Parent A receives `403`/`404` when requesting Parent B's child ID across every portal endpoint.
  - Parent can download their own child's PDF report card and fee receipt and toggle SMS consent.

### S6.3 — Student Portal (`demo` + Frontend)
- **Goal:** Build the dedicated Student self-service portal scoped strictly to the authenticated student's own timetable, attendance, published grades/report cards, library loans, bus route, and school announcements.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-05, AC-59
- **SCOPE:** Milestone M6
- **Deliverables:**
  - Portal APIs: `GET /api/demo/v1/portal/student/me/` (overview, timetable, attendance, published grades, WAEC readiness if Grade 9/12, active library loans, assigned bus route & stops, announcements) and PDF report card download (only for published/locked periods).
  - Frontend `StudentPortalLayout` displaying weekly 8-period timetable, attendance summary, grades & downloadable report cards, borrowed books with due dates, bus route card, and announcements.
- **Reviewer Checks:**
  - Student cannot view unpublished/draft grades or access any staff/parent/other-student endpoints (`403`).
  - Mobile browser viewport renders timetable and grades cleanly without horizontal breakage.

### S6.4 — Delta Sync API Support & PWA Service Worker Setup
- **Goal:** Add bandwidth-efficient `?updated_since=<ISO-8601>` delta sync support across `demo` list endpoints, configure the Vite PWA plugin + Web App Manifest + Workbox Service Worker for offline app-shell caching, and add online/offline connectivity state management.
- **Repos:** Backend (`demo`), Frontend
- **PRD Acceptance:** AC-63, AC-64
- **SCOPE:** Milestone M6
- **Deliverables:**
  - Backend: Add shared `UpdatedSinceFilterMixin` across all `demo` list endpoints (returning active + soft-archived tombstones since timestamp) and `ETag`/gzip support.
  - Frontend: Configure `vite-plugin-pwa` with Web App Manifest (`Gojo Institute`, standalone mode, icons, theme color matching `--brand-primary`), precached app shell, and `useNetworkStatus` hook + topbar Online/Offline/Syncing indicator pill.
- **Reviewer Checks:**
  - Lighthouse / Chrome DevTools verifies valid PWA manifest and active Service Worker.
  - Loading the app with DevTools set to `Offline` renders the complete application shell with zero blank screen.

### S6.5 — IndexedDB Read Cache, Offline Mutation Outbox & Conflict Resolution UI
- **Goal:** Implement the full offline-first IndexedDB storage engine across all 13 staff panes and Parent/Student portals, persistent FIFO mutation outbox with `Idempotency-Key`, automatic background replay on reconnect, conflict resolution drawer (`409 Conflict`), and secure cache wipe on logout.
- **Repos:** Frontend (`src/offline/`), Backend (`demo` concurrency check verification)
- **PRD Acceptance:** AC-64, AC-65, AC-66, AC-67
- **SCOPE:** Milestone M6
- **Deliverables:**
  - `src/offline/db.ts`: IndexedDB schema (via `idb` or Dexie) partitioned by `userId + appScope` storing cached collections, `sync_cursors` (`updated_since` per resource), and `sync_outbox` (`id`, `idempotencyKey`, `method`, `url`, `payload`, `baseUpdatedAt`, `status`, `retryCount`, `conflictServerRecord`).
  - `src/offline/syncEngine.ts`: Stale-while-revalidate read layer + optimistic offline writes for Attendance, Grades, Students, Admissions, Library loans, Conduct notes, Announcements, and Settings; FIFO outbox drainer with exponential backoff upon `online` event.
  - Explicit offline guardrails blocking destructive `VOID receipt` and live external payment calls while offline with informative toast/banner.
  - `SyncStatusDrawer` & `ConflictResolutionModal` displaying pending queued mutations, sync errors, and side-by-side `Keep Server` vs. `Keep Mine` conflict resolution.
  - Guaranteed `indexedDB.deleteDatabase(...)` / store purge on user logout or `401` session expiration.
- **Reviewer Checks:**
  - Browser QA (DevTools `Offline` mode): navigate across all wired screens using cached data, record daily attendance for a class and enter 5 period scores offline, verify outbox badge increments, switch back `Online`, verify automatic FIFO replay persists all rows to PostgreSQL with zero duplicates.
  - Simulate a `409 Conflict` by modifying a score on the server while offline; verify Conflict Resolution UI resolves cleanly.
  - Verify logout wipes all IndexedDB data immediately.

---

## Sprint 7 — General Multi-Tenant SMS (`core`) School Domain Parity & Tenant Lifecycle

### S7.1 — `core` Multi-Tenant School Domain Models & Services Parity
- **Goal:** Implement the complete Liberian school domain models (`TenantScopedModel`) and services inside `core/` (Multi-Campus, Academic Calendar, Classes/Timetable, Students/Welfare/Conduct, Teachers/Parents, Attendance, 6-Period Gradebook, WAEC Tracker, Report Cards, Promotion, Admissions, Dual-Currency LRD/USD Finance & Exam Clearance, Library, Transport, Announcements/SMS Wallet, Portals) with zero imports from `demo`.
- **Repos:** Backend (`core`)
- **PRD Acceptance:** AC-09, AC-68
- **SCOPE:** Milestone M7
- **Deliverables:**
  - Modular `core/models/` package re-exporting all models cleanly from `core/models/__init__.py` with PostgreSQL migrations.
  - Modular `core/service/` and `core/views/` mounted under `/api/v1/` achieving full functional parity with `/api/demo/v1/` including `?updated_since=` delta sync and `Idempotency-Key` support.
  - Ensure all foreign keys enforce same-tenant ownership inside `TenantScopedModel.clean()` and serializers.
- **Reviewer Checks:**
  - `python manage.py makemigrations --check --dry-run` passes with zero unmigrated changes.
  - Static check confirms `core` has zero imports from `demo` and `demo` has zero imports from `core` school-domain models.
  - Full API parity test suite passes under `/api/v1/`.

### S7.2 — Automated `per_tenant` PostgreSQL Provisioning & Tenant Lifecycle (`core`)
- **Goal:** Complete the end-to-end automated PostgreSQL tenant provisioning pipeline for `TENANCY_DB_MODE=per_tenant`, tenant seeding, suspension, and fleet migration tooling.
- **Repos:** Backend (`core`)
- **PRD Acceptance:** AC-10, AC-13
- **SCOPE:** Milestone M7; Prerequisites PR-01, PR-02
- **Deliverables:**
  - Celery task `provision_tenant_database(tenant_id)` that creates `sms_tenant_<slug>` via `TENANCY_PG_ADMIN_URL`, registers the dynamic DB alias, runs migrations for `core` tenant models, seeds Liberian divisions/subjects/default roles + initial Principal invite, sets `status=ACTIVE`, and records `schema_version`.
  - Safe rollback / `PROVISIONING_FAILED` error capture if DB creation or migration fails.
  - Harden `python manage.py migrate_all_tenants` with `--dry-run`, `--tenant=<slug>`, and per-tenant summary report.
- **Reviewer Checks:**
  - Creating two schools (`alpha-academy`, `beta-high`) under `TENANCY_DB_MODE=per_tenant` creates two distinct PostgreSQL databases and inserts data strictly into each school's own database.
  - `migrate_all_tenants` migrates both databases cleanly and updates `schema_version`.

### S7.3 — End-to-End 4-Mode Multi-Tenancy Matrix & Cross-Tenant Security Verification
- **Goal:** Write and run an exhaustive automated verification suite testing every API domain across all 4 `.env` configurations (`shared`/`per_tenant` × `subdomain`/`header_path`) to prove ironclad tenant isolation.
- **Repos:** Backend (`core/tests/`)
- **PRD Acceptance:** AC-06, AC-08, AC-09, AC-10, AC-11, AC-12
- **SCOPE:** Milestone M7; Prerequisite PR-10
- **Deliverables:**
  - `core/tests/test_tenancy_matrix.py`: Automated tests spinning up Tenant A and Tenant B under both `shared` and `per_tenant` DB modes, and both `subdomain` and `header_path` routing modes.
  - Negative penetration tests: Tenant A attempting to read/update/delete Tenant B's students, grades, receipts, PDFs, search results, and AI context via guessed UUIDs, tampered `X-Tenant-Slug` headers, or cross-subdomain JWT replay.
  - OpenAPI 3.1 schema export (`docs/openapi-core.yaml` / `/api/v1/schema/`) documenting `/api/v1/` for the future general frontend.
- **Reviewer Checks:**
  - 100% of cross-tenant intrusion attempts return `403` or `404` with zero data leakage in both `shared` and `per_tenant` modes.
  - All 4 `.env` switch combinations pass CI test runs cleanly.

---

## Sprint 8 — Live Liberian Mobile Money Gateways & Bulk Operations (`demo` + `core`)

### S8.1 — Live Lonestar Cell MTN MoMo Collection API & Verified Webhooks
- **Goal:** Build the fail-closed Lonestar Cell MTN MoMo Collection adapter and verified webhook handler in `core/integrations/mtn_momo.py`, exposing mobile money invoice payment initiation for Bursars and Parents in both `demo` and `core`.
- **Repos:** Backend (`core`, `demo`), Frontend
- **PRD Acceptance:** AC-48, AC-58
- **SCOPE:** Milestone M8; Prerequisite PR-11
- **Deliverables:**
  - `core/integrations/mtn_momo.py`: Request-to-Pay initiation (`POST`), transaction status polling, and HMAC/signature-verified webhook verification; fails closed (`503`) whenever `MTN_MOMO_*` credentials are missing.
  - `MobileMoneyTransaction` model tracking `PENDING`, `SUCCESSFUL`, `FAILED`, `EXPIRED`, linked to `StudentInvoice` and `PaymentReceipt` (created idempotently on verified success).
  - Endpoints: `POST /api/demo/v1/fees/momo/initiate/`, `POST /api/demo/v1/webhooks/mtn-momo/` (and mirrored `/api/v1/...`).
  - Frontend `Pay with MTN MoMo` flow in `FeesScreen` and `ParentPortal` (disabled cleanly when `/integrations/status/` reports unconfigured).
- **Reviewer Checks:**
  - Missing `MTN_MOMO_*` env keys cause initiate and webhook endpoints to fail closed (`503`).
  - Invalid webhook signature returns `401` and creates zero receipts.
  - Valid verified sandbox callback atomically creates a `PaymentReceipt`, updates invoice balance & `ExamClearance`, and queues an SMS receipt. Duplicate callbacks are idempotent.

### S8.2 — Live Orange Money Liberia API & Verified Webhooks
- **Goal:** Build the fail-closed Orange Money Liberia payment adapter and verified webhook handler in `core/integrations/orange_money.py`, wired into both `demo` and `core` invoice payment flows.
- **Repos:** Backend (`core`, `demo`), Frontend
- **PRD Acceptance:** AC-48, AC-58
- **SCOPE:** Milestone M8; Prerequisite PR-12
- **Deliverables:**
  - `core/integrations/orange_money.py`: OAuth token exchange, Web Payment initiation, status check, and signature/token-verified callback handler; fails closed (`503`) when `ORANGE_MONEY_*` credentials are missing.
  - Endpoints: `POST /api/demo/v1/fees/orange-money/initiate/`, `POST /api/demo/v1/webhooks/orange-money/` (and mirrored `/api/v1/...`).
  - Frontend `Pay with Orange Money` flow in `FeesScreen` and `ParentPortal`.
- **Reviewer Checks:**
  - Missing `ORANGE_MONEY_*` env keys fail closed (`503`).
  - Verified webhook settles invoice in LRD (with FX snapshot if USD), updates Exam Clearance, and handles duplicate callbacks idempotently.

### S8.3 — Bulk CSV/Excel Imports (Students, Guardians, Grades & Fee Schedules)
- **Goal:** Enable Registrar and Bursar to onboard existing Liberian schools quickly by uploading validated CSV/Excel templates with dry-run preview, row-level error reporting, and transactional import.
- **Repos:** Backend (`core`, `demo`), Frontend
- **PRD Acceptance:** AC-68
- **SCOPE:** Milestone M8
- **Deliverables:**
  - Downloadable CSV templates (`students_template.csv`, `grades_template.csv`, `fee_schedule_template.csv`).
  - Two-step import endpoints (`POST .../imports/validate/` returning row-by-row validation preview + `POST .../imports/commit/` executing via Celery for large files).
  - Frontend Bulk Import Modal in `StudentsScreen`, `GradesScreen`, and `FeesScreen` using the template's file-dropzone component (`handleUiKitFileDrop` style).
- **Reviewer Checks:**
  - Invalid Liberian phone numbers, unknown grade levels, or out-of-range scores (`>100`) are flagged with exact row/column messages before commit.
  - Valid 500-row student CSV imports cleanly without duplicates and generates sequential student codes.

---

## Sprint 9 — Platform Super Admin Console, Observability, Backups & Production Readiness

### S9.1 — Platform Super Admin Console API (`core`)
- **Goal:** Deliver Platform Super Admin management endpoints for onboarding/suspending tenant schools, inspecting `per_tenant` DB migration health, topping up/auditing school SMS credits, and reviewing global platform audit logs.
- **Repos:** Backend (`core`)
- **PRD Acceptance:** AC-69
- **SCOPE:** Milestone M9
- **Deliverables:**
  - `/api/v1/platform/tenants/` (create + trigger provisioning, list with DB health & active student/staff counts, suspend, reactivate, trigger single-tenant migration).
  - `/api/v1/platform/notifications/health/` & `/api/v1/platform/audit-logs/` restricted strictly to `platform_super_admin`.
  - Complete OpenAPI documentation for Platform Super Admin endpoints.
- **Reviewer Checks:**
  - Non-Super-Admin tokens (including `demo` Principal and `core` school Principals) receive `403` on all `/api/v1/platform/*` endpoints.
  - Suspending a tenant immediately blocks all logins and API calls for that tenant (`403`).

### S9.2 — Observability, Structured Logging & Error Monitoring
- **Goal:** Instrument structured JSON logging with request/tenant/user correlation IDs, optional fail-safe Sentry error reporting, and slow-query/Celery task monitoring.
- **Repos:** Backend, Frontend
- **PRD Acceptance:** Section 7 (Observability)
- **SCOPE:** Milestone M9; Prerequisite PR-13
- **Deliverables:**
  - Request correlation middleware (`X-Request-ID`) and structured JSON log formatter redacting passwords, JWTs, API keys, and webhook secrets.
  - Optional Sentry SDK initialization in backend (`SENTRY_DSN`) and frontend (`VITE_SENTRY_DSN`) that cleanly no-ops when unset.
  - Celery task failure & queue-depth health checks integrated into `/api/ready/`.
- **Reviewer Checks:**
  - Logs emit valid JSON containing `request_id`, `app_scope`, `tenant_slug`, `status_code`, and `duration_ms`, with zero secret leakage.
  - App boots cleanly with `SENTRY_DSN` unset.

### S9.3 — Automated Encrypted PostgreSQL Backups & Restore Drill Scripts
- **Goal:** Deliver production backup automation supporting both `shared` (single central DB) and `per_tenant` (central DB + every active tenant DB) PostgreSQL topologies, uploading encrypted dumps to S3/R2 with a documented restore verification procedure.
- **Repos:** Backend
- **PRD Acceptance:** Section 7 (Data Integrity & Backups)
- **SCOPE:** Milestone M9; Prerequisites PR-01, PR-05
- **Deliverables:**
  - Management command / script `backup_postgres` running `pg_dump --format=custom`, encrypting archives (`age` or AES-256-GCM via `BACKUP_ENCRYPTION_KEY`), and uploading to S3/R2 with 30-day lifecycle metadata (fails closed if `BACKUP_ENCRYPTION_KEY` or S3 config is missing).
  - Celery Beat schedule configuration for daily off-peak Monrovia backup runs (`02:00 Africa/Monrovia`).
  - `docs/OPERATIONS.md` runbook covering restore drill steps, `TENANCY_DB_MODE` / `TENANCY_ROUTING_MODE` switching procedure, and incident response.
- **Reviewer Checks:**
  - Backup script fails closed if `BACKUP_ENCRYPTION_KEY` is missing.
  - Local restore drill successfully dumps, encrypts, decrypts, and restores a test PostgreSQL database with 100% row integrity.

### S9.4 — End-to-End Load, Security & Offline PWA Production Readiness QA
- **Goal:** Execute full production readiness verification across Gojo School (`demo` + React PWA) and General Multi-Tenant SMS (`core`), validating performance targets, RBAC/security hardening, PWA offline stress tests, and deployment checklists.
- **Repos:** Backend, Frontend
- **PRD Acceptance:** All AC-01 through AC-69 & Section 7 NFRs
- **SCOPE:** Milestone M9; Prerequisite PR-10
- **Deliverables:**
  - Synthetic 10,000-student benchmark script verifying P95 API read latency < 250ms on PostgreSQL with verified indexes (`EXPLAIN ANALYZE`).
  - Security audit checklist & automated tests covering CORS, CSRF, cookie flags, rate limiting, SQL injection/XSS, RBAC bypass attempts, and cross-tenant isolation.
  - End-to-end Playwright / browser QA covering full Liberian school day lifecycle (Admissions -> Enroll -> Attendance offline -> Sync -> Gradebook P1–P6 -> WAEC -> PDF Report Card -> LRD/USD Payment -> Receipt Void -> Parent Portal -> Student Portal).
  - Final documentation pass confirming `README.md`, `docs/PRD.md`, `docs/SCOPE.md`, `docs/BACKLOG.md`, and `docs/OPERATIONS.md` are accurate and synced across both repos.
- **Reviewer Checks:**
  - P95 latency benchmark passes (< 250ms) with documented query plans.
  - Full backend test suite (`python manage.py test`) and frontend checks (`npm run lint && npm run build`) pass with zero errors.
  - Full offline-to-online browser QA completes with zero unhandled console errors or lost records.
