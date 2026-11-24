# School settings

Gojo Institute keeps one school profile, a campus list, and an academic calendar. The client reads and writes them at `/api/demo/v1/`.

## Who can change what

| Action | Principal | Registrar | Bursar | Other roles |
|---|---|---|---|---|
| Read settings, campuses, academic years, grade levels, and integration health | Yes | Yes | Yes | No |
| Change the school name, MoE registration code, campuses, academic years, and the active marking period | Yes | No | No | No |
| Change the LRD per USD rate, pass threshold, honor-roll threshold, and grading weights | Yes | No | Yes | No |

A Bursar request that includes any Principal-only field is rejected and saves nothing. Creating or deleting a campus or an academic year is Principal-only.

## Profile and calendar

`GET` and `PATCH /api/demo/v1/settings/` return the school name, MoE registration code, exchange rate, pass threshold, honor-roll threshold, marking-period weight, semester-exam weight, the current academic year, and the active marking period.

The two grading weights must sum to 100. The exchange rate must be greater than zero. The active marking period must be Period 1 through Period 6. `SEM1_EXAM` is the 3rd period exam, which is the semester 1 exam. `SEM2_EXAM` is the 6th period exam, which is the semester 2 final. Those exams have dates and a lock flag, and they cannot be the active period.

`GET` and `POST /api/demo/v1/campuses/`, and `GET`, `PATCH`, and `DELETE /api/demo/v1/campuses/<id>/`, manage campuses. Each campus has a name, address, catchment zone, a lead name, the grade levels it serves, and counts of student and teacher logins assigned to it. The last campus cannot be deleted. A campus that still has a login assigned to it cannot be deleted until those people are moved.

`GET` and `POST /api/demo/v1/academic-years/`, and `GET`, `PATCH`, and `DELETE /api/demo/v1/academic-years/<id>/`, manage years. Marking periods are nested on the year. The current year cannot be deleted. Deleting another year deletes its marking periods.

`GET /api/demo/v1/grade-levels/` lists Nursery, ABC, K1, K2, and Grade 1 through Grade 12.

The seeded profile is Gojo Institute, academic year 2026/2027, active Period 2, rate 192 LRD per 1 USD, pass 70, honor roll 85, and weights 60 and 40. Campuses are Sinkor Main Campus (Grades 1–12), Paynesville Campus (Grades 1–12), and Gardnersville Campus (Nursery, ABC, K1, and K2).

## Integration health

`GET /api/demo/v1/integrations/status/` reports `configured` or `unconfigured` for email SMTP, the SMS gateway, WhatsApp, Google Sign-In, AI Assist, Lonestar MTN MoMo, and Orange Money. The SMS sender ID is included when it is set. Provider names for AI Assist are included when set. Secrets, tokens, and passwords are never included. A missing key is `unconfigured`.

## Local population

`python manage.py seed_gojo_demo` still creates the four staff logins when `DEBUG` is true and `SEED_GOJO_PASSWORD` is set. It also creates campus logins: 400 students and 12 teachers at Gardnersville, 2,400 students and 80 teachers at Paynesville, and 1,800 students and 60 teachers at Sinkor. Grace Johnson is the thirteenth Gardnersville teacher. Display names come from a fixed name pool and may repeat. Emails do not. Running the command again does not duplicate rows and does not change an existing password or display name.
