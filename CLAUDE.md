# CLAUDE.md — Railway Quarter Management System (RQMS)

> Ye file har Claude Code session ke start par padhi jaati hai. Project ka single source of truth.
> Isme domain rules, schema, state machines aur conventions hain — inhe dobara mat derive karo, yahin se uthao.

---

## 1. Project kya hai

RQMS ek **role-based workflow system** hai jo railway quarters ka poora lifecycle manage karta hai:
**allotment → occupancy → vacation → retirement.** 100% online, paperless, full audit trail.

Do core flows:

- **Allotment (Part 1):** Employee apply karta hai → Clerk verify → System eligibility + priority nikalta hai → waiting list rank → Estate Officer approve → vacant quarter ka offer → employee accept → Clerk possession record → occupancy start + certificates.
- **Vacation (Part 2):** Employee vacation request → 5-step clearance chain (Clerk inspection → Electrical → Water → Accounts → Estate Officer) → System NOC + No-Due + Handover certificate generate → quarter wapas vacant.
- **Retirement:** retention period tracking, expiry alerts, overstay penalty auto-calculation.

---

## 2. Tech stack

Structure "nidan" project se match karta hai — saare future phases isi ko follow karein.

- **Frontend:** React (Vite) + React Router + axios. Plain JS (TypeScript nahi, jab tak maang na ho).
- **Backend:** Node.js + Express (CommonJS), **flat** `server/` folder (`src/` nahi).
- **Database:** MySQL via **Sequelize** (ORM, `mysql2` driver). Migrations aur seeders **umzug** se (`.js` files, `queryInterface`). `underscored: true` — columns snake_case. Transactions `sequelize.transaction()` se zaroori jagah (allotment, vacation complete).
- **Validation:** **zod** (request body/query schemas `server/validators/` mein).
- **Auth:** JWT (access token) + `bcryptjs` password hashing, role-based route guards dono taraf (backend middleware + frontend route protection). `cookie-parser` available (cookie-based token chahiye to).
- **Server hardening:** `helmet`, `compression`, `express-rate-limit` (`server/server.js` mein), `cors`.
- **Dates:** `dayjs` (retention/overstay/age calculations).
- **File storage:** uploaded documents aur generated certificates disk par (`/uploads`, `/certificates` — repo root), DB mein sirf path. Upload: `multer`.
- **PDF:** certificates server-side generate (`pdfkit`), file path DB mein.
- **Deploy:** GitHub → Hostinger Cloud Hosting (Node app + MySQL).

### Run everything from the ROOT (npm workspaces: `client` + `server`)
Alag `cd server` / `cd client` ki zaroorat nahi. Root par ek baar `npm install`, phir:
```
npm run dev         # server + client dono (concurrently)
npm run build       # client build
npm start           # server (production)
npm run db:create   # CREATE DATABASE rqms
npm run db:migrate  # umzug: server/migrations/*.js
npm run db:seed     # umzug: server/seeders/*.js
npm run db:reset    # drop + create + migrate + seed (production mein blocked)
```
Env: `server/.env` (template `server/.env.example`), `server/config/env.js` use karke load hota hai. DB tasks: `server/utils/dbTasks.js`.

### Backend folder structure (flat)
```
/server
  server.js        -> express app setup (helmet, cors, rate-limit, routes, error handler) + listen
  .env  .env.example
  /config          -> env.js, db.js (Sequelize instance), rqms.js (entitlement/eligibility/retention/clearance rules)
  /controllers     -> thin: request parse + response, logic services ko
  /middleware      -> auth, requireRole, requirePermission, auditRequest
  /migrations      -> umzug .js migrations (ordered by filename: 001-xxx.js ...)
  /models          -> Sequelize models + associations (index.js)
  /routes          -> express routers (ek module = ek router)
  /seeders         -> umzug .js seeders (roles, permissions, demo data)
  /services        -> business logic (eligibility, priority, allotment, vacation, retirement, certificate, notification, audit)
  /utils           -> dbTasks.js (create/migrate/seed/reset) + helpers
  /validators      -> zod schemas
/uploads
/certificates
```

