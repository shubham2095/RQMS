# RQMS — Phased Build Plan (MERN + MySQL)

Stack: React (Vite) + Node/Express + MySQL (`mysql2/promise`) + JWT.
Deploy: GitHub → Hostinger Cloud Hosting.
Git: **user khud chalayega** — Claude Code sirf commands/commit message dega.

Har phase ke saath model + effort likha hai. Ek phase poora + test karo, phir aage.
Checklist ki tarah use karo — jo ho jaye uspe `[x]`.

---

## Phase 0 — Setup  ·  Sonnet 5.5 / Medium
- [ ] Repo structure: `/client` (Vite React) + `/server` (Express)
- [ ] `/server`: express, cors, dotenv, mysql2, jsonwebtoken, bcrypt, multer, pdfkit install
- [ ] MySQL connection pool (`config/db.js`) + `.env` (DB creds, JWT secret)
- [ ] `config/rqms.js` — points weights, eligibility rules, retention, clearance steps (CLAUDE.md §7)
- [ ] Migration runner (ordered `.sql` files chalane wala chhota script)
- [ ] Health check route `/api/health`
- [ ] Client: axios instance, base routing, layout shell
- **Commit:** `chore: project scaffold (client + server + db pool)`

## Phase 1 — Auth + RBAC (neev)  ·  Opus 5.5 / High (design), Sonnet / Medium (impl)
- [ ] Tables: `users`, `roles`, `permissions`, `role_user`, `permission_role`
- [ ] Seed: 8 roles + permission matrix (CLAUDE.md §5)
- [ ] Login (email ya employee_id + password), bcrypt, JWT issue
- [ ] Middleware: `auth`, `requireRole(...)`, `requirePermission(...)`
- [ ] Frontend: AuthContext, login page, `ProtectedRoute`, role-wise nav (sabko sirf apna kaam dikhe)
- [ ] Test: har role login, galat role block hota hai
- **Commit:** `feat: auth and role-based access control`

## Phase 2 — Master data  ·  Sonnet 5.5 / Medium
- [ ] Table `employee_profiles` + `family_members` — self-service profile (service + family details)
- [ ] Table `quarters` — CRUD (type I–VI, colony, station, status), permission `quarter.manage`
- [ ] Admin: users management (create/edit, role assign)
- [ ] Test: quarter banao, profile bharo
- **Commit:** `feat: employee profile + quarter master + user admin`

## Phase 3 — Allotment flow (Part 1)  ·  Opus 5.5 / High (engine), Sonnet / Medium (UI)
- [ ] Table `quarter_applications` (service_type/category snapshot, JSON breakdown columns)
- [ ] Employee: apply (type, station, family size, **document upload** via multer)
- [ ] Clerk: verify application
- [ ] **EligibilityService** (pure) — CLAUDE.md §7 rules → `{eligible, reasons, checks}`
- [ ] **PriorityService** (pure) — points calc → `{score, breakdown}`
- [ ] Table `waiting_list_entries` + **WaitingListService** (place + re-rank: score DESC, waiting_since ASC)
- [ ] Estate Officer: breakdown dekhe, approve/reject with remarks
- [ ] Tables `allotments` + `occupancies` + **AllotmentService** (DB transaction):
      offer (top rank) → order no auto → accept/reject → possession → occupancy + quarter occupied
- [ ] CertificateService: allotment order, possession letter, occupancy certificate (PDF)
- [ ] Test: 2-3 applicants, rank sahi aaye, offer top ko jaye, double-allot na ho
- **Commit:** `feat: application, eligibility+priority engine, waiting list, allotment`

## Phase 4 — Vacation flow (Part 2)  ·  Opus 5.5 / High (state machine), Sonnet / Medium (UI)
- [ ] Tables `vacation_requests` + `vacation_clearances`
- [ ] Employee/Clerk: vacation request (trigger, date, reason) → 5 clearance rows auto-create
- [ ] **VacationWorkflowService**: ordered chain, sirf `current_step` + authorised role act kare
      - clerk_inspection (has_damage) → electrical (meter_reading) → water (dues) → accounts (dues) → estate_officer (final)
- [ ] Step certificates: electrical clearance, water clearance
- [ ] Complete: NOC + No-Due + Handover generate, quarter `vacant`, occupancy end, profile flag clear
- [ ] Reject kahin bhi → request rejected
- [ ] Test: pura chain ek quarter par, galat role/step block ho
- **Commit:** `feat: vacation request + multi-level clearance workflow`

## Phase 5 — Retirement + cross-cutting  ·  Opus 5.5 / High (cycle), Sonnet / Medium (rest)
- [ ] Table `retirement_records` + **RetirementService**: record + daily cycle (alert/overstay/penalty)
- [ ] Daily cycle ko manual "run-cycle" button + (deploy par) cron se chalao
- [ ] `documents` (polymorphic) — upload/list/download, sha256 hash
- [ ] `certificates` (polymorphic) — list + download
- [ ] `audit_logs` + `auditRequest` middleware — har important action log
- [ ] `notification_logs` — abhi DB log (email/sms/whatsapp baad mein wire)
- [ ] Dashboard + reports: quarters by type/station, applications, allotments, vacations
- **Commit:** `feat: retirement cycle, documents, certificates, audit, dashboard`

## Phase 6 — Deploy (Hostinger)  ·  Sonnet 5.5 / Medium
- [ ] `client` build → static serve (Express se ya Hostinger static)
- [ ] hPanel: Node.js app setup + MySQL DB + env variables
- [ ] GitHub → Hostinger pull/deploy (nidan jaisa)
- [ ] Migrations + seeders production par chalao
- [ ] Retirement daily cycle ke liye cron
- [ ] Smoke test: ek quarter apply se handover tak live chala ke dekho
- **Commit:** `chore: production build + hostinger deploy config`

---

## Claude Code mein kaam karne ka tareeka
1. Local folder (e.g. `D:\RQMS`) connect + GitHub repo link.
2. `CLAUDE.md` repo root mein — har session context le lega.
3. Bade feature se pehle **plan mode** — plan mango, review karo, phir implement.
4. Ek phase = ek focused session. Sab ek saath mat banao.
5. Phase ke hisaab se model/effort switch (`/model`): engine/state-machine = Opus High, UI/CRUD = Sonnet Medium.
6. Har phase ke baad khud test + khud git commit.
