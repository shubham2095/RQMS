# CLAUDE.md — Railway Quarter Management System (RQMS)

> Ye file har Claude Code session ke start par padhi jaati hai. Project ka single source of truth.
> Isme domain rules, schema, state machines aur conventions hain — inhe dobara mat derive karo, yahin se uthao.

---

## 1. Project kya hai

RQMS ek **role-based workflow system** hai jo railway quarters ka poora lifecycle manage karta hai:
**allotment → occupancy → vacation → retirement.** 100% online, paperless, full audit trail.

Do core flows:

- **Allotment (Part 1):** Employee apply karta hai → Clerk verify → System eligibility + priority points nikalta hai → waiting list rank → Estate Officer approve → vacant quarter ka offer → employee accept → Clerk possession record → occupancy start + certificates.
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
  /config          -> env.js, db.js (Sequelize instance), rqms.js (points/eligibility/retention/clearance rules)
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
- Engine pure hai: `eligibilityService.evaluate(application, profile, asOf)` aur `priorityService.calculate({service_type, category, medical_ground, date_of_joining, waiting_since}, asOf)` — koi DB nahi. Score run-engine par save hota hai (age/seniority ka daily refresh Phase 5 mein).
- Waiting list: queue = (quarter_type, station); `priority_score DESC, waiting_since ASC, id ASC`; `waitingListService.place/reRank/remove/queue`. Remove = `is_active=false, rank=NULL` (history rehti hai).
- Offer (`allotment.approve`): quarter ki queue ka rank-1 entry; **application `approved` na ho to offer refuse (400)** — koi skip nahi hota. Sab `sequelize.transaction` + row locks (quarter, queue). Offer par: quarter `allotted`, application `allotted`, entry hatao + re-rank, ALLOTMENT_ORDER certificate. Employee accept/reject (`respond`): reject par quarter `vacant` + application `rejected` (naya apply kar sakta hai). Possession (`allotment.possession`, sirf accepted par): quarter `occupied` + occupant, occupancy row, `has_active_allotment=true`, POSSESSION_LETTER + OCCUPANCY_CERTIFICATE.
- Numbers: application `QA-YYYYMMDD-NNNN`, allotment order `AO-YYYYMMDD-NNNN` (daily sequence, `utils/referenceNumber.js`), certificate `ALO|POL|OCC-YYYYMMDD-XXXXXX`.
- Files: uploads (`documents`, polymorphic) aur certificates (PDF via pdfkit) `config/storage.js` ki dirs mein (`UPLOADS_DIR` / `CERTIFICATES_DIR` env, default repo-root `uploads/` `certificates/`); DB mein relative filename. Download: `GET /api/documents/:id/download`, `GET /api/certificates/:id/download` (owner ya staff). Certificate generate flow ke AAKHIR mein, transaction ke andar.
- `TODO(Phase 5)` comments services mein: audit log + notification yahin lagenge. JSON columns ke liye `utils/jsonField.js` (MariaDB JSON ko text deta hai).
- Demo data (dev only): `employee2/3/4@rqms.test` = EMP1002 (essential, SC, ~21 yrs), EMP1003 (GENERAL, ~4 yrs), EMP1004 (OBC, ~16 yrs) — ranking test ke liye. Optional env `API_RATE_LIMIT` (default 300 req / 15 min).

**Vacation flow (Phase 4 — done):**
- Employee (`possession_taken` allotment) -> `POST /api/vacations` (`vacationWorkflowService.initiate`): request `VAC-YYYYMMDD-NNNN`, status `in_clearance`, `current_step` = pehla step, 5 `vacation_clearances` rows (pending, sequence 1..5), quarter `vacation_pending`. Ek allotment par ek hi open request. `requested_vacation_date` >= possession date, <= 1 saal aage. `trigger = retirement` par retirement record Phase 5 (TODO marker service mein).
- Steps (config `vacationClearanceSteps`, order fixed) aur unki permission (`vacationStepPermissions`): clerk_inspection -> `vacation.clerk_inspection`, electrical -> `vacation.electrical`, water -> `vacation.water`, accounts -> `vacation.accounts`, estate_officer -> `vacation.estate_officer`. super_admin bypass.
- `POST /api/vacations/:id/act` body `{ step, decision: 'approve'|'reject', remarks?, ...optional }`: `step` current step se match na kare to 400 (stale click), us step ki permission na ho to 403. **Har step sirf approve/reject hai**; `has_damage` (clerk), `meter_reading` (electrical), `dues_amount` (electrical/water/accounts) OPTIONAL informational fields hain — timeline par record hote hain, approve ko kabhi block nahi karte. Reject par remarks zaroori.
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

