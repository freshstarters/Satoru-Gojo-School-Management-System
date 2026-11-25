# Teachers, staff, and guardians

Gojo Institute keeps the faculty directory and guardian contacts at `/api/demo/v1/teachers/` and `/api/demo/v1/parents/`. The Teachers & Staff and Parents & Guardians panes are wired to these endpoints with no fixture fallback.

## Who can do what

| Action | Principal | Registrar | Bursar | Teacher | Support |
|---|---|---|---|---|---|
| List / open staff | Yes | Yes | Yes | Yes | Yes |
| Create / update / invite / deactivate staff | Yes | No | No | No | No |
| List / open guardians | Yes | Yes | Yes | Assigned classrooms only | Yes |
| Create / update / link / invite / deactivate guardians | Yes | Yes | No | No | No |
| Family balance line | Yes | Yes | Yes | Hidden | Hidden |

A parent account may read and patch only their own guardian profile through the API. This story does not add the Parents pane to the parent role.

## Staff records

`POST /api/demo/v1/teachers/` creates a staff profile. The server allocates a unique `STF-YYYY-NNNN` code. Fields: full name, portal role (`principal`, `registrar`, `bursar`, `teacher`, `support_staff`), optional job title, optional school division (Early Childhood, Elementary, Junior High, Senior High), optional campus, qualifications, required `+231` phone, required email, employment status.

The staff backfill leaves the phone blank when the account has no phone, and clears a shared placeholder from rows it already created. The directory shows an em dash for a blank phone. Creating a staff profile through the API still requires a real `+231` phone.

Homerooms and subject assignments are read from Classes & Timetable (`Classroom.homeroom_teacher` and `ClassSubjectAssignment`). The Assignments inspector tab is read-only.

Soft-deactivation sets employment to `inactive` and disables the linked login when one exists. Timetable, homeroom, and subject rows keep their teacher user FK. Reactivate restores employment and turns the login back on only when that user already has a usable password. Inactive staff stay in the directory.

`POST /teachers/<id>/send-invite/` calls the core invite service (`DOOR_DEMO`). Portal status is derived: `inactive`, `invited` (live `InviteToken`), `active`, or `not_invited`.

## Guardian records

`POST /api/demo/v1/parents/` creates a guardian. Relationship lives on each child link (`mother`, `father`, `guardian`, `uncle`, `aunt`, `other`), with an optional note only when relationship is `other`. Flags: `is_primary` (at most one per student; the first link becomes primary when none exists) and `is_financial_responsible` (more than one allowed). SMS consent defaults to opted in.

`family_balance_lrd` is `null` until fee invoices exist. The Children tab still shows the Family balance line as `—` for principal, registrar, and bursar.

Deactivating a guardian mirrors staff: status `inactive`, login disabled, child links kept. A new child link to an inactive guardian returns `400`.

## Frontend

Opening a staff member goes to `/teachers/<id>`; a guardian to `/parents/<id>`. The inspector subtab is in `?tab=` (`profile` default omitted; `assignments` / `children` / `account`). Refresh reopens the same person and subtab.

## Backfill

Existing demo staff-role users are not directory rows until:

```bash
python manage.py backfill_demo_staff
```

That command is idempotent on `StaffProfile.user`. Division is taken from the teacher's homeroom classroom when one exists.
