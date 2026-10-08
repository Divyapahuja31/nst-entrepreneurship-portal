# NST Entrepreneurship Portal

Students run startups and track them with KPIs and bi-weekly reports. Mentors and the academic board review and grade them.

- `backend/`: Express 5 and Mongoose (MongoDB) API on port 4000
- `frontend/`: React 19 and Vite on port 5173, proxying `/api` to the backend
- `shared/`: rules both sides use. `permissions.js` decides who may do what.

## Setup

```sh
npm install
cp backend/.env.example backend/.env   # then fill it in
npm run seed:all -w backend            # roles, campus, batches, industries
npm run dev                            # backend and frontend together
```

## Roles and permissions

Every account has exactly one of four roles.

| Role | Who | Purpose |
|---|---|---|
| Admin (`admin`) | Program leads | Everything the academic board can do, plus accounts and roles |
| Academic Board (`academic_board`) | Faculty | Final evaluation authority: reviews every startup and is the only role that can unlock a final grade |
| Mentor (`mentor`) | Newton School staff | Reviews only the startups assigned to them, until a grade is locked |
| Student (`student`) | ADYPU students | Works on their own startup: KPIs, evidence, bi-weekly reports and applications |

Staff means admin, academic board and mentor. The board means admin and academic board.

### Who may do what

| Action | Admin | Academic Board | Mentor | Student |
|---|:-:|:-:|:-:|:-:|
| Staff pages (`/admin/*`) | ✅ | ✅ | ✅ | ❌ |
| Accounts & Roles: list, create, deactivate, change roles (never their own, never the last admin) | ✅ | ❌ | ❌ | ❌ |
| Read the account activity log | ✅ | ❌ | ❌ | ❌ |
| Read startups, KPIs, bi-weekly reports, founders, overview | all | all | assigned startups | own startup |
| Create a startup (Add Founder) | ✅ | ✅ | as its mentor | ❌ |
| Assign a startup's mentor, remove founders | ✅ | ✅ | ❌ | ❌ |
| Approve a startup proposal | ✅ (picks a mentor) | ✅ (picks a mentor) | ✅ (becomes its mentor) | ❌ |
| Review a request to join a startup | ✅ | ✅ | assigned startups | ❌ |
| Create a KPI | any startup | any startup | assigned startups | own startup; personal KPIs only for themselves |
| Edit or delete a KPI | any, even locked | any, even locked | assigned, while unlocked | own, while a draft, awaiting approval or rejected, not locked or past due |
| Accept, reject, grade or re-grade a KPI | any, even locked | any, even locked | assigned, while unlocked | ❌ |
| Lock a graded KPI (its grade becomes final) | ✅ | ✅ | assigned | ❌ |
| Unlock a KPI | ✅ | ✅ | ❌ | ❌ |
| Add progress or upload evidence | ❌ | ❌ | ❌ | own KPI, while not locked, graded or past due |
| Remove evidence | ✅ | ✅ | ❌ | own KPI, under the same conditions |
| Submit a bi-weekly report | ❌ | ❌ | ❌ | own startup, until submitted |
| Write bi-weekly observations and evaluations | ✅ | ✅ | assigned startups | ❌ |
| Reopen a submitted bi-weekly report | ✅ | ✅ | ❌ | ❌ |
| Connect a Google Calendar | ❌ | ❌ | ✅ | ❌ |
| Schedule, move or cancel check-ins | ❌ | ❌ | assigned startups | ❌ |
| Read check-ins | all | all | assigned startups | own startup |

### How it is enforced

- The rules live once, in [`shared/permissions.js`](shared/permissions.js). The API calls them on data it loads from MongoDB ([`backend/utils/access.js`](backend/utils/access.js)) and never trusts a role or flag sent by the browser. The API is the only way to the database, so it is the real enforcement.
- The UI calls the same functions only to hide controls a user can't use, and every protected route lists the roles it allows (`<RequireRole allow={...}>`).
- Locking is atomic: a mentor's grade can't land on a KPI the board locked a moment earlier.

### Assigning roles

- **Sign-up:** `@newtonschool.co` accounts start as mentors and everyone else as students. Admin and academic board are never inferred from an email.
- **Changes:** an admin uses **Accounts & Roles** (`/admin/accounts`). They can't change or deactivate their own account, and the last admin can't be demoted or deactivated. Every role change, new account and deactivation is written to an audit log that only admins can read.
- **Deactivation** keeps the record (KPIs and reviews point at it), signs the person out everywhere, removes them from their startup and leaves the startups they mentored without a mentor until the board assigns one.

### The first admin

Nothing in the app can create the first admin. Once the person has signed up, run:

```sh
npm run make-admin -w backend -- someone@newtonschool.co
```

### Upgrading an existing database

Before deploying this version, run the migration once. It's safe to run again.

```sh
npm run migrate:rbac -w backend
```

It renames the old `academic board` role to `academic_board`, creates any missing roles, makes accounts without a valid role students and gives every KPI an unlocked flag. Existing admins stay admins.

Bi-weekly reports belong to the startup, like its KPIs, and are shared by its co-founders: one report per startup per cycle. Older reports were filed per founder, so move them once:

```sh
npm run migrate:biweekly -w backend -- --dry-run   # shows what would change
npm run migrate:biweekly -w backend
```

It moves each founder's report onto the startup they are in (or were in most recently). When a startup ends up with two reports for one cycle, it keeps the submitted one, which takes over any review only the other had. A report it can't keep, such as a second report for a cycle or one from a founder who never joined a startup, is copied to `biweeklysubmissions_archive` instead of being deleted. It's safe to run again.

## Email notifications

