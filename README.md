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
| Mentor (`mentor`) | Newton School staff | Reviews only the startups assigned to them, until a grade is locked. A startup can have several mentors, each with the same rights over it |
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
| Assign a startup's mentors, remove founders | ✅ | ✅ | ❌ | ❌ |
| Approve a startup proposal | ✅ (picks its first mentor) | ✅ (picks its first mentor) | ✅ (becomes its first mentor) | ❌ |
| Review a request to join a startup | ✅ | ✅ | assigned startups | ❌ |
| Create a KPI | any startup | any startup | assigned startups | own startup; personal KPIs only for themselves |
| Edit or delete a KPI | any, even locked | any, even locked | assigned, while unlocked | own, while a draft, awaiting approval or rejected, not locked or past due |
| Accept, reject, grade or re-grade a KPI | any, even locked | any, even locked | assigned, while unlocked | ❌ |
| Lock a graded KPI (its grade becomes final) | ✅ | ✅ | assigned | ❌ |
| Unlock a KPI | ✅ | ✅ | ❌ | ❌ |
| Add progress or upload evidence | ❌ | ❌ | ❌ | own KPI, while not locked, graded or past due |
| Remove evidence | ✅ | ✅ | ❌ | own KPI, under the same conditions |
| Submit a bi-weekly report | ❌ | ❌ | ❌ | own startup, until submitted or past its deadline (unless reopened) |
| Write bi-weekly observations and evaluations | ✅ | ✅ | assigned startups | ❌ |
| Reopen a submitted bi-weekly report | ✅ | ✅ | ❌ | ❌ |
| Set up the programme: calendar, staff, who is invited, sessions | ✅ | ❌ | ❌ | ❌ |
| Add, change or cancel extra sessions on any day | ✅ | ✅ | ❌ | ❌ |
| Connect a Google Calendar | ✅ | ❌ | ✅ | ❌ |
| Schedule, move or cancel their own check-ins | ❌ | ❌ | assigned startups | ❌ |
| Notes and "Check Now" on a programme meeting | ✅ | the meetings they run | the meetings they run | ❌ |
| Read check-ins | all | all | assigned startups, and meetings they run | own startup |

### How it is enforced

- The rules live once, in [`shared/permissions.js`](shared/permissions.js). The API calls them on data it loads from MongoDB ([`backend/utils/access.js`](backend/utils/access.js)) and never trusts a role or flag sent by the browser. The API is the only way to the database, so it is the real enforcement.
- The UI calls the same functions only to hide controls a user can't use, and every protected route lists the roles it allows (`<RequireRole allow={...}>`).
- Locking is atomic: a mentor's grade can't land on a KPI the board locked a moment earlier.

### Assigning roles

- **Sign-up:** only emails from the domains an admin allows on **School Setup** (`/admin/setup`) can sign up or sign in with Google; a new database starts with `@newtonschool.co` and `@adypu.edu.in`. Accounts from a domain marked Mentor (`@newtonschool.co` at first) start as mentors and everyone else as students. Mentors aren't asked for a campus or batch at sign-up; students choose both. Admin and academic board are never inferred from an email. School Setup is also where admins add campuses and batches.
- **Changes:** an admin uses **Accounts & Roles** (`/admin/accounts`). Staff have no campus or batch, so making someone staff clears theirs, and making a staff member a student asks for their batch. They can't change or deactivate their own account, and the last admin can't be demoted or deactivated. Every role change, new account and deactivation is written to an audit log that only admins can read.
- **Deactivation** keeps the record (KPIs and reviews point at it), signs the person out everywhere, removes them from their startup and takes them off the startups they mentored. Those startups keep their other mentors; one left with none has no mentor until the board assigns one.

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

It renames the old `academic board` role to `academic_board`, creates any missing roles, makes accounts without a valid role students, gives every KPI an unlocked flag and clears the campus and batch that staff were once asked for at sign-up. Existing admins stay admins.

Bi-weekly reports belong to the startup, like its KPIs, and are shared by its co-founders: one report per startup per cycle. Older reports were filed per founder, so move them once:

