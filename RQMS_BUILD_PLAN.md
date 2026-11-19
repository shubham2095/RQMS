# RQMS — Phased Build Plan (MERN + MySQL, nidan-style)

Stack: React (Vite, plain JS) + Node/Express + MySQL via **Sequelize (ORM) + umzug (migrations)** + **zod** (validation).
Auth: JWT + bcryptjs. Security: helmet, compression, cookie-parser, express-rate-limit.
Monorepo: **npm workspaces** (`client`, `server`) — sab kuch **root se ek command** se chalta hai.
Deploy: GitHub → Hostinger Cloud Hosting.
Git: **user khud chalayega** — Claude Code sirf commands/commit message dega.

Root commands (sab root folder se):
- `npm run dev` → server + client ek saath (concurrently)
- `npm run build` · `npm start`
- `npm run db:create` · `db:migrate` · `db:seed` · `db:reset`

Server layout (flat): `server/{config,controllers,middleware,migrations,models,routes,seeders,services,utils,validators}` + `server.js`
Client layout: `client/src/{components,context,hooks,layouts,pages,services,utils}` + `public/{fonts,images}`

Conventions: controllers patle, logic `services/` mein. Business rules `config/rqms.js` se. Sequelize models `models/`, migrations/seeders umzug `.js` files, validation zod schemas `validators/`. Allotment aur vacation-complete ko `sequelize.transaction` mein karo. Simple + clean code, plain functions.

Har phase ke saath model + effort. Ek phase poora + test, phir aage. Checklist: jo ho jaye uspe `[x]`.

---

## Phase 0 — Setup + nidan-style restructure  ·  DONE ✅
- [x] client + server scaffold, root `npm run dev` single command (workspaces + concurrently)
- [x] Sequelize instance (`config/db.js`), umzug runner (`utils/dbTasks.js`), empty migrations/seeders
- [x] `config/rqms.js` (CLAUDE.md §7 rules), `GET /api/health` → `{ ok: true }`
- [x] Flat server layout + nidan-style client, deps swapped to Sequelize/umzug/zod/bcryptjs + helmet/compression/cookie-parser/express-rate-limit/dayjs

## Phase 1 — Auth + RBAC (neev)  ·  Sonnet 5.5 / High · PLAN MODE
- [ ] umzug migrations: `users`, `roles`, `permissions`, `role_user`, `permission_role` (FKs, InnoDB, utf8mb4)
- [ ] Sequelize models + associations: User, Role, Permission (many-to-many)
- [ ] Seeder: 8 roles + permission matrix (CLAUDE.md §5) + 1 demo user per role (bcryptjs) — print demo logins
- [ ] Backend: `POST /api/auth/login` (email + password → JWT + roles/permissions), `GET /api/auth/me`, logout
- [ ] zod validator for login; stricter rate-limit on login route
- [ ] Middleware: `auth`, `requireRole(...)`, `requirePermission(...)`
- [ ] Frontend: AuthContext + useAuth (token in localStorage, axios header), login page, ProtectedRoute, role-aware nav, placeholder dashboard
- [ ] Note: employee_id login = Phase 2 (profiles ke baad)
- [ ] Test: `npm run db:migrate && npm run db:seed`, har role login, galat role block
- **Commit:** `feat: auth and role-based access control`

## Phase 2 — Master data  ·  Sonnet 5.5 / Medium
- [ ] Models + migrations: EmployeeProfile, FamilyMember, Quarter
- [ ] Employee self-service profile (service + family details) + zod validators
- [ ] Quarter CRUD (type I–VI, colony, station, status) — permission `quarter.manage`
- [ ] Admin: user management (create/edit, role assign)
- [ ] Add employee_id login option now that profiles exist
- **Commit:** `feat: employee profile + quarter master + user admin`

## Phase 3 — Allotment flow (Part 1)  ·  Opus 5.5 / High (engine), Sonnet / Medium (UI)
> **Model change yahan:** engine/logic ke liye Opus 5.5 / High.
- [ ] Models + migrations: QuarterApplication (service_type/category snapshot; eligibility_result + priority_breakdown JSON)
- [ ] Employee apply (type, station, family size, **document upload** via multer) + zod validator
- [ ] Clerk verify
- [ ] **EligibilityService** (pure) — CLAUDE.md §7 → `{eligible, reasons, checks}`
- [ ] **PriorityService** (pure) — points → `{score, breakdown}`
- [ ] WaitingListEntry model + **WaitingListService** (place + re-rank: score DESC, waiting_since ASC)
- [ ] Estate Officer: breakdown dekhe, approve/reject + remarks
- [ ] Allotment + Occupancy models + **AllotmentService** in `sequelize.transaction`:
      offer (top rank) → order no auto → accept/reject → possession → occupancy + quarter occupied
- [ ] CertificateService: allotment order, possession letter, occupancy certificate (pdfkit)
- [ ] Test: 2-3 applicants, rank sahi, offer top ko, double-allot na ho
- **Commit:** `feat: application, eligibility+priority engine, waiting list, allotment`

## Phase 4 — Vacation flow (Part 2)  ·  Opus 5.5 / High (state machine), Sonnet / Medium (UI)
- [ ] Models + migrations: VacationRequest, VacationClearance
- [ ] Vacation request (trigger, date, reason) → 5 clearance rows auto-create
- [ ] **VacationWorkflowService**: ordered chain, sirf `current_step` + authorised role act kare
      clerk_inspection → electrical (meter) → water (dues) → accounts (dues) → estate_officer
- [ ] Step certificates (electrical, water); complete → NOC + No-Due + Handover, quarter vacant, occupancy end (transaction)
- [ ] Reject kahin bhi → request rejected
- [ ] Test: pura chain ek quarter par, galat role/step block
- **Commit:** `feat: vacation request + multi-level clearance workflow`

## Phase 5 — Retirement + cross-cutting  ·  Opus 5.5 / High (cycle), Sonnet / Medium (rest)
- [ ] RetirementRecord model + **RetirementService**: record + daily cycle (alert/overstay/penalty)
- [ ] Manual "run-cycle" button + (deploy par) cron
- [ ] Document model (polymorphic) — upload/list/download, sha256 hash
- [ ] Certificate model (polymorphic) — list + download
- [ ] AuditLog + audit middleware — har important action log
- [ ] NotificationLog — abhi DB log (email/sms/whatsapp baad mein)
- [ ] Dashboard + reports: quarters by type/station, applications, allotments, vacations
- **Commit:** `feat: retirement cycle, documents, certificates, audit, dashboard`

## Phase 6 — Deploy (Hostinger)  ·  Sonnet 5.5 / Medium
- [ ] `npm run build` (client) → Express se `client/dist` serve
- [ ] hPanel: Node.js app + MySQL DB + env variables; root `npm install` (workspaces) handle ho
- [ ] GitHub → Hostinger pull/deploy (nidan jaisa)
- [ ] Prod par `npm run db:migrate && npm run db:seed`
- [ ] Retirement daily cycle cron
- [ ] Smoke test: ek quarter apply se handover tak live
- **Commit:** `chore: production build + hostinger deploy config`

---

## Claude Code workflow
1. `CLAUDE.md` repo root mein — har session context.
2. Bade feature se pehle **plan mode** (Phase 1, 3, 4).
3. Ek phase = ek focused session.
4. Model/effort switch (`/model`): engine/state-machine = Opus High, UI/CRUD = Sonnet Medium.
5. Har phase ke baad khud test + khud git commit.
