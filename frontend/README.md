# Chase Care Services — Frontend

The public website, built with **Next.js 15 (React) + TypeScript + Tailwind CSS**, reading content from the Supabase backend (`../backend`).

Brand colours come from the CHASE logo: deep purple `#3B0A5E`, orange `#F89A00`, lavender accent. They are defined once as design tokens in `src/app/globals.css` (`brand-*`, `accent-*`).

## What's built (Phase 1)

| Page | Address | Content comes from |
|---|---|---|
| Home | `/` | Hero from the `home` page (once published) + services, courses, testimonials |
| About Us | `/about` | Vision, mission and values from the proposal; board, team and partners from the database |
| Care Services | `/care-services`, `/care-services/<slug>` | `services` (group `care`) |
| Diaspora Services | `/diaspora`, `/diaspora/<slug>` | `services` (group `diaspora`) |
| Respite & Accommodation | `/respite`, `/respite/<slug>` | `services` (group `respite`) |
| ChaseCare Academy | `/academy`, `/academy/<slug>` | `courses` |
| The ChaseCare Journal | `/journal`, `/journal/<slug>` | `posts`, `post_categories` |
| Shop (catalogue) | `/shop` | `products` |
| Contact | `/contact` | Settings + contact form |
| Request Care ("I Need Care") | `/register/client` | Care request form |
| Search | `/search?q=…` | `search_site()` in the database (published content only) + built-in pages |
| Wellbeing, Join Our Team, Community, Monthly Forum, Schools & Hospitals, Parent Learning, Workforce Standards, legal pages | `/<slug>` | Published `pages` row with that slug, otherwise built-in copy from the proposal (`src/lib/site-copy.ts`) |

Rules the site follows:

- Only **published** content is shown; drafts return 404. This is enforced by the database, not just the website.
- Course certificates show "Chase certificate", "CPD course" or "Externally accredited". "Accredited" only appears when the database has the accreditation recorded.
- Testimonials only appear once consent is recorded; partner logos only with display permission.
- Both forms send to `submit_enquiry()` and land in the admin enquiries inbox with their type (contact, care request, partnership, course registration…). They require consent, include a hidden bot trap, and work on phones.
- The Monthly Forum date is calculated automatically (third Thursday).
- Pages are cached for 5 minutes, so content edits appear on the live site within 5 minutes.
- **Accessibility menu** (orange ♿ tab on the right): text size, high contrast, underlined links, readable font, stop animations. Saved on the visitor's device only (no cookies, nothing loaded from outside). Styles are in `globals.css` under `a11y-*`.
- **Related information** box on About, service, course and information pages, built automatically from the main menu (`src/lib/related.ts`).
- **Impact numbers** (homepage and About) and **Recognition** (About) come from `site_settings.impact_stats` and `site_settings.recognitions`, and stay hidden until real entries are added.
- **Choose language** (footer): Google Translate into Twi, Ga, Ewe, Hausa, French or Arabic. Google's script only loads after a visitor picks a language other than English, and the choice is remembered in a `googtrans` cookie. This is machine translation, so mention it in the Cookie and Privacy policies. Languages are listed in `src/lib/languages.ts`.

## Staff dashboard (`/admin`)

Sign-in for Chase Care staff, separate from the public site (not indexed by search engines).

| Section | Who sees it | What it does |
|---|---|---|
| Sign in · Forgot password · Set password | Everyone | Email + password; reset and invitation links land on `/admin/set-password` |
| Two-step verification | All staff (when required) | Authenticator app (QR code first time, 6-digit code after). Required whenever `private.security_settings.require_staff_mfa` is on (the live default) |
| Overview | All staff | Enquiry counts, latest enquiries, published content counts |
| Enquiries | `enquiries.view` / `.edit` | Inbox with filters and search, full form details, reply links (email, call, WhatsApp), status, internal notes |
| Site settings | `settings.view` / `.edit` | Organisation details, contact, opening hours, social links, impact numbers, recognition. Saving refreshes the public site |
| Staff & roles | `users.view` / `.edit` | Invite by email, give or remove roles, deactivate. Only a Super Admin can grant Super Admin; the last one can't be removed |
| Homepage & banners | `content.edit` | The 4 homepage slides (photo, headings, text, two buttons) and a background photo for each page banner (saved with the `set_page_banners` database function) |
| Services · Pages · Team & board · Partners · Testimonials · Menus | `content.*` | List, create, edit, publish/draft/archive, delete. Photos upload straight from the form |
| The Journal | `blog.*` | Articles with headings (`## `), bullet lists (`- `), scheduled publishing, categories and tags |
| Courses | `academy.*` · Shop products `shop.*` · Announcements `communications.*` | Same editor |
| Media library | `media.*` | Upload up to 10 photos at once, folders, descriptions for screen readers, delete |
| Activity log | `audit.view` | Every change with who, when and which fields — read-only |

Every action runs as the signed-in staff member, so the database's Row Level Security applies. Inviting staff and showing their email addresses uses `SUPABASE_SECRET_KEY` on the server only.

The content editors are driven by one list of field definitions in `src/lib/admin/resources.ts` — add a field there and it appears in the form. Every save refreshes the public site immediately. Photos go to the public `public-media` bucket, so never upload anything containing personal details.

## Photos

The site has photo slots everywhere: the homepage **slider** (4 slides that fade every 7 seconds, editable at `/admin/homepage`), a **background photo** behind each page's banner, and **picture-and-text sections** on the homepage. Any slot without a photo shows a branded purple placeholder, so the site never looks broken.

All slots are listed in `src/lib/images.ts`. To add a photo, put it in `public/images/` and set that slot's `src`. Services also show their own photo, on their card and as their page banner, when one is set for the service in the database (`services.image_path`).

Photo guidelines:

- **Size:** slider and banner photos at least **1920 × 1080 px**, landscape; section photos at least **1200 × 900 px**. Small images look blurry when stretched.
- **Subject placement:** keep faces and the main subject off the far left. A purple tint sits behind the text on the left.
- **Rights:** use your own photos, or stock photos you are licensed to use. Only use photos of clients and staff with their written consent.

## Run it locally

Needs Node.js 20+. Start the backend first (`cd ../backend && npm start`), then:

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edit `.env.local`. For the local backend use `http://127.0.0.1:54321` and the publishable key printed by `npm start` in `backend/`. Then:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint + TypeScript type-check |
| `npm test` | Unit tests (Vitest) |
| `npm run types:sync` | Copy the database types from `../backend/types/database.ts` after a schema change |

## Deploy (Vercel)

1. Import the GitHub repository at <https://vercel.com/new> and set **Root Directory** to `frontend`.
2. Add these environment variables (all public):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://hkvcwdvtgmniuqxvuqsv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Supabase dashboard → Project Settings → API Keys → Publishable key
   - `NEXT_PUBLIC_SITE_URL` = the website address, e.g. `https://chasecareservices.org`
   - `SUPABASE_SECRET_KEY` = Supabase dashboard → Project Settings → API Keys → **Secret** key (server only, for staff invitations)
3. Deploy. Then in Supabase → Authentication → URL Configuration, set the **Site URL** to the same address and add `https://<your-address>/**` to **Redirect URLs** (needed for password reset and staff invitation links).

## Still to come

- Admin dashboard (`/admin`): staff sign-in with two-factor, content editing, enquiries inbox, settings, users & roles.
- The official logo file (SVG or PNG) to replace the text wordmark in `src/components/Logo.tsx`.
- Real photos for services, leadership and the respite residence.
