# Chase Care Services — Frontend Specification

> Derived from the client proposal: `doc/client-specification/ChaseCareServices_Website_Proposal.docx`
> (section numbers in brackets, e.g. **[§7]**, refer to that document).
> Scope: everything the user **sees and interacts with** — pages, navigation, layout, content, forms (UI side), portal screens, branding, responsiveness, accessibility and SEO.
> Anything that stores, processes, secures or sends data is in `BACKEND_SPECIFICATION.md`.

---

## 1. Brand & Design System [§34, §36, §37]

| Item | Requirement |
|---|---|
| Primary tagline | *Quality Care. Compassionate Support. Empowered Lives.* |
| Supporting statement | *Person-centred care, professional support and training for individuals, families and communities in Ghana and across the diaspora.* |
| Alternative statement | *Caring for People. Supporting Families. Empowering Care Professionals.* |
| Three brand pillars | **CARE** · **CAREERS** · **COMMUNITY** — should be visible across the site |
| Ecosystem graphic [§35] | Care Services → Training & CPD → Competency → Employment & Placement → Worker Wellbeing → Client & Family Support → Respite & Inclusion → Partnerships |
| Tone | Trustworthy, professional, compassionate, person-centred |
| To be confirmed by client | Logo, colour palette, typography |

Design-system deliverables: colour tokens, type scale, spacing, buttons (primary/secondary CTA), cards, forms, alerts, badges (e.g. course certification type), icons, image style.

---

## 2. Global Layout

### 2.1 Header / Main Navigation [§6]

Home | About Us | Care Services | Training Academy | Respite & Accommodation | Wellbeing Hub | Join Our Team | Client Registration | Resources | Shop | Contact

- Dropdown/mega-menus following the sitemap (§4 below).
- "Log in to My ChaseCare" link (portals).
- Mobile: collapsible hamburger menu.

### 2.2 Prominent Calls to Action [§6, §39]

| Audience | CTA button |
|---|---|
| Families in Ghana | Request Care / Find a Care Service |
| Diaspora families | Arrange Care in Ghana ("I Live Abroad — Arrange Care in Ghana") |
| Caregivers | Join Our Team |
| Healthcare professionals | Register as a Professional |
| Students / SHS graduates | Start Your Care Career |
| Parents | Explore Parent Training |
| Existing workers | Log in to My ChaseCare |
| Training participants | Register for a Course |
| Partners | Partner With ChaseCare |
| Community members | Register for the Monthly Forum |

### 2.3 Footer

Contact details, social media links, quick links, Privacy Policy, Terms of Service, Cookie Policy, cookie-consent banner [§31].

### 2.4 Floating / persistent actions [§28]

Call Us · WhatsApp Us (click-to-chat) — especially on mobile.

---

## 3. Public Pages

### 3.1 Homepage [§7]

1. **Hero** — tagline, sub-heading, buttons: *Find a Care Service*, *Join Our Team*, *Explore Our Training*; diaspora line.
2. **Who We Are** — short intro + Read More.
3. **What We Do** — visual cards: Elderly Care, Disability & Autism Support, Home Care, Respite Care, Nanny Services, Housekeeping, Therapy & Professional Services, Community Support.
4. **Care for Families in Ghana & the Diaspora**.
5. **Why Choose ChaseCare** — person-centred care, trained workers, competency processes, wellbeing support, partnerships.
6. **Training Academy** highlight — key courses + student pathway.
7. **Wellbeing Hub** highlight.
8. **Community & Monthly Forum** (third Thursday) highlight.
9. **Testimonials / Stories** (only with consent — placeholder initially).
10. **Final CTA band**.

### 3.2 About Us [§1–4, §25, §27]

- Who We Are · Vision & Mission · Our Values (8 values: Compassion, Dignity, Person-Centred Care, Excellence, Integrity, Inclusion, Safeguarding, Empowerment) · Board of Directors · Our Team · Partners.
- **Leadership page**: profile cards (photo, name, position, background, experience, short bio) with detail view/modal.
- **Partners page**: grouped by type (healthcare, laboratories, insurance, schools, hospitals, community orgs, therapists, training/accreditation, corporate). Logos shown only where permitted.

### 3.3 Care Services [§8] — one listing page + a page per service

Elderly Care · Disability Support · Autism Support · Home Care · Community Support · Weekend Care · Nanny Services · Housekeeping · Therapy & Professionals · School Support · Hospital Support.
Each page: description, list of what's included (bullets from §8), who it's for, CTA "Request this service" (pre-fills the registration form).

