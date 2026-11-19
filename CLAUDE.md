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

- **Frontend:** React (Vite) + React Router. Plain JS (TypeScript nahi, jab tak maang na ho).
- **Backend:** Node.js + Express.
- **Database:** MySQL (`mysql2/promise`, connection pool). Raw SQL migrations — koi heavy ORM nahi (simple + transparent). Transactions zaroori jagah use karo (allotment, vacation complete).
- **Auth:** JWT (access token), role-based route guards dono taraf (backend middleware + frontend route protection).
- **File storage:** uploaded documents aur generated certificates disk par (`/uploads`, `/certificates`), DB mein sirf path.
- **PDF:** certificates server-side generate (e.g. `pdfkit`), file path DB mein.
- **Deploy:** GitHub → Hostinger Cloud Hosting (Node app + MySQL).

### Backend folder structure (Laravel reference ke service pattern ko mirror karo)
```
/server
  /src
    /config        -> db pool, rqms rules (points/eligibility/retention)
    /db/migrations -> .sql files (ordered)
    /middleware    -> auth, requireRole, requirePermission, auditRequest
    /routes        -> express routers (ek module = ek router)
    /controllers   -> thin: request parse + response, logic services ko
    /services      -> business logic (eligibility, priority, allotment, vacation, retirement, certificate, notification, audit)
    /utils
    app.js
    server.js
/uploads
/certificates
```

### Frontend folder structure
```
/client
  /src
    /api        -> axios instance + per-module calls
    /auth       -> context, useAuth, ProtectedRoute
    /components -> shared UI
    /pages      -> role-wise screens (dashboard, applications, quarters, allotments, vacations, admin...)
    /lib
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

## 7. Business rules (config-driven — `server/src/config/rqms.js`)

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