## 7. Business rules (config-driven — `server/config/rqms.js`)

### Priority points (higher = behtar rank)
- Essential service: **+50**
- Medical ground: **+30**
- Category: SC **+20**, ST **+20**, OBC **+10**, General **0**
- Seniority: **+1 per completed service year**, cap **15**
- Application age: **+1 per completed month waiting**, cap **10**
- Total score = sab ka sum. Breakdown save karo (audit/transparency ke liye).

### Eligibility (apply karne ke liye minimum completed service years, quarter type ke hisaab se)
- Type I: 0 · II: 0 · III: 3 · IV: 7 · V: 12 · VI: 18
- `block_if_existing_allotment = true` → active quarter wala apply nahi kar sakta
- Requested station = posting station hona chahiye
- Profile complete ho (designation + date_of_joining)
- Result structured return karo: `{ eligible, reasons[], checks{} }`

### Waiting list ranking
- Queue key = (quarter_type, station)
- Order: `priority_score DESC`, tie-break `waiting_since ASC` (jo pehle apply kiya)
- Koi bhi change hone par us queue ki re-rank karo

### Retirement
- Retention period: **120 days** (retirement date se)
- Overstay penalty: **₹250 / day**
- Expiry alert: expiry se **15 days** pehle
- Daily cycle: expiring → alert, expiry ke baad → overstaying + penalty calc

### Allotment (transaction mein karo)
- Vacant quarter → waiting list ka rank-1 → offer → allotment order no auto-generate (`AO-YYYYMMDD-XXXX`)
- Offer par: quarter = `allotted`, application = `allotted`, waiting entry hatao
- Accept → possession record → occupancy create, quarter = `occupied`, profile `has_active_allotment = true`, certificates generate
- Reject → quarter wapas `vacant`

---

## 8. Core DB tables (MySQL)

`users`, `roles`, `permissions`, `role_user`, `permission_role`,
`employee_profiles`, `family_members`, `quarters`,
`quarter_applications`, `waiting_list_entries`, `allotments`, `occupancies`,
`vacation_requests`, `vacation_clearances`, `retirement_records`,
`documents` (polymorphic), `certificates` (polymorphic),
`notification_logs`, `audit_logs`.

> Full column list purane Laravel migrations se liya gaya hai — har table banate waqt wahi columns + FKs + indexes rakho. Reference phase plan mein diya hai.

Key points:
- `quarter_applications` par apply ke waqt `service_type` aur `category` ka **snapshot** rakho (baad mein profile badle to rank na bigde).
- `eligibility_result` aur `priority_breakdown` JSON columns mein store karo.
- `documents` aur `certificates` polymorphic hain (`documentable_type/id`, `certifiable_type/id`).
- `audit_logs` — har important action log ho (user, action, affected model, before/after, ip, time).

---

## 9. Modules → routes (reference)

auth · profile(+family) · applications(verify/run-engine/decide) · waiting-list ·
quarters(master CRUD) · allotments(offer/respond/possession) · vacations(+act=clearance) ·
retirements(+run-cycle) · certificates(download) · notifications · reports · audit · admin/users

---

## 10. Build order

Phase 0 setup → 1 auth+RBAC → 2 master data (quarters/users) → 3 allotment flow →
4 vacation flow → 5 retirement + cross-cutting (audit/documents/certificates/dashboard) → 6 deploy.
Ek phase complete + test, phir agla. Detail `RQMS_BUILD_PLAN.md` mein.
