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
| Wellbeing, Join Our Team, Community, Monthly Forum, Schools & Hospitals, Parent Learning, Workforce Standards, legal pages | `/<slug>` | Published `pages` row with that slug, otherwise built-in copy from the proposal (`src/lib/site-copy.ts`) |

Rules the site follows:

- Only **published** content is shown; drafts return 404. This is enforced by the database, not just the website.
- Course certificates show "Chase certificate", "CPD course" or "Externally accredited". "Accredited" only appears when the database has the accreditation recorded.
- Testimonials only appear once consent is recorded; partner logos only with display permission.
- Both forms send to `submit_enquiry()` and land in the admin enquiries inbox with their type (contact, care request, partnership, course registration…). They require consent, include a hidden bot trap, and work on phones.
- The Monthly Forum date is calculated automatically (third Thursday).
- Pages are cached for 5 minutes, so content edits appear on the live site within 5 minutes.

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
3. Deploy. Then in Supabase → Authentication → URL Configuration, set the **Site URL** to the same address.

## Still to come

- Admin dashboard (`/admin`): staff sign-in with two-factor, content editing, enquiries inbox, settings, users & roles.
- The official logo file (SVG or PNG) to replace the text wordmark in `src/components/Logo.tsx`.
- Real photos for services, leadership and the respite residence.
