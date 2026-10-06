# NST Entrepreneurship Portal

Students run startups and track them with KPIs and bi-weekly reports. Mentors and the academic board review and grade them.

- `backend/`: Express 5 and Mongoose (MongoDB) API on port 4000
- `frontend/`: React 19 and Vite on port 5173, proxying `/api` to the backend
- `shared/`: rules both sides use. `permissions.js` decides who may do what.

## Setup

```sh
npm install
# backend/.env needs MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID,
# GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL, AWS_*,
# RESEND_API_KEY and EMAIL_FROM
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

## Tests

```sh
npm test
```

- `shared/permissions.test.js` checks every rule against the matrix above, for every role, startup relationship, lock state and status.
- `backend/tests/` signs in as each role against an in-memory MongoDB and checks that the API enforces the same rules.

The first run downloads a MongoDB binary for the tests.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and, for UI work, [DESIGN.md](DESIGN.md). A change to who may do what updates `shared/permissions.js`, its tests and the table above together.
