# Chase Care Services — Backend Specification

> Derived from the client proposal: `doc/client-specification/ChaseCareServices_Website_Proposal.docx`
> (section numbers in brackets, e.g. **[§31]**, refer to that document).
> Scope: everything **behind the screens** — data, APIs, authentication & roles, business workflows, file storage, bookings, payments, notifications, content management, security, privacy and integrations.
> Visual/UI requirements are in `FRONTEND_SPECIFICATION.md`.

---

## 1. Architecture Principles [§31, §37, §38]

- Build as a **scalable care-management platform**, not a brochure site: Phase 1 is public content, but the data model and auth must already support Phases 2–7.
- REST (or GraphQL) API consumed by the frontend; versioned (`/api/v1`).
- Separation of public endpoints (content, forms) from authenticated portal endpoints.
- Sensitive health/personal data isolated and access-controlled.
- To confirm with client: hosting, domain, SSL, backups, payment gateway, communication tools [§37].

---

## 2. User Roles & Access Control (RBAC) [§19, §20, §30, §31]

| Role | Access |
|---|---|
| Public visitor | Public content, submit forms |
| Client / Family (incl. diaspora) | Own profile, requests, bookings, appointments, messages, reports shared with them |
| Worker (caregiver, nurse, nanny, housekeeper…) | Own profile, assigned assignments, **only authorised client info**, submit reports, training, certificates, availability, wellbeing |
| Healthcare Professional | Worker permissions + professional profile/verification |
| Student / Trainee / Parent learner | Courses, progress, certificates |
| Manager / Supervisor | Review care reports, manage assignments for their clients/workers |
| Administrator | Full management (see §4.10) |
| Content Editor | Blog, pages, events, partners, shop catalogue |

Permissions enforced server-side on every request; record-level checks (e.g. worker can only see clients they are assigned to).

---

## 3. Core Data Model (entities)

- **User** (email, phone, password hash, role(s), 2FA settings, status, last login)
- **ClientProfile** (contact, location, country of residence, diaspora flag) → **CareRecipient** (relationship: self/parent/child/spouse/relative/other, needs, location in Ghana)
- **CareRequest** (support types[], frequency, requirements, status: new → reviewed → consultation → arranged / declined)
- **WorkerProfile** (role type, education, experience, qualifications, competencies, availability, preferred location, emergency contact, **recruitment stage**: registered → screening → training/competency → approved → placed)
- **Reference**, **Certification**, **Document** (owner, type, file key, verified flag, expiry)
- **ScreeningCheck** (interview, background/safeguarding, references, competency assessment results) [§13]
- **Service** / **ServiceCategory** (elderly, disability, autism, home care, community, weekend, nanny, housekeeping, therapy, school, hospital, diaspora services)
- **Assignment / Shift** (client, worker(s), dates/times, care plan, status)
- **CarePlan**
- **CareReport** [§20] (assignment, client, date, start/end, care provided, activities, observations, incidents, medication observations, concerns, follow-up flag, notes, submitted_by, review status, reviewer)
- **IncidentReport**
- **Course** (title, category, **certification type: internal / CPD / externally accredited + accreditation body**, fee, duration), **CourseSession**, **Enrollment**, **Lesson/Module**, **Progress**, **Certificate** (number, issue date, verifiable)
- **Programme** (Student/Young Caregiver, Parent & Family Learning)
- **Booking** (type: service / respite / accommodation / training; dates; status), **RespitePackage**, **Property/Room**, **Availability**
- **WellbeingRequest** (counselling, health referral, lab referral), **InsuranceInfo**, **WellbeingResource**
- **Event** (Monthly Forum — third Thursday; community events; webinars) + **EventRegistration**
- **Partner** (type, logo, permission-to-display flag)
- **BoardMember / TeamMember** (photo, name, position, background, bio)
- **BlogPost** (The ChaseCare Journal; categories, tags, author, SEO fields), **Page** (CMS content)
- **Product**, **Cart**, **Order**, **OrderItem**, **Payment**
- **Enquiry** (contact, partnership, respite, school/hospital)
- **Message / Conversation** (client ↔ ChaseCare)
- **Announcement**, **Policy document**
- **Notification**
- **AuditLog** (who, what, when, record, IP) [§31]
- **Consent** (type, version, timestamp) [§31]

---

## 4. Functional Modules & API

### 4.1 Content / CMS [§7–10, §21–27, §37]

Admin-managed content for all public pages, services, leadership, partners, testimonials (with consent flag), blog, FAQs, media library. Public read endpoints with caching. Admin must be able to manage content without a developer [§37].

### 4.2 Forms & Enquiries (Phase 2) [§11, §12, §9, §14, §17, §21, §23, §28]

Endpoints for: client registration ("I Need Care"), worker/professional registration (with document upload), course registration, parent-training registration, student programme registration, respite enquiry, service request, partnership enquiry, forum registration, contact.
Each: server-side validation, spam protection (CAPTCHA/rate limit), stored in DB, **staff notification email** + **acknowledgement email** to submitter, appears in Admin queue.

### 4.3 Recruitment & Workforce Pipeline [§12, §13, §29]

Workflow: Register → Screening → Training / Competency Assessment → Approval → Placement → Ongoing Support.

- Stage tracking, notes, checklist per stage (interview, safeguarding check, references, competency assessment).
- Rule: **no placement without completed preparation** — a worker cannot be assigned until required checks/training are marked complete.
- Professional verification flow for healthcare professionals.

### 4.4 Client Care Management (Phase 5) [§19, §20, §30]