### Frontend folder structure
```
/client
  /public          -> fonts/, images/
  /src
    /components    -> shared UI
    /context       -> AuthContext etc.
    /hooks         -> useAuth ...
    /layouts       -> MainLayout (header + content), role layouts
    /pages         -> role-wise screens (dashboard, applications, quarters, allotments, vacations, admin...)
    /services      -> axios instance (axios.js) + per-module API calls
    /utils
    App.jsx  main.jsx
```

---

## 3. Coding conventions (IMPORTANT)

- **Simple aur clean code.** Over-engineering nahi. Plain `function` declarations prefer karo.
- Controllers patle rakho — saara logic `services/` mein.
- Har service ek cheez kare. Business rules `config` se aayein (hardcode nahi).
- Pure functions jahan possible ho (points/eligibility engine ko pure + testable banao).
- Clear naam, chhote functions, early returns. Fancy abstractions se bacho.
- Errors: service `throw` kare, controller catch karke clean JSON error bheje.
- **DB:** schema sirf umzug migrations se badle (`server/migrations/`), models `server/models/` mein. Tables ke naam explicit `tableName` (snake_case, section 8 wale). Seed data `server/seeders/` mein. Multi-step writes `sequelize.transaction()` mein.
- **Validation:** har request body/query zod schema (`server/validators/`) se validate ho, controller mein parse, fail par 400 + clean JSON.

---

## 4. GIT POLICY (STRICT)

**Claude Code git commands KHUD NA CHALAYE** — koi `git init/add/commit/push` nahi.
Sirf commands ya suggested commit message batao, user khud chalayega.

---

## 5. Roles (8) aur permission matrix

| Role (slug) | Permissions |
|---|---|
| `employee` | (koi special nahi — sirf apna profile, apply, offer accept, vacation request) |
| `quarter_clerk` | application.verify, quarter.manage, allotment.approve, allotment.possession, vacation.clerk_inspection |
| `estate_officer` | application.decide, allotment.approve, allotment.possession, vacation.estate_officer, reports.view |
| `electrical_dept` | vacation.electrical |
| `water_dept` | vacation.water |
| `accounts_dept` | vacation.accounts |
| `admin` | users.manage, master.manage, settings.manage, quarter.manage, reports.view |
| `super_admin` | sab kuch (bypass) |

Har screen/route sahi role/permission se guard karo. Employee ko sirf apna kaam dikhe.

**Auth implementation (Phase 1 — done):**
- Backend: `auth` middleware (Bearer JWT -> `req.user = { id, name, email, roles[{slug,name}], permissions[slugs] }`, DB se har request par fresh), phir `requireRole(...slugs)` / `requirePermission(...slugs)` — **any-of**, `super_admin` hamesha bypass. Naya route: `router.get('/x', auth, requirePermission('quarter.manage'), controller.x)`.
- Roles/permissions seed: `server/seeders/001-roles-permissions.js` (matrix yahin). Naya permission = seeder/migration mein add karo.
- Login abhi sirf **email** se. `employee_id` login Phase 2 mein (`authService.login` mein).
- Frontend: `useAuth()` -> `{ user, hasRole, hasPermission, login, logout }`; `ProtectedRoute` (optional `roles`/`permissions`); nav + routes `client/src/utils/navItems.js` se. Naya screen = `navItems` mein entry (permissions/roles ke saath) + real page.
- Demo users (dev only): `npm run db:seed` print karta hai (`*@rqms.test`).