Emails go through Resend ([`backend/utils/emailProvider.js`](backend/utils/emailProvider.js)) and need `RESEND_API_KEY` and `EMAIL_FROM` (on a domain verified in Resend). Without them nothing is sent and each attempt is logged as failed. Links in emails point at `APP_URL`, or `FRONTEND_URL` if it isn't set.

| When | Who | Email |
|---|---|---|
| A KPI's grade is locked | Its founder, or every active founder for a startup-wide KPI | The result, with score and status |
| That grade is the second in a row below 70% | The startup's mentor | Follow-up (above 40%) or low score (40% or below) |
| That grade is the second in a row at 40% or below | Every academic board member | Low-score notification with the student, batch and mentor |
| Sign-up and forgot password | The account | The 6-digit code |

- Grades count in order of due date, separately for the startup as a whole and for each founder's own KPIs. Once an alert is sent its count starts again from zero ([`kpiEscalation.js`](backend/utils/kpiEscalation.js)).
- A startup without a mentor has its mentor alerts sent to the board instead, and a board member who already got the low-score alert for that KPI isn't emailed again.
- The emails go out on the server after a successful lock, never from the browser, and one failed email doesn't stop the others.
- Every email is logged (the `EmailNotification` model) as pending, then sent or failed. A recipient gets at most one sent email of each type per KPI; a unique index enforces it, and a failed email can be retried. Admins read the whole log at `GET /api/notifications/emails`, anyone else only their own emails.
- In development, `/api/dev/emails` (also on the Vite port) shows every template with sample data and a score slider.

To create the log's indexes on an existing database, run this once. It's safe to run again.

```sh
npm run migrate:email -w backend
```

## Mentor check-ins (Google Calendar and Meet)

A startup's mentor schedules bi-weekly check-ins from the startup's **Check-Ins** tab. Each one is an event with a Google Meet link on the mentor's own Google Calendar, and every active founder of the startup is invited, so it appears on their calendars too. A check-in is one-off or repeats every two weeks, one per cycle, through cycle 13. Each occurrence can be moved or cancelled on its own, and a recurring check-in can be ended.

- Only the startup's mentor schedules, because the events live on their calendar. Founders see their check-ins at `/checkins` and on their overview. Staff see them on the startup and on each founder's profile. Each cycle's check-in also shows beside its bi-weekly report.
- Google is written first. If it refuses a change, the portal saves nothing and shows Google's reason.
- When a startup's mentor changes, or the mentor is deactivated or loses the mentor role, their upcoming check-ins for it are cancelled. Removing them from Google is best effort.
- The invitees are the active founders when a check-in is scheduled or moved. A founder who joins later is invited from the next one that is scheduled or moved.

### Transcripts and notes

After each check-in the server looks for its Google Meet transcript through the mentor's connection ([`transcriptPoller.js`](backend/utils/transcriptPoller.js)). It first looks 15 minutes after the check-in should end, then again with longer gaps, and stops after two days. Each check-in then reads as held (someone joined) or not held, and its transcript as ready or unavailable. Anyone who can read the startup can read the transcript, with speaker names, under **Transcript** on a past check-in. The mentor can also write notes there, and press **Check Now** instead of waiting.

- Meet only makes a transcript when someone turns transcription on during the meeting (Activities, then Transcripts), or when the Workspace turns it on by default. That needs a Google Workspace edition with Meet transcripts. Without one, every check-in ends up with no transcript, and the mentor's notes are the record.
- Meet keeps a meeting's records for 30 days, so a transcript that arrives later than that is never collected.
- A very long transcript is cut at about 1 MB of text. The full one stays in the mentor's Google Drive.
- With more than one server, each check-in is claimed before it is fetched, so it is only fetched once.

### Setting up Google

1. In the Google Cloud project, enable the **Google Calendar API** and the **Google Meet REST API**.
2. Create an OAuth client (Web application) for mentors, with the redirect URI `<API origin>/api/google/callback` (for example `http://localhost:4000/api/google/callback`). Set its consent screen to **Internal** in the newtonschool.co Workspace if you can. Mentors are all Newton School staff, and an internal app needs no Google verification for these scopes. The scopes are `openid`, `email`, `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/meetings.space.readonly` (for transcripts).
3. Set `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET` and `GOOGLE_WORKSPACE_REDIRECT_URI` in `backend/.env`. Without them the sign-in client (`GOOGLE_CLIENT_*`) is used, which then needs the scopes and redirect URI above. Students would see a consent screen asking for calendar access only if they reached the connect route, which is for mentors only.
4. Set `GOOGLE_TOKEN_KEY` to 32 random bytes (`openssl rand -base64 32`, or `-hex 32`). Mentors' refresh tokens are encrypted with it. Changing it means every mentor connects again.

Each mentor then clicks **Connect Google Calendar** once, the first time they schedule. They must use the Google account they sign in to the portal with. If Google later refuses the connection (revoked, or the password changed), the portal asks them to connect again.

## Tests

```sh
npm test
```

- `shared/permissions.test.js` checks every rule against the matrix above, for every role, startup relationship, lock state and status.
- `backend/tests/` signs in as each role against an in-memory MongoDB and checks that the API enforces the same rules.
- `backend/tests/kpiEscalation.test.js` checks when a run of grades alerts the mentor or the board, and the `emailService` and `kpiLockEmails` tests check logging, deduplication and who gets which email. Tests never reach Resend.
- `backend/tests/checkins.test.js`, `googleConnect.test.js` and `transcripts.test.js` check scheduling, recurring check-ins, who may do what, connecting a calendar and collecting transcripts against a fake Google ([`tests/helpers.js`](backend/tests/helpers.js)). Tests never reach Google.

The first run downloads a MongoDB binary for the tests.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and, for UI work, [DESIGN.md](DESIGN.md). A change to who may do what updates `shared/permissions.js`, its tests and the table above together.
