# Guardian and student portals, mobile money, and offline synchronization

Gojo Institute provides dedicated consumer-facing portal views for parents and students, interactive Liberian mobile money collections, and offline resilience with conflict resolution.

## Guardian and student portals

### Guardian portal

Authenticated parents and guardians access a streamlined interface scoped to their linked children.

- **Child switcher**: Guardians with multiple enrolled children can switch between active profiles (for example, switching between Ezekiel Kollie in Grade 6A and Blessing Kollie in Grade 3B) with immediate updates across attendance metrics, fee balances, and grade summaries.
- **Attendance and timetable**: Displays daily roll-call records (Present, Absent, Tardy, Excused), homeroom contact information, and daily transportation stops.
- **Academic evaluations**: Displays 6-period evaluation scores, semester examination averages, and class rank, alongside an official printable report card preview.
- **Tuition ledger and payments**: Itemizes billed tuition against verified payments received, displaying the outstanding balance in Liberian Dollars (LRD) with optional United States Dollar (USD) reference, and offers direct checkout via mobile money.
- **Notices and inquiries**: Shows campus announcements and allows guardians to submit direct inquiry notes to teachers, bursars, or administrators.

### Student portal

Authenticated students access a read-only portal:
- An 8-period weekly schedule with subject titles, room assignments, and instructor names.
- Term progress reports and grade averages.
- Issued library book loans with barcodes, checkout dates, and due dates.
- Transportation assignment details including assigned route number and pickup stop times.

## Liberian mobile money collections

The tuition workflow supports direct collections through Lonestar Cell MTN Mobile Money and Orange Money Liberia.

- **Carrier selection**: Operators or guardians specify either Lonestar MTN MoMo (USSD service code `*156#`) or Orange Money Liberia (USSD service code `*144#`).
- **Collection prompt**: Dispatches an interactive USSD push prompt to the subscriber's Liberian mobile number (`+231`).
- **Settlement and receipts**: Upon subscriber PIN confirmation, the system confirms payment, updates the invoice balance, generates a unique numbered payment receipt, and grants the student semester examination clearance.

## Admissions conversion wizard

Accepted applicants in the admissions pipeline transition into enrolled students through a guided enrollment workflow:
- Verifies entrance exam scores and applicant profile.
- Assigns an official student identification number (`STU-` prefix), campus, division, and homeroom section.
- Links guardian account contacts and binds the student to the active grade-level fee schedule.
- Immediately reflects the student across directory searches, grade registers, and enrollment counters.

## Progressive web app offline mode and synchronization

For campuses operating with intermittent power and internet connectivity, client state is preserved through Service Worker asset caching and IndexedDB data storage.

- **Status indicator**: The top navigation bar displays real-time connectivity status (online, offline with pending mutation count, or synchronization conflict).
- **Offline outbox queue**: Create, update, and delete actions performed while offline (such as marking homeroom attendance or recording conduct notes) are saved locally and queued with an idempotency key.
- **Synchronization**: Once network connectivity is restored, queued mutations drain in first-in, first-out sequence.
- **Conflict resolution**: When concurrent mutations trigger a version conflict, the interface presents a side-by-side comparison between the local mutation and the remote server state, allowing the operator to keep the local change, accept the server value, or record a manual merge.