- Care request intake → consultation → care arrangement.
- **Matching**: admin matches workers to clients (filter by competence, location, availability).
- Assignments/shifts, care plans, staff availability, client records.
- **Care reports**: worker submits after assignment → manager review queue → (optionally) shared with client/family. Immutable after submission (amendments versioned).
- Incident reporting with escalation notification.

### 4.5 Bookings (Phase 3) [§9, §30]

Service booking, respite booking, accommodation/short-stay availability calendar & booking, training session booking. Conflict checks, confirmations, cancellations. Optional Airbnb calendar sync (iCal) if property is on Airbnb.

### 4.6 Payments & Shop (Phase 3) [§26, §32]

- Payment gateway supporting Ghana (Mobile Money + cards) **and** international cards for diaspora — e.g. Paystack / Flutterwave / Hubtel (to be confirmed).
- Course fees, booking payments, shop orders.
- Shop: product catalogue, stock, cart, checkout, order, payment, confirmation email, order management.
- Webhooks for payment confirmation; receipts/invoices.

### 4.7 Academy / Learning (Phases 1, 7) [§14–17]

Courses, sessions, enrollment, online lessons, progress & CPD hours tracking, assessments, **certificate generation (PDF) with verification code**. Certification type stored explicitly — never labelled "internationally accredited" unless an accreditation record exists.

### 4.8 Wellbeing Hub (Phase 6) [§18]

Counselling requests, health-service referrals, partner laboratory referrals, insurance benefit info, wellbeing resources, webinars. Requests are confidential — visible only to worker + designated wellbeing staff.

### 4.9 Community & Events (Phase 7) [§22, §23]

Event management; Monthly Forum auto-scheduled for the **third Thursday of each month**; registrations; reminders; video-conference integration (Zoom / Google Meet / Teams — to confirm) generating join links.

### 4.10 Administrator Functions [§30]
>
> Full detail: see **`ADMIN_DASHBOARD_SPECIFICATION.md`** (sections, roles, permissions, rollout by phase).

Manage clients, workers, matching, services, reports review, training & courses, bookings, payments, documents, partners, content, shop, events, announcements, users & roles. Reporting/exports (CSV).

### 4.11 Notifications [§32 Phase 5, §37]

Email (transactional provider), SMS and/or WhatsApp (to confirm), in-app notifications. Triggers: form submissions, application stage changes, assignment created/changed, report submitted/reviewed, booking & payment confirmations, forum reminders, announcements.

---

## 5. Security, Privacy & Data Protection [§20, §31]

| Requirement | Implementation note |
|---|---|
| Secure login | Hashed passwords (bcrypt/argon2), lockout, rate limiting |
| Role-based access | RBAC + record-level authorisation |
| Encrypted connections | HTTPS/TLS everywhere, HSTS |
| Encryption at rest | DB + file storage for health data |
| Secure document uploads | Type/size validation, virus scan, private storage, signed time-limited URLs |
| Password protection | Strong password policy, secure reset flow |
| 2FA | Required for admin/staff and workers accessing client data; optional for clients |
| Audit logs | Log access to and changes of sensitive records |
| Backups | Automated, encrypted, tested restores |
| Legal | Privacy policy, terms, cookie policy content support |
| Data retention | Configurable retention/deletion procedures |
| Consent | Stored consent records (forms, testimonials, partner logos, marketing) |
| Compliance | Review against **Ghana Data Protection Act, 2012 (Act 843)** and relevant healthcare requirements; GDPR considerations for UK/EU diaspora users |

Also: input validation, CSRF/XSS/SQL-injection protection, secrets management, dependency updates, logging & monitoring.

---

## 6. Integrations (to confirm with client)

- Payment gateway (MoMo + cards, multi-currency)
- Email provider (transactional)
- SMS / WhatsApp Business API
- Video conferencing (forum, webinars)
- Maps (location/contact/residence)
- Airbnb calendar sync (if applicable)
- Analytics
- File storage (cloud object storage)

---

## 7. Backend Delivery by Phase [§32]

| Phase | Backend work |
|---|---|
| 1 – Foundation | Project setup, DB, CMS/content APIs, contact form, blog, hosting/SSL/backups, **admin authentication (2FA), roles & permissions, audit log, site settings** |
| 2 – Online Registration | Form APIs, document upload, email notifications, admin enquiry queues |
| 3 – Booking & Payments | Booking engine, payment gateway, shop/orders, confirmations |
| 4 – Secure Portals | Auth, 2FA, RBAC, client/worker/admin APIs, audit logs |
| 5 – Care Management | Assignments, care plans, shifts, care reports, incidents, documents, availability, client records, notifications |
| 6 – Wellbeing Hub | Counselling/health/lab referrals, insurance info, resources |
| 7 – Community & Learning | Forum & events, online learning, CPD tracking, certificates, webinar integration, partner management |

---

## 8. Open Questions for the Client

1. Logo, colours, typography ready?
2. Preferred hosting / existing domain (chasecareservices.org) access?
3. Payment gateway preference (Paystack, Flutterwave, Hubtel, other)? Currencies to accept?
4. Communication tools: SMS, WhatsApp Business, email provider?
5. Video-conferencing platform for forum/webinars?
6. Is the respite residence listed on Airbnb (calendar sync needed)?
7. Which courses currently have external accreditation (and by whom)?
8. Who reviews care reports, and should families see them?
9. Data-retention periods required for client and worker records?
10. Content/photos/bios for leadership, partners and services — who supplies them?