**Master data (Phase 2 — done):**
- Login: ek `identifier` field — email (`@` ho to) ya `employee_id` (`employee_profiles.employee_id`). Employee id mein `@` allowed nahi. Failure par same generic 401 ("Invalid credentials").
- Tables: `employee_profiles` (user_id unique, employee_id unique, `has_active_allotment` system-managed — profile PUT se nahi badalta), `family_members`, `quarters` (unique station+colony+number). Enums `server/config/rqms.js` mein (`enums.quarterStatuses`, `manualQuarterStatuses`).
- Quarter status: master screen se sirf `vacant | reserved | under_maintenance` set hote hain; `allotted/occupied/vacation_pending/retired_occupancy` allotment/vacation flow set karega (usi quarter ka status haath se nahi badalta).
- API: `/api/profile` (self, `auth` only) · `/api/quarters` (GET: role quarter_clerk|estate_officer|admin; POST/PUT: `quarter.manage`) · `/api/admin/users`, `/api/admin/roles` (`users.manage`). Admin user rules: super_admin role sirf super_admin de/badal sakta hai; khud ko deactivate ya apne roles badalna blocked.
- Validators `server/validators/` (`helpers.js` mein `requiredText/optionalText/optionalValue`: '' -> null). Services 409 throw karte hain unique conflict par (`utils/dbErrors.js`).
- Frontend: pages `MyProfile`, `Quarters`, `AdminUsers`; `App.jsx` ka `realPages` map nav item -> real page (baaki `ComingSoon`). Dropdown constants `client/src/utils/constants.js` (server enums ke mirror). Error text `utils/getErrorMessage.js`.
- Demo data (dev only): `employee@rqms.test` ka profile `EMP1001` + 2 family members, 6 sample quarters (I–VI, stations Lucknow / New Delhi, sab vacant).

**Allotment flow (Phase 3 — done):**
- Application status: `submitted → verified → (run-engine) waitlisted | ineligible → approved → allotted`; `rejected` kahin bhi (allotted se pehle). Clerk (`application.verify`): verify + run-engine (verified/ineligible/waitlisted par chalta hai, dobara chala sakte hain). Estate officer (`application.decide`): approve (sirf waitlisted se) / reject (remarks zaroori).
- Ek employee ki ek hi open application (`openApplicationStatuses` in config). Ek `allotted` application tab tak open hai jab tak uski allotment live hai (`liveAllotmentStatuses`: offered/accepted/possession_taken) — quarter khali karne (vacated) ke baad naya apply kar sakta hai. `service_type`/`category`/`division` apply par snapshot. `waiting_since` = `applied_at`.
- Engine pure hai (Phase 3-R ke baad, §7): `entitlementService.getEntitlement({grade_pay, is_gazetted})` aur `eligibilityService.evaluate(application, profile)` — koi DB nahi, koi points/score nahi (`priorityService` hata diya).
- Waiting list: queue = (quarter_type, station); order **registration date** `waiting_since ASC, quarter_application_id ASC`; `waitingListService.place/reRank/remove/queue`. Remove = `is_active=false, rank=NULL` (history rehti hai).
- Offer (`allotment.approve`): quarter ki queue ka rank-1 entry; **application `approved` na ho to offer refuse (400)** — koi skip nahi hota. Sab `sequelize.transaction` + row locks (quarter, queue). Offer par: quarter `allotted`, application `allotted`, entry hatao + re-rank, ALLOTMENT_ORDER certificate. Employee accept/reject (`respond`): reject par quarter `vacant` + application `rejected` (naya apply kar sakta hai). Possession (`allotment.possession`, sirf accepted par): quarter `occupied` + occupant, occupancy row, `has_active_allotment=true`, POSSESSION_LETTER + OCCUPANCY_CERTIFICATE.
- Numbers: application `QA-YYYYMMDD-NNNN`, allotment order `AO-YYYYMMDD-NNNN` (daily sequence, `utils/referenceNumber.js`), certificate `ALO|POL|OCC-YYYYMMDD-XXXXXX`.
- Files: uploads (`documents`, polymorphic) aur certificates (PDF via pdfkit) `config/storage.js` ki dirs mein (`UPLOADS_DIR` / `CERTIFICATES_DIR` env, default repo-root `uploads/` `certificates/`); DB mein relative filename. Download: `GET /api/documents/:id/download`, `GET /api/certificates/:id/download` (owner ya staff). Certificate generate flow ke AAKHIR mein, transaction ke andar.
- `TODO(Phase 5)` comments services mein: audit log + notification yahin lagenge. JSON columns ke liye `utils/jsonField.js` (MariaDB JSON ko text deta hai).
- Demo data (dev only): `employee2/3/4@rqms.test` = EMP1002, EMP1003, EMP1004; Phase 3-R seeders 006/007 inhe grade pay + gazetted dete hain (EMP1001 GP4600→IV, 1002 GP4200→III, 1003 GP2400→II, 1004 GP7600 gazetted→V) aur Lucknow IV/V quarters + backdated waitlist EMP1005–1007 (Type III, 2025-02-03 / 2025-09-15 / 2026-03-01) add karte hain. Optional env `API_RATE_LIMIT` (default 300 req / 15 min).