```sh
npm run migrate:biweekly -w backend -- --dry-run   # shows what would change
npm run migrate:biweekly -w backend
```

It moves each founder's report onto the startup they are in (or were in most recently). When a startup ends up with two reports for one cycle, it keeps the submitted one, which takes over any review only the other had. A report it can't keep, such as a second report for a cycle or one from a founder who never joined a startup, is copied to `biweeklysubmissions_archive` instead of being deleted. It's safe to run again.

## Bi-weekly reports

A startup's report for each 14-day cycle is due 3 days after the cycle's last day. The API enforces the same rules as the page:

- A report can be saved once its cycle has started, and not after its deadline. A cycle the board reopens, submitted or missed, can be edited and submitted again whatever its deadline.
- Submitting needs a progress summary. The numbers (hours, interviews, revenue and so on) must be 0 or more.
- Observations need notes, and faculty review only cycles that have started.
- The monthly evaluation scores four pillars from 0 to 100 and weighs them 40/25/20/15 (Execution, Customer, Business, Behaviour) into a total out of 100, as on the Methodology page ([`shared/evaluationScore.js`](shared/evaluationScore.js)). It is on track at 70 or more with no pillar under 50, needs attention at 50 to 69 or with one pillar under 50, and is at risk below 50 or with two pillars under 50.

## Email notifications

Emails go through Resend ([`backend/utils/emailProvider.js`](backend/utils/emailProvider.js)) and need `RESEND_API_KEY` and `EMAIL_FROM` (on a domain verified in Resend). Without them nothing is sent and each attempt is logged as failed. Links in emails point at `APP_URL`, or `FRONTEND_URL` if it isn't set.

Under `npm run dev` nothing is sent: each email is printed in the backend's terminal with its recipient, subject and text, so you can sign up made-up accounts and read their codes there. `npm start` sends as usual. `EMAIL_PROVIDER=resend` (or `console`) in `backend/.env` overrides the choice.

| When | Who | Email |
|---|---|---|
| A KPI's grade is locked | Its founder, or every active founder for a startup-wide KPI | The result, with score and status |
| That grade is the second in a row below 70% | Every mentor of the startup | Follow-up (above 40%) or low score (40% or below) |
| That grade is the second in a row at 40% or below | Every academic board member | Low-score notification with the student, batch and mentors |
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

## The programme (bi-weekly sessions)

An admin runs the programme from **Programme** (`/admin/programme`). It sets one calendar for every startup:

- **Reports start** on a date the admin sets under **Bi-weekly Reports**, apart from the sessions. Cycle 1 of every startup's reports opens that day, so the reports can open before or after the sessions. It's saved on its own and needs no Google connection. Until it's set, the reports follow the sessions' start date, and before the programme is saved too, each startup's reports count from the day it was created. Reports already filed keep their cycle numbers.
- **Sessions start** on another date the admin chooses, with **one session every other week** on the chosen day and between the chosen times (Thursday 6–8 pm by default, in the chosen time zone). That gives 13 sessions. Each session's meetings are labelled with the report cycle they fall in, if any.
- **Meeting staff:** the people who run the sessions. They can be any admins, academic board members or mentors, including the admin. Who mentors a startup doesn't matter here.
- **Who is invited:** every startup with active founders, and all their founders, unless the admin switches a startup or a founder off. New startups and founders are invited automatically.
- **Mode:**
  - **Slots:** each startup meets one staff member in its own slot (15 minutes by default, with an optional gap between slots and before the first). The staff run their slots in parallel. Startups are dealt at random and evenly across the staff, drawn again for every session. Saving refuses settings that leave too few slots for the invited startups.
  - **Group:** one meeting for the whole session, with every invited founder and all the staff.

