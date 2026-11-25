# Chase Care Services — Admin Dashboard Specification

> Derived from the client proposal (`doc/client-specification/`), sections **[§30]**, **[§31]**, **[§37]** and every feature section it manages.
> Purpose: one secure dashboard where the **owner and authorised staff manage everything on the website and platform** — content, people, care operations, training, bookings, payments, shop, community and settings — without needing a developer.
> Related: `FRONTEND_SPECIFICATION.md` (§6.3 portal UI) and `BACKEND_SPECIFICATION.md` (§2 roles, §4 modules).

---

## 1. Principles

- **Owner in control from day one** — content management ships in **Phase 1**, not Phase 4. Other admin sections are added as each phase's features go live.
- **No developer needed** for day-to-day changes (text, images, prices, dates, courses, products, staff accounts).
- **Secure by default** — 2FA mandatory for all admin users, role-based permissions, every change recorded in the audit log [§31].
- **Simple to use** — consistent list → detail → edit pattern, search/filter/sort on every list, works on tablet and phone for quick checks.
- **Draft → Preview → Publish** for all public content.

---

## 2. Admin Users & Roles

The owner (Super Admin) creates staff accounts and decides what each can see and do.

| Role | Typical access |
|---|---|
| **Super Admin (Owner)** | Everything, including settings, roles, payments, audit log, deleting records |
| **Operations / Care Manager** | Clients, care requests, workers, matching, assignments, care reports, incidents |
| **Recruitment Officer** | Applicants, screening, references, documents, competency |
| **Training Coordinator** | Academy courses, sessions, enrolments, certificates, parent & student programmes |
| **Wellbeing Officer** | Wellbeing requests (confidential), resources, webinars |
| **Bookings & Finance** | Bookings, respite/accommodation, payments, refunds, shop orders |
| **Content Editor** | Pages, blog, media, testimonials, partners, leadership, events, SEO |
| **Custom role** | Owner can build a role by ticking permissions per section (view / create / edit / delete / export) |

---

## 3. Dashboard Sections

### 3.1 Overview (Home)

- Key numbers (today / this week / this month): new care requests, new applicants, bookings, course enrolments, forum registrations, shop orders, revenue.
- Action queues: unread enquiries, care reports awaiting review, incidents, documents awaiting verification, pending payments, low-stock products.
- Upcoming: assignments today, next Monthly Forum, upcoming course sessions, respite check-ins.
- Recent activity feed.

### 3.2 Website Content (CMS) — Phase 1

Manage every public page [§7–§10, §14–§28]:

- **Homepage**: hero text, buttons, images; each section (Who We Are, What We Do cards, Diaspora, Why Choose Us, Academy, Wellbeing, Forum, Testimonials, final CTA) — edit, reorder, show/hide.
- **Pages**: About, Vision & Mission, Values, Diaspora, Respite, Schools & Hospitals, Wellbeing Hub, Join Our Team, Parent Learning, Community, Contact, legal pages (Privacy, Terms, Cookies) — rich-text editor with reusable blocks (text, image, gallery, cards, pathway steps, FAQ, CTA band).
- **Care Services**: add / edit / reorder / hide services; description, "what's included" list, image, CTA.
- **Navigation**: main menu, dropdowns, footer links, CTA buttons.
- **Leadership & Team** [§27]: profiles (photo, name, position, background, experience, bio), ordering.
- **Partners** [§25]: name, type, logo, link, **"permission to display" checkbox** (logo hidden until ticked).
- **Testimonials**: add / approve, **consent recorded** before publishing.
- **Announcements / banners**: site-wide notice bar with start/end dates.
- **Media library**: upload, crop, alt text, folders (respite photos, leadership, partners, blog).
- **SEO** per page: title, description, share image, URL slug.
- Draft, preview, publish, schedule, version history & restore.

### 3.3 The ChaseCare Journal (Blog) — Phase 1 [§24]

Posts, categories, tags, authors, featured image, schedule publishing, SEO fields.

### 3.4 Enquiries & Form Submissions Inbox — Phase 2 [§11, §12, §9, §14, §17, §21, §23, §28]

One inbox with tabs per form: Care Requests ("I Need Care"), Worker / Professional Applications, Course Registrations, Parent Training, Student Programme, Respite Enquiries, Partnership Enquiries (incl. schools/hospitals), Forum Registrations, Contact.

- Status (New → In Progress → Contacted → Converted / Closed), assign to staff member, internal notes, reply by email/WhatsApp link, export CSV.
- Diaspora flag & country shown on care requests.
- Convert a care request into a **Client** record; convert an application into a **Worker** record.

### 3.5 Clients & Families — Phase 2 → 5 [§11, §30]

- Client list (Ghana / diaspora filter), family contacts, care recipients, needs, service history, consents.
- Consultation notes, care plans, linked assignments, reports shared with family, payments, messages.
- Client portal access: invite, disable, reset password.

### 3.6 Workforce & Recruitment — Phase 2 → 5 [§12, §13]