**Vacation flow (Phase 4 — done):**
- Employee (`possession_taken` allotment) -> `POST /api/vacations` (`vacationWorkflowService.initiate`): request `VAC-YYYYMMDD-NNNN`, status `in_clearance`, `current_step` = pehla step, 5 `vacation_clearances` rows (pending, sequence 1..5), quarter `vacation_pending`. Ek allotment par ek hi open request. `requested_vacation_date` >= possession date, <= 1 saal aage. `trigger = retirement` par retirement record Phase 5 (TODO marker service mein).
- Steps (config `vacationClearanceSteps`, order fixed) aur unki permission (`vacationStepPermissions`): clerk_inspection -> `vacation.clerk_inspection`, electrical -> `vacation.electrical`, water -> `vacation.water`, accounts -> `vacation.accounts`, estate_officer -> `vacation.estate_officer`. super_admin bypass.
- `POST /api/vacations/:id/act` body `{ step, decision: 'approve'|'reject', remarks?, ...optional }`: `step` current step se match na kare to 400 (stale click), us step ki permission na ho to 403. **Har step sirf approve/reject hai**; `has_damage` (clerk, 3-way: not recorded/no damage/damage found), `meter_reading` (electrical), `dues_amount` (electrical/water/accounts) OPTIONAL informational fields hain — timeline par record hote hain, approve ko kabhi block nahi karte. Reject par remarks zaroori.
- Approve: electrical -> ELECTRICAL_CLEARANCE, water -> WATER_CLEARANCE certificate; last step approve hote hi `complete()` usi transaction mein: request `completed`, allotment `vacated` (+ `vacated_on` = aaj), quarter `vacant` + occupant null, profile `has_active_allotment=false`, occupancy band (`end_date` = aaj), VACATION_NOC + NO_DUE_CERTIFICATE + HANDOVER_CERTIFICATE (payload mein har step ka recorded data).
- Reject kisi bhi step par: request `rejected` (terminal), baaki steps pending, quarter wapas `occupied`, allotment/profile flag same; employee nayi request file kar sakta hai. Status `cleared` enum mein hai par kabhi save nahi hota.
- Listing: employee = apni; staff (koi bhi `vacation.*`) = sab, `waiting_for_me=true` = jo abhi mere step par hain; detail mein `can_act`. Certificates download `GET /api/certificates/:id/download` (owner ya vacation staff).
- Frontend: `VacationRequest` (employee), `VacationClearances` (staff list), `VacationDetail` (timeline + step form), `components/VacationTimeline.jsx`. `TODO(Phase 5)` markers: audit + notifications + retirement record.

---

## 6. State machines (inhe exactly follow karo)

**ApplicationStatus:** `submitted` → `verified` → (`eligible` | `ineligible`) → `waitlisted` → `approved` → `allotted`
branches: `rejected`, `withdrawn`

**AllotmentStatus:** `offered` → (`accepted` | `rejected`) → `possession_taken` → `vacated`

**VacationRequest status:** `submitted`/`in_clearance` → (har clearance step approve hote hue) → `completed`; kahin bhi `rejected`
**ClearanceStep (ordered):** `clerk_inspection` → `electrical` → `water` → `accounts` → `estate_officer`
**ClearanceStatus:** `pending` → (`approved` | `rejected`)
Rule: sirf `current_step` par hi action ho sakta hai, aur usi role se jo us step ka authorised hai.