### 3.4 Diaspora Services [§10]

Care for Loved Ones in Ghana · Elderly Care · Disability Support · Welfare Visits · Care Coordination.
Content: "Care From Anywhere in the World", service list, how it works, CTA *I Live Abroad — Arrange Care in Ghana*.

### 3.5 Respite & Accommodation [§9]

Family Respite · Young People Respite · Respite Residence · Short Stay / Airbnb ("Stay With Us").
Residence page: accommodation info, photo gallery, facilities, location map, availability display, accessibility info, respite packages, booking-enquiry form, house rules.

### 3.6 Schools & Hospitals [§21]

Working With Schools / Working With Hospitals pages; CTA *Partner With ChaseCare* (partnership enquiry form).

### 3.7 ChaseCare Academy [§14–16]

- Academy landing + course catalogue (cards, filters by category/certification type).
- Courses: Dementia Care, Health & Social Care, First Aid, Health & Safety, Care Beyond Care, Autism Awareness, Disability Support, Safeguarding, Person-Centred Care, Communication in Care, Professional Boundaries, other CPD.
- Course detail page: outline, duration, fee, dates, **certification badge** — clearly distinguish *Chase internal certificate* / *CPD* / *Externally accredited* (only show "internationally accredited" if actually obtained).
- **Care Beyond Care** — dedicated signature landing page with its own design [§15].
- **Student / Young Caregiver Programme** — "Start Your Career in Care" page with pathway graphic: Register → Introduction to Care → Training → Competency Development → Practical Experience → Certification → Career Opportunities [§16].
- **Competency & Workforce Standards** page — "No placement without appropriate preparation" [§13].
- "Register for a Course" form.

### 3.8 Parent & Family Learning Centre [§17]

Topic/course list (autism, communication, behaviour, inclusive education, independence, routines, emotional regulation, advocacy, working with schools, individual needs) + registration form.

### 3.9 Wellbeing Hub [§18]

Counselling · Health Services · Laboratory Services · Insurance · Wellbeing Resources · Webinars. Public info pages; request forms shown to logged-in workers.

### 3.10 Join Our Team [§12]

- Landing "Build Your Career in Care" + recruitment pathway graphic: Register → Screening → Training/Competency → Approval → Placement → Ongoing Support.
- Role pages: Caregivers, Nurses, Therapists, Healthcare Professionals, Nannies, Housekeepers.
- Application / professional-registration form (see §5).

### 3.11 Community [§22, §23]

Outreach · Volunteering · Monthly Forum · Partnerships.
**Monthly Forum page**: next date (auto-computed third Thursday), topic, registration form, past topics; future: "Join online" button (video-conference link).

### 3.12 The ChaseCare Journal (Blog / Resources) [§24]

Article listing with category filter (Elderly Care, Autism, Disability, Parenting, Caregiver Support, Dementia, Health & Wellbeing, Community, Training, Diaspora Care, Young People, SEN), search, article page, related posts, share buttons.

### 3.13 Shop [§26]

- Phase 1: catalogue display (Care ID cards, lanyards, T-shirts, branded clothing, training materials, merchandise).
- Phase 3: product page → cart → checkout → payment → order confirmation.

### 3.14 Contact Us [§28]

Phone, WhatsApp, email, address + map, opening hours, social links, contact form, service info; buttons *Call Us*, *WhatsApp Us*, *Request Care*, *Join Our Team*.

### 3.15 Legal pages [§31]

Privacy Policy · Terms of Service · Cookie Policy.

---

## 4. Sitemap / Routing [§33]

```text
/                         Home
/about                    (who-we-are, vision-mission, values, board, team, partners)
/care-services/:service   (11 services)
/diaspora/:page
/respite/:page            (family, young-people, residence, stay-with-us)
/schools-hospitals
/academy                  (courses/:slug, care-beyond-care, student-programme, standards)
/parent-learning
/wellbeing/:page
/join-our-team/:role
/register/client          Client registration ("I Need Care")
/community/:page          (outreach, volunteering, forum, partnerships)
/journal, /journal/:slug
/shop, /shop/:product, /cart, /checkout
/contact
/privacy, /terms, /cookies
/login, /forgot-password
/portal/client/*  /portal/worker/*  /portal/admin/*
```

---

## 5. Forms (UI layer) [§11, §12, §9, §14, §17, §21, §23, §28]