- **Recruitment pipeline** board: Registered → Screening → Training / Competency → Approved → Placed → Ongoing Support (drag between stages).
- Stage checklists: interview, background/safeguarding check, references, competency assessment (practical skills, communication, conduct, dignity, safeguarding, documentation, emergency procedures).
- **"No placement without preparation" lock** — a worker cannot be placed until required checklist items are complete.
- Worker profiles: role, qualifications, competencies, availability, preferred location, emergency contact, documents (verify / reject / expiry reminders), training & certificates.
- Healthcare professional verification.

### 3.7 Care Operations — Phase 5 [§19, §20, §30]

- **Matching**: suggest workers for a client by competency, location, availability; assign.
- **Assignments & shifts**: calendar and list views, create/edit/cancel, reassign.
- **Care reports review queue**: read, approve, request changes, flag follow-up, share with family.
- **Incidents**: list, severity, escalation, actions taken, close-out.
- Staff availability overview.

### 3.8 ChaseCare Academy — Phase 1 (catalogue) → 7 (online learning) [§14–§17]

- Courses: title, category, description, fee, duration, image, **certification type (Internal / CPD / Externally Accredited + accrediting body)** — "accredited" badge only allowed when an accreditation is recorded.
- Sessions/dates, capacity, enrolments, attendance, results.
- Online lessons/modules, CPD hours, assessments (Phase 7).
- **Certificates**: issue, auto-numbered PDF, revoke, verification code.
- Care Beyond Care landing content, Student Programme, Parent & Family Learning courses.

### 3.9 Bookings, Respite & Accommodation — Phase 3 [§9]

- Bookings list & calendar (service, respite, accommodation, training).
- Respite residence: rooms/property details, photos, facilities, house rules, accessibility info, packages & prices, **availability calendar** (block dates), optional Airbnb calendar sync.
- Confirm / reschedule / cancel, send confirmation.

### 3.10 Payments & Finance — Phase 3 [§26, §32]

- Transactions (Mobile Money, cards, currency), status, receipts/invoices, refunds.
- Payment gateway settings (owner only).
- Revenue reports by source (services, courses, respite, shop), date range, export.

### 3.11 Shop — Phase 1 (catalogue) → 3 (orders) [§26]

Products (name, images, price, variants e.g. T-shirt sizes, stock), categories, orders (status: paid → packed → shipped/collected), low-stock alerts, discount codes (optional).

### 3.12 Wellbeing Hub — Phase 6 [§18]

Counselling / health / laboratory referral requests (**confidential — Wellbeing role only**), partner labs & services list, insurance information, wellbeing resources, webinars.

### 3.13 Community & Events — Phase 7 (forum registration from Phase 2) [§22, §23]

- **Monthly Forum**: auto-created for every **third Thursday**; set topic, speaker, venue/online link; registrations list; send reminders; mark attendance.
- Other community events, outreach programmes, volunteering opportunities.
- Video-conference link integration.

### 3.14 Communications — Phase 2 →

- Email (and SMS/WhatsApp, if confirmed) **templates** for every automatic message (form acknowledgements, application stage updates, booking/payment confirmations, forum reminders) — owner can edit wording.
- **Announcements** to workers / clients (portal + email).
- Policies library for workers [§19].

### 3.15 Reports & Analytics

Care requests by service and country, recruitment funnel, placements, report submission rate, course enrolments & completions, bookings occupancy, revenue, forum attendance, website traffic (if analytics connected). Export CSV/PDF.

### 3.16 Users, Roles & Security — Phase 1 → [§31]

- Admin/staff accounts, roles & custom permissions, invite, deactivate.
- Enforce 2FA, session timeout, login history.
- **Audit log** viewer: who viewed/changed what and when (filter by user, record, date).
- Data requests: export or delete a person's data; retention rules.

### 3.17 Site Settings — Phase 1 [§28, §31]

Organisation name, logo, colours (from approved brand), contact phone, WhatsApp number, email, address & map, opening hours, social links, default SEO, cookie banner text, notification recipients (which staff email receives which form), currencies, time zone, integrations (payment, email, SMS, video, analytics).

---

## 4. Rollout by Phase [§32]

| Phase | Admin sections delivered |
|---|---|
| **1 – Foundation** | Overview (basic), Website Content (CMS), Blog, Media, Leadership, Partners, Academy catalogue, Shop catalogue, Users & Roles, Site Settings, Audit log |
| **2 – Online Registration** | Enquiries Inbox (all forms), Clients (basic), Recruitment pipeline, Forum registrations, Email templates |
| **3 – Booking & Payments** | Bookings, Respite & Accommodation, Payments & Finance, Shop orders |
| **4 – Secure Portals** | Client & worker portal account management, announcements, permissions refinement |
| **5 – Care Management** | Matching, Assignments & shifts, Care plans, Care report review, Incidents, Documents, Availability |
| **6 – Wellbeing Hub** | Wellbeing requests, labs, insurance, resources |
| **7 – Community & Learning** | Events & forum management, online courses, CPD tracking, certificates, webinars, Reports & Analytics (full) |

---

## 5. Open Questions for the Owner

1. Who on the team needs admin access at launch, and in which roles?
2. Which staff should receive each type of form notification?
3. Should care reports be visible to families automatically, or only after manager approval?
4. Any approval step needed before content is published (e.g. editor drafts, owner approves)?
5. Preferred language for automatic emails/SMS, and should WhatsApp be used for notifications?
