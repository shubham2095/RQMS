# RQMS — Phased Build Plan (MERN + MySQL, nidan-style)

Stack: React (Vite, plain JS) + Node/Express + MySQL via **Sequelize (ORM) + umzug (migrations)** + **zod** (validation).
Auth: JWT + bcryptjs. Security: helmet, compression, cookie-parser, express-rate-limit.
Monorepo: **npm workspaces** (`client`, `server`) — sab kuch **root se ek command** se chalta hai.
Deploy: GitHub → Hostinger Cloud Hosting.
Git: **user khud chalayega** — Claude Code sirf commands/commit message dega.

Root commands: `npm run dev` · `npm run build` · `npm start` · `npm run db:create|db:migrate|db:seed|db:reset`
Server (flat): `server/{config,controllers,middleware,migrations,models,routes,seeders,services,utils,validators}` + `server.js`
Client: `client/src/{components,context,hooks,layouts,pages,services,utils}` + `public/{fonts,images}`

Model/effort: engine/state-machine = Opus High, UI/CRUD = Sonnet Medium. Plan mode bade phases pe.

---

## Phase 0 — Setup + nidan-style restructure · DONE ✅

## Phase 1 — Auth + RBAC · DONE ✅
8 roles + permission matrix, JWT + bcryptjs, requireRole/requirePermission, AuthContext/ProtectedRoute, demo users.

## Phase 2 — Master data · DONE ✅
employee_profiles + family_members + quarters, self-service profile, quarter CRUD (quarter.manage), admin users, employee_id login.

## Phase 3 — Allotment flow (Part 1) · DONE ✅
quarter_applications, eligibility + priority engine (pure), waiting_list, allotment/occupancy in transactions, certificates (pdfkit), document upload.

## Phase 4 — Vacation flow (Part 2) · DONE ✅
vacation_requests + vacation_clearances, 5-step ordered clearance chain, per-step permission, approve/reject (optional notes, never block), complete() → NOC/No-Due/Handover + quarter vacant. All in transactions with row locks.

---

## ⚠️ Phase 3-R — Engine REALIGN (IMPORTANT — before Phase 5 reports)

> **Kyun:** Client ne real data diya (Master Circular No. 49 (2019) + actual priority lists + possession/requisition report). Isse pata chala ki humara Phase 3 eligibility + priority + caste logic **real railway system se match nahi karta**. Phase 5 dashboard/reports isi logic pe banenge, isliye pehle ise theek karna zaroori hai. Detail CLAUDE.md §11 mein.

**As-built (Phase 3) vs Reality:**

| Cheez | Abhi (Phase 3) | Reality (Circular 49 + data) |
|------|-----------------|------------------------------|
| Eligibility → type | service years (I=0…VI=18) | **Grade Pay → type** (GP≤1800→I, …, >4200→IV, Gaz <6600→IV, 6600→IV-Spl, >6600→V) |
| Waiting list rank | points formula | **Registration/request date order** |
| Caste | SC/ST/OBC ko points | **SC/ST reservation quota** (10% Type I&II, 5% III&IV; non-essential only; separate general + SC/ST lists; no OBC) |
| "Category" | SC/ST/OBC/GENERAL | **Essential vs Non-essential** service |

**Realign tasks (client confirm ke baad):**
- [ ] Eligibility: `grade_pay` → quarter type mapping (circular ki table). `service_type`-years rule hatao. Running staff mapping optional/later.
- [ ] Waiting list ordering: **registration date** (`applied_at`) se, points formula ki jagah. (Out-of-turn/medical quota alag register — later.)
- [ ] "Category" ko essential/non-essential (`service_type`) ki tarah treat karo UI/reports mein; caste `category` sirf reservation ke liye.
- [ ] SC/ST reservation: roster + do waiting lists (general + SC/ST special), 10%/5% by type-group, station ≥50 quarters, non-essential only, SC/ST general-seniority allotment reserved quota mein count nahi.
- [ ] Gazetted vs non-gazetted alag pools (agar dono scope mein).
- [ ] `config/rqms.js` ko in rules se update; engine services (eligibility/priority/waitingList) rework; existing schema zyadatar reuse (grade_pay, service_type, category, quarter_type, applied_at already hain).

**Open questions (client se confirm):**
1. **OBC** quarters reservation mein count hota hai? (circular mein sirf SC/ST)
2. Waiting list order **pure registration date** se ya **service-length seniority** bhi?
3. **Gazetted + non-gazetted** dono banane hain ya ek?
4. **Essential vs non-essential** kaise decide hota hai (designation list se)?
5. Out-of-turn, medical 5% ad-hoc quota, refusal-date handling, priority transfer, change-of-quarter, husband-wife same station — in sab mein se kya scope mein hai?

---

## Phase 5 — Retirement + cross-cutting · Opus 5.5 / High (cycle), Sonnet / Medium (rest)
- [ ] RetirementRecord model + RetirementService: record + daily cycle (alert/overstay/penalty)
- [ ] Manual "run-cycle" button + (deploy par) cron
- [ ] Document / Certificate management UI (list + download; sha256 hash)
- [ ] AuditLog + audit middleware — har important action log (Phase 3/4 ke TODO markers yahin lagenge)
- [ ] NotificationLog — DB log (email/sms/whatsapp baad mein)
- [ ] Dashboard + reports: quarters by type/station, applications, allotments, vacations (⚠️ Phase 3-R ke baad, taaki sahi logic pe ho)
- **Commit:** `feat: retirement cycle, documents, certificates, audit, dashboard`

## Phase 6 — Deploy (Hostinger) · Sonnet 5.5 / Medium
- [ ] `npm run build` → Express se `client/dist` serve
- [ ] hPanel: Node.js app + MySQL + env; root `npm install` (workspaces)
- [ ] GitHub → Hostinger deploy (nidan jaisa); prod par `npm run db:migrate && npm run db:seed`
- [ ] Retirement daily cycle cron; smoke test apply→handover
- **Commit:** `chore: production build + hostinger deploy config`

---

## Claude Code workflow
1. `CLAUDE.md` repo root mein — har session context.
2. Bade feature/realign se pehle **plan mode** (Phase 3-R, 5).
3. Ek phase = ek focused session. Model/effort `/model` se switch.
4. Har phase ke baad khud test + khud git commit.