All forms: multi-step where long, inline validation, required-field markers, consent checkboxes, accessible labels, success/thank-you screen, mobile-friendly.

| Form | Key fields | Success message |
|---|---|---|
| **Client Registration – "I Need Care"** | Name, contact, location, **country of residence**; who needs care (self/parent/child/spouse/relative/other); type of support (elderly, disability, autism, home care, respite, weekend, nanny, housekeeping, therapy, community, hospital, school, other); frequency (one-off, daily, weekly, weekends, overnight, live-in, short-term, long-term); additional requirements | "Thank you. A member of the Chase Care Services team will review your request and contact you." |
| **Caregiver / Professional Registration** | Name, contact, location, education, care experience, qualifications, areas of competence, availability, preferred location, references, certifications, emergency contact, **document upload** | Confirmation + next steps of recruitment pathway |
| Course registration | Course, participant details, (payment in Phase 3) | Confirmation |
| Parent training registration | Course/topic, parent & child-needs info | Confirmation |
| Student programme registration | Details, education level | Confirmation |
| Respite / accommodation enquiry | Dates, guests/needs, accessibility, package | Confirmation |
| Partnership enquiry | Organisation, type, message | Confirmation |
| Forum registration | Name, contact, attendance mode | Confirmation (+ calendar add) |
| Contact form | Name, email/phone, subject, message | Confirmation |

---

## 6. Secure Portals (UI) [§19, §20, §30]

Shared: login, password reset, 2FA prompt, dashboard layout, sidebar navigation, notifications bell, profile/account settings, role-based menus.

### 6.1 Worker Portal — "My ChaseCare"

Dashboard · My Assignments (list/calendar) · Authorised client info view · **Submit Care Report** form · Upload documents · Training (course progress) · Certificates (view/download) · Availability calendar · Wellbeing resources & support requests · Policies library · Announcements.

**Care Report form [§20]**: client, date, start/end time, care provided, activities, observations, incidents, medication-related observations, concerns, follow-up required (toggle), additional notes. Draft/save + submit; read-only after submission.

### 6.2 Client Portal

View services · Submit requests · Book services · Appointments · Messages with ChaseCare · View relevant reports · Manage account.

### 6.3 Administrator Portal
>
> Full detail: see **`ADMIN_DASHBOARD_SPECIFICATION.md`** — the owner's dashboard for managing everything on the site. Content-management screens are delivered in **Phase 1**.

Dashboards and data tables (search, filter, sort, export) for: clients, workers (with application pipeline stages), worker–client matching screen, services, care-report review queue, training & courses, bookings, payments, documents, partners, blog/content, shop products & orders, forum events, announcements.

---

## 7. Cross-cutting Frontend Requirements

- **Responsive**: mobile, tablet, desktop — tested before launch [§37]. Mobile-first (most Ghanaian users on mobile).
- **Performance**: optimised images, lazy loading, fast on slower mobile networks.
- **Accessibility**: WCAG 2.1 AA (fits Inclusion/Disability values) — keyboard nav, contrast, alt text, screen-reader labels.
- **SEO** [§24]: meta tags, Open Graph, structured data (Organization, LocalBusiness, Article, Course, Event), sitemap.xml, clean URLs.
- **Internationalisation-ready**: currency display (GHS + foreign for diaspora), time-zones for diaspora users.
- **Cookie-consent** banner and consent checkboxes on forms [§31].
- **Analytics** hook (to be confirmed).
- Content-editable sections fed from CMS/API (no hard-coded content where client must update it).

---

## 8. Frontend Delivery by Phase [§32]

| Phase | Frontend work |
|---|---|
| 1 – Brand & Foundation | Design system, layout, Home, About, Vision/Mission, Board, Contact, Care Services, Diaspora, Join Our Team (info), Academy (info), Blog, **Admin dashboard: content management, users & settings** |
| 2 – Online Registration | All registration/enquiry forms (§5) |
| 3 – Booking & Payments | Booking screens, course payment, Shop cart/checkout, confirmations |
| 4 – Secure Portals | Login/auth screens, Client/Worker/Admin portal shells |
| 5 – Care Management | Assignments, care plans, shifts, care reports, incident reports, documents, availability, notifications UI |
| 6 – Wellbeing Hub | Counselling/health/lab request screens, insurance info, resources |
| 7 – Community & Learning | Forum registration, online learning player, CPD tracker, certificates, webinar join, events |