Each session is scheduled a few days before it (7 by default, "Schedule ahead"). The meetings are drawn, created as events with Meet links on the admin's Google Calendar, and every staff member and founder is invited and emailed their time and link. The events go on the **calendar host's** Google Calendar: the first admin to connect Google on **Programme** or **Extra Sessions** (either page, the same connection), or else the admin who first saves the programme. Another admin takes over only once the host can't be used: their connection is gone, or they were deactivated or are no longer an admin. A host who can't be used schedules nothing more. When another admin takes over, the upcoming meetings move to their calendar with new Meet links, and their people are emailed. The old events are deleted through the former host's connection if it still works; otherwise they stay on people's calendars. The academic board schedules through the host's connection. An admin can also **Schedule Now**, **Redraw** or **Cancel** each session.

Later changes don't start the draw again. A new time, gap or length moves the meetings, and adding or removing staff, startups or founders moves only what it has to. Only people whose meeting changed get an email, and anyone removed gets a cancellation. If a staff member is deactivated, save the programme or redraw to move their startups.

Programme meetings show on each startup's Check-Ins tab and on founders' pages. Each staff member sees the meetings they run on their Overview, where they can read the transcript and write notes. Transcripts are collected through the admin's connection. A group session's transcript is collected once and attached to every startup in it.

### Extra sessions

Besides the 13 bi-weekly sessions, an admin or the academic board can add a session on any day from **Extra Sessions** (`/admin/sessions`), for a demo day rehearsal or a one-off review, say. Each runs like a bi-weekly session, with its own settings for that day:

- A title, the day and the times, in the programme's time zone.
- Slots or one group meeting, with its own slot length and gaps.
- Its own meeting staff, starting from the programme's.
- Its own invite list, starting from the programme's. Startups and founders can be switched off for that one day.

It needs no bi-weekly programme. It's scheduled as soon as it's saved, and its meetings go on the calendar host's Google Calendar (see above), so an admin must have connected Google first. Before there is a host, a connected admin who adds one becomes it. Everyone in it is invited and emailed, with the session's title in the emails and invites. It can be changed or cancelled until it starts: a change emails only the people whose meeting moved, and a cancellation tells everyone. Its meetings show with the startups' check-ins, and transcripts and notes work as for the bi-weekly sessions. **Clear All Meetings** on Programme leaves extra sessions alone.

Extra sessions have no session number. The unique index on session numbers from before them is replaced the first time one is added.

## Mentor check-ins (Google Calendar and Meet)

Besides the programme, each of a startup's mentors can schedule their own check-ins with it.

A startup's mentors hold check-ins from the startup's **Check-Ins** tab: **Meet Now** starts one at once and opens Meet, and **Schedule** puts one at any future time. Check-ins are the mentor's own meetings, apart from the bi-weekly cycles and reports. Each one is an event with a Google Meet link on the mentor's own Google Calendar, and every active founder of the startup is invited, so it appears on their calendars too. Each check-in is a single meeting that can be moved or cancelled. Check-ins that repeated, from before repeating was removed, can still be moved, cancelled or ended.

- Only the startup's mentors schedule, because the events live on their calendars. A mentor moves or cancels only the check-ins on their own calendar, not another mentor's. Founders see their check-ins at `/checkins` and on their overview. Staff see them on the startup and on each founder's profile, and a mentor sees all of theirs on their Overview.
- Google is written first. If it refuses a change, the portal saves nothing and shows Google's reason.
- When a mentor is taken off a startup, deactivated or loses the mentor role, their upcoming check-ins for it are cancelled. The other mentors' stay. Removing them from Google is best effort.
- The invitees are the startup's active founders. When a founder joins or leaves, the startup's upcoming check-ins and drawn programme sessions are updated to match ([`meetingInvites.js`](backend/utils/meetingInvites.js)); this is best effort.

### Transcripts and notes

After each check-in the server looks for its Google Meet transcript through the mentor's connection ([`transcriptPoller.js`](backend/utils/transcriptPoller.js)). It first looks 15 minutes after the check-in should end, then again with longer gaps, and stops after two days. Each check-in then reads as held (someone joined) or not held, and its transcript as ready or unavailable. Anyone who can read the startup can read the transcript, with speaker names, under **Transcript** on a past check-in. The mentor can also write notes there, and press **Check Now** instead of waiting.

