# Classes, subjects, and the weekly timetable

Gojo Institute manages classrooms, Liberia MoE subjects, a Monday–Friday 8-period timetable, teacher absences, and same-day substitutions at `/api/demo/v1/`. The Classes & Timetable pane is wired to these endpoints with no fixture fallback.

## Who can do what

| Action | Principal | Registrar | Bursar | Teacher | Parent / Student |
|---|---|---|---|---|---|
| Read classrooms, subjects, timetable, uncovered slots | Yes | Yes | Yes | Own assignments only | Empty list |
| Create / update / delete classrooms, subject assignments, slots, absences, substitutions | Yes | Yes | No | No | No |

A teacher sees a classroom when they are its homeroom teacher, a subject teacher on that classroom, a weekly slot teacher, or a substitute for one of its slots.

## Subjects

`GET /api/demo/v1/subjects/` returns the MoE catalog: Mathematics, English Language, General Science, and Social Studies as core; Physics, Chemistry, Biology, Liberian History, Literature, Economics, French, and Computer Science as electives; WAEC Practical Labs as a WAEC lab subject.

A classroom’s subject list is the full set of subjects that class’s students take. `GET` and `PUT /api/demo/v1/classes/<id>/subjects/` replace that list. Dropping a subject that still appears on a timetable slot is rejected with `400`.

## Classrooms

`GET` / `POST /api/demo/v1/classes/`, and `GET` / `PATCH` / `DELETE /api/demo/v1/classes/<id>/`, manage sections. Each classroom has a campus, academic year, grade level, section name, optional homeroom teacher, capacity, and home room label. The display name is the grade plus section (for example `Grade 6A`).

Deleting a classroom cascades its subject assignments, timetable slots, and substitutions. Teacher absences are not deleted.

`GET /api/demo/v1/classes/teachers/?campus=` lists active demo users with the teacher role for pickers.

The seed creates Paynesville Grades 1–12 sections A and B for the current academic year, with room labels `1A` through `12B`. Sinkor and Gardnersville start with no classrooms.

## Weekly timetable

`GET` / `POST /api/demo/v1/timetable/`, and `PATCH` / `DELETE /api/demo/v1/timetable/<id>/`, manage slots. Filter with `?classroom=` or `?teacher=`.

Each slot has a classroom, day (`monday`–`friday`), period `1`–`8`, a subject already assigned to that classroom, an optional teacher, and a room label. Free periods have no slot.

Saving a slot returns `400` when the teacher or non-blank room label is already used on the same campus for that day and period. Conflict messages name the day, period (for example `Monday 2nd Period`), and the other classroom.

## Uncovered slots, absences, and substitutions

`GET /api/demo/v1/timetable/uncovered/?date=` lists slots for that weekday (default: today in `Africa/Monrovia`) where the teacher is missing or marked absent and no substitute is assigned. The response includes `count`.

`POST /api/demo/v1/timetable/absences/` upserts an absence for a teacher and date. `DELETE /api/demo/v1/timetable/absences/?teacher=&date=` (or `?id=`) clears it.

`GET` / `POST /api/demo/v1/timetable/substitutions/` log a substitute for a slot and date. The substitute cannot be the permanent teacher and cannot already be teaching or substituting that period. Assigning a substitute removes that slot from the uncovered list for that date. A null-teacher slot may receive a same-day substitute without an absence row.

## Client

The Classes & Timetable pane has Classrooms and Weekly Timetable subtabs, a classroom inspector for identity and subject assignments, a slot editor modal, and an uncovered-slot workflow for absences and substitutes. Teachers do not see create or substitute controls.