**QuarterStatus:** `vacant` → `allotted` → `occupied` → `vacation_pending` → `vacant`
(aur: `reserved`, `under_maintenance`, `retired_occupancy`)

**RetentionStatus:** `notice` → `retained` → `expiring` → `overstaying` → `cleared`

**Enums:** QuarterType = I–VI · Category = SC/ST/OBC/GENERAL · ServiceType = essential/non_essential ·
VacationTrigger = transfer/retirement/resignation/death/voluntary

---

## 7. Business rules — AS-BUILT (Phase 3-R: real rules, §11)

> Engine Master Circular 49 ke hisaab se realign ho chuka hai (Phase 3-R). Purana points formula aur service-years eligibility **hata diye gaye**. Saare numbers `config/rqms.js` mein.

### Eligibility = Grade Pay (+ gazetted) → Quarter Type (`config.entitlement`, `entitlementService`)
- Non-gazetted: GP ≤1800 → I · 1801–2400 → II · 2401–4200 → III · ≥4201 → IV
- Gazetted: GP ≤6599 → IV · GP 6600 → "Type IV Special" (stored/treated as **IV**, kyunki hum sirf I–VI store karte hain) · GP ≥6601 → V
- Bounds integer-inclusive (grade pay INT hai). **Type VI auto-mapping mein nahi** (assignable hai, par kisi grade pay se entitled nahi) — TODO. Running staff ka alag mapping (circular 2.2) — TODO.
- Entitled type **ya usse neeche** ke liye apply kar sakte hain (`entitlement.allowLowerTypes = true`).
- Checks: `profile_complete` (designation + grade_pay; `eligibility.requiredProfileFields`) · `entitlement` · `existing_allotment` (block) · `station_match`. Result `{ eligible, reasons[], checks{}, entitlement }`.
- `employee_profiles.is_gazetted` (default false). Employee profile par grade pay ZAROORI; admin bhi `grade_pay`/`is_gazetted` badal sakta hai (Users screen). Known: entitlement self-declared hai — clerk ka verify step hi control hai.

### Waiting list ranking = REGISTRATION DATE
- Queue = (quarter_type, station); order `waiting_since` (= `applied_at`) ASC, tie `quarter_application_id` ASC. Earliest registration = rank 1. Change par re-rank. `priority_score` columns bache hain par ab use/likhe nahi jaate.
- `service_type` (essential/non-essential) aur caste `category` snapshot mein rehte hain, ranking nahi chalate.

### Reservation (SC/ST quota) — **PENDING, implement nahi**
- `config.reservation` sirf placeholder (`enabled:false`; I–II 10%, III–IV 5%, 50-quarter threshold). Code mein `TODO(reservation)` markers (`waitingListService`, `applicationService`). Client se confirm baaki: OBC, essential/non-essential determination, 50-quarter threshold.

### Retirement
- Retention 120 days · overstay ₹250/day · alert 15 days pehle · daily cycle (expiring→alert, expired→overstaying+penalty).

### Allotment (transaction)
- Vacant quarter → rank-1 → offer → order no auto → quarter/application `allotted` → accept → possession → occupancy + `occupied` + certificates. Reject → `vacant`.

---

## 8. Core DB tables (MySQL)

`users`, `roles`, `permissions`, `role_user`, `permission_role`,
`employee_profiles`, `family_members`, `quarters`,
`quarter_applications`, `waiting_list_entries`, `allotments`, `occupancies`,
`vacation_requests`, `vacation_clearances`, `retirement_records`,
`documents` (polymorphic), `certificates` (polymorphic),
`notification_logs`, `audit_logs`.

Key points:
- `quarter_applications` par apply ke waqt `service_type` aur `category` ka **snapshot**.
- `eligibility_result` JSON column. (`priority_score`/`priority_breakdown` legacy columns, ab unused.)
- `documents`/`certificates` polymorphic (`documentable_type/id`, `certifiable_type/id`).
- `audit_logs` — har important action log (user, action, affected model, before/after, ip, time).
- `employee_profiles` mein `grade_pay`, `is_gazetted` (migration 017), `pay_level`, `service_type`, `category` — entitlement `grade_pay` + `is_gazetted` se.