- The portal sets every meeting it schedules to transcribe itself, so Meet starts a transcript as soon as someone allowed to transcribe joins. Meetings scheduled earlier are set the same way when the host connects Google again. This needs a Google Workspace edition with Meet transcripts and the `meetings.space.settings` scope. Without them the meeting is still scheduled, someone has to turn transcription on during the meeting (Activities, then Transcripts), and without transcripts at all the mentor's notes are the record.
- A meeting counts as a check-in's if it starts within a day of the check-in's time.
- Meet keeps a meeting's records for 30 days, so a transcript that arrives later than that is never collected.
- A very long transcript is cut at about 1 MB of text. The full one stays in the mentor's Google Drive.
- With more than one server, each check-in is claimed before it is fetched, so it is only fetched once.

### Setting up Google

1. In the Google Cloud project, enable the **Google Calendar API** and the **Google Meet REST API**.
2. Create an OAuth client (Web application) for mentors, with the redirect URI `<API origin>/api/google/callback` (for example `http://localhost:4000/api/google/callback`). Set its consent screen to **Internal** in the newtonschool.co Workspace if you can. Mentors are all Newton School staff, and an internal app needs no Google verification for these scopes. The scopes are `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/meetings.space.readonly` (for transcripts) and `https://www.googleapis.com/auth/meetings.space.settings` (to turn on each meeting's automatic transcription; mentors may decline it).
3. Set `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET` and `GOOGLE_WORKSPACE_REDIRECT_URI` in `backend/.env`. Without them the sign-in client (`GOOGLE_CLIENT_*`) is used, which then needs the scopes and redirect URI above. Students would see a consent screen asking for calendar access only if they reached the connect route, which is for mentors only.
4. Set `GOOGLE_TOKEN_KEY` to 32 random bytes (`openssl rand -base64 32`, or `-hex 32`). Mentors' refresh tokens are encrypted with it. Changing it means every mentor connects again.

The admin hosting the sessions connects their calendar on the Programme or Extra Sessions page. Each mentor clicks **Connect Google Calendar** once, the first time they schedule their own check-in. They must use the Google account they sign in to the portal with. If Google later refuses the connection (revoked, or the password changed), the portal asks them to connect again.

## Tests

```sh
npm test
```

- `shared/permissions.test.js` checks every rule against the matrix above, for every role, startup relationship, lock state and status.
- `backend/tests/` signs in as each role against an in-memory MongoDB and checks that the API enforces the same rules.
- `backend/tests/kpiEscalation.test.js` checks when a run of grades alerts the mentor or the board, and the `emailService` and `kpiLockEmails` tests check logging, deduplication and who gets which email. Tests never reach Resend.
- `backend/tests/extraSessions.test.js` checks extra sessions: who may add them, slots and group mode on the host's calendar, their own staff and invitations, changing and cancelling them, and that they stay apart from the bi-weekly sessions. It also checks that a new calendar host takes the upcoming meetings over, and that group mode ignores the hidden slot settings.
- `backend/tests/programme.test.js` checks the programme calendar, drawing slots, scheduling on the admin's calendar, changes and who is emailed, group sessions, and report cycles counted from the reports' own start date, or else the sessions'.
- `backend/tests/checkins.test.js`, `googleConnect.test.js` and `transcripts.test.js` check scheduling, Meet Now, who may do what, connecting a calendar and collecting transcripts against a fake Google ([`tests/helpers.js`](backend/tests/helpers.js)). Tests never reach Google.
- `signup.test.js`, `startups.test.js`, `kpiReview.test.js`, `biweeklyRules.test.js` and `staffChanges.test.js` cover names and codes at sign-up, proposals and startup names, reviews from out-of-date pages, the bi-weekly rules above, and what happens when someone's role changes or they are deactivated.

The first run downloads a MongoDB binary for the tests.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and, for UI work, [DESIGN.md](DESIGN.md). A change to who may do what updates `shared/permissions.js`, its tests and the table above together.
