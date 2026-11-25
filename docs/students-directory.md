# Students directory

Gojo Institute keeps the student roster, welfare & authorized pickup list, and conduct notes at `/api/demo/v1/students/`. The Students Directory pane is wired to these endpoints with no fixture fallback.

## Who can do what

| Action | Principal | Registrar | Bursar / Support | Teacher |
|---|---|---|---|---|
| List / open students | Yes | Yes | Yes (read) | Assigned classrooms only |
| Enroll / update profile / withdraw | Yes | Yes | No | No |
| Welfare & authorized pickup | Yes | Yes | Read | Homeroom teacher of that student (or `last_homeroom_teacher` after withdraw) |
| Conduct notes | Yes | Yes | Read | Assigned classrooms only; otherwise `403` |

Assigned classrooms match the Classes pane rule: homeroom, subject teacher, or timetable teacher.

## Student records

`POST /api/demo/v1/students/` enrolls a student (full name, campus, classroom, date of birth, gender; catchment optional). The server allocates a unique `GI-YYYY-NNNN` code for the Monrovia calendar year.

Statuses: `active`, `honor_roll`, `at_risk`, `withdrawn`, `graduated`. WAEC candidacy is a separate `is_waec_candidate` flag (Grade 9 / Grade 12 only; cleared when the classroom is not those grades).

Withdraw sets status to `withdrawn`, clears `current_classroom`, and snapshots `last_homeroom_teacher` from the previous homeroom.

Guardian links, fee invoices, attendance %, yearly average, exam clearance, and LRD balance are not part of this screen yet. Those fields return `null` and the UI shows `—`.

## Filters and summary

`GET /api/demo/v1/students/` supports `q`, `campus`, `division`, `grade`, `classroom`, `status`, and pagination (`page`, `page_size`).

The default list (no status filter) is Active + Honor Roll + At Risk. Status `waec_candidate` filters `is_waec_candidate=true`. Withdrawn / Graduated appear only when selected.

The response includes a `summary` object: `total`, `at_risk`, `waec_candidates`, `honor_roll` for the default-visible set under the same non-status filters.

## Welfare, pickup, conduct

- `GET` / `PUT /students/<id>/welfare/`
- `GET` / `POST /students/<id>/pickups/`, `PATCH` / `DELETE .../pickups/<pickup_id>/` — Liberian phones normalize to `+231…`
- `GET` / `POST /students/<id>/conduct/` — types Merit / Incident / Homeroom Note; severity Low / Medium / High

## Photos and object storage

Student photos use the default Django storage backend from `STORAGE_BACKEND`:

- `s3` — private Cloudflare R2 / S3 objects; API returns a ~24-hour presigned GET URL as `photo_url`
- `local` — only when `DEBUG=True`

Missing S3 credentials fail closed with `ImproperlyConfigured`. Run `manage.py` from the backend project directory so `.env` loads (`DATABASE_URL` on Postgres `127.0.0.1:5433`, storage keys, and the rest).

## Frontend

The Students pane owns its header. Opening a student navigates to `/students/<id>` so refresh and shared links reopen the same inspector (Profile & Academics, Welfare & Pickup, Conduct & Notes).

## Backfill

Existing demo `role=student` users are not roster rows until:

```bash
python manage.py backfill_demo_students
```

That command is idempotent on `Student.user`. It restores each campus’s seeded `grades_served` (Gardnersville stays Nursery/ABC/K1/K2; Sinkor and Paynesville stay Grades 1–12), creates A/B classrooms only for those grades, removes out-of-scope rooms, assigns campus-matched homeroom teachers, and creates or reassigns Student rows with age-appropriate dates of birth.