---

## 9. Modules → routes (reference)

auth · profile(+family) · applications(verify/run-engine/decide) · waiting-list ·
quarters(master CRUD) · allotments(offer/respond/possession) · vacations(+act=clearance) ·
retirements(+run-cycle) · certificates(download) · notifications · reports · audit · admin/users

---

## 10. Build order

Phase 0 setup → 1 auth+RBAC → 2 master data → 3 allotment flow → 4 vacation flow →
**3-R engine realign (§11) — DONE** → 5 retirement + cross-cutting (audit/documents/certificates/dashboard) → 6 deploy.
Phases 0–4 + 3-R DONE. Detail `RQMS_BUILD_PLAN.md` mein.

---

## 11. REAL allotment rules (Master Circular No. 49, 2019 + client data)

> Client ne official **Railway Board Master Circular No. 49 (updated Aug 2019)** + real priority lists (gazetted officers) + possession/requisition report (non-gazetted staff) diye. **Eligibility + waiting-list ordering Phase 3-R mein implement ho chuki (§7).** Reservation aur neeche ke concepts abhi pending hain.

### Eligibility = Grade Pay → Quarter Type (service years se NAHI)
- GP ≤ 1800 → **Type-I**
- GP > 1800 up to 2400 → **Type-II**
- GP > 2400 up to 4200 → **Type-III**
- GP > 4200 → **Type-IV**
- Gazetted GP < 6600 → **Type-IV** · Gazetted GP 6600 → **Type-IV Special** · Gazetted GP > 6600 → **Type-V**
- Running staff (Loco Pilot, Guard, Fireman, ALP…) ka alag grade-pay→type mapping hai (circular section 2.2).

### Waiting list = Registration/Request date order (points formula se NAHI)
- Real lists **registration date (`Reg Date` / request date)** ke hisaab se order hoti hain — jo pehle register kare wo upar.
- Har **quarter type ki alag waiting list** (aur gazetted/non-gazetted alag pools).
- "Refusal" par priority date effectively change ho jaati hai (refusal date), "priority transferred from NR/HQ" (zone transfer), change-of-quarter requests — ye bhi real data mein dikhe.

### "Category" = Essential vs Non-essential service (caste NAHI)
- Possession report mein "Category: Essential" = service criticality (humara `service_type`), **caste nahi**.

### Caste = SC/ST reservation QUOTA (points nahi; OBC nahi)
- Reservation: **Type-I & II mein 10%**, **Type-III & IV mein 5%** — jahan station par 50+ quarters (I & II milakar count).
- **Sirf non-essential categories** mein lagu.
- **Do waiting lists:** ek general + ek SC/ST special; special list sirf reserved quota ke liye chalti hai. SC/ST jo general seniority pe aa jayein, unki allotment reserved quota mein count nahi hoti.
- **OBC ka koi reservation nahi** quarters mein (circular mein sirf SC/ST).

### Aur concepts (real system mein maujood)
Gazetted vs non-gazetted pools · out-of-turn allotment (alag register, date-of-registration order) · medical ad-hoc ~5% quota · husband-wife same station rule · multiple colony preferences (Place of Registration 1/2/3) · retention on transfer/retirement (Phase 5 already).

### Phase 3-R status
Done: grade-pay entitlement, registration-date ranking, `is_gazetted`. **Pending:** reservation roster + SC/ST special list, running-staff mapping, Type IV Special as a separate stored type, Type VI mapping.

### OPEN QUESTIONS (client se confirm)
1. OBC quarters reservation mein count hota hai? (circular: sirf SC/ST)
2. Waiting list order pure registration date se, ya service-length seniority bhi? (abhi: pure registration date)
3. Gazetted + non-gazetted dono scope mein, ya ek?
4. Essential vs non-essential kaise decide (designation list se)?
5. Out-of-turn / medical quota / refusal-date / priority transfer / change-of-quarter / husband-wife — in mein se kya scope mein?
