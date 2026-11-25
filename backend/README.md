# Chase Care Services — Backend

The backend is a [Supabase](https://supabase.com) project:

| Part | What it does here |
|---|---|
| **PostgreSQL** | All data: website content, roles, enquiries, academy, shop (and later clients, workers, bookings…) |
| **Row Level Security** | Every table decides who can read or change each row — visitors, staff role, or the record's owner |
| **Auth** | Staff sign-in, two-factor (TOTP) and, from Phase 4, client and worker accounts |
| **Storage** | `public-media` (website images) and `private-documents` (worker documents, Phase 2) |
| **Data API** | The website and admin dashboard read and write through the Supabase client using the publishable key |

Specs: [`../doc/BACKEND_SPECIFICATION.md`](../doc/BACKEND_SPECIFICATION.md), [`../doc/ADMIN_DASHBOARD_SPECIFICATION.md`](../doc/ADMIN_DASHBOARD_SPECIFICATION.md).

## Folder layout

```text
backend/
├── supabase/
│   ├── config.jsonc        Local Supabase settings (auth rules, ports, two-factor)
│   ├── migrations/         Database schema, in order — the source of truth
│   ├── seed.sql            LOCAL ONLY demo data and accounts
│   └── tests/database/     pgTAP tests for permissions and rules
├── types/database.ts       TypeScript types generated from the schema (for the frontend)
├── .env.example
└── package.json            npm scripts below
```

## Run it locally

Needs Node.js 20+ and Docker.

```bash
npm install
```

```bash
npm start
```

`npm start` downloads and starts Supabase (first run takes a few minutes) and prints the local URLs and keys. Then:

- Studio (database admin UI): <http://127.0.0.1:54323>
- API: <http://127.0.0.1:54321>
- Test inbox for emails: <http://127.0.0.1:54324>

Demo accounts created by `seed.sql` (password `ChaseCare2026!`):

| Email | Role |
|---|---|
| `owner@chasecare.local` | Super Admin (Owner) |
| `editor@chasecare.local` | Content Editor |
| `ops@chasecare.local` | Operations / Care Manager |
| `training@chasecare.local` | Training Coordinator |

Locally the two-factor rule for staff is switched off by the seed so you can sign in with just a password.

## npm scripts

| Script | What it does |
|---|---|
| `npm start` / `npm stop` | Start / stop the whole local Supabase stack |
| `npm run db:start` | Start only the database (enough for tests) |
| `npm run db:reset` | Rebuild the local database from migrations + seed |
| `npm run db:new -- <name>` | Create a new migration file |
| `npm test` | Run the database tests |
| `npm run lint` | Check SQL functions for errors |
| `npm run types` | Regenerate `types/database.ts` after a schema change |

## What's in the database (Phase 1)

| Area | Tables / functions |
|---|---|
| Users & security | `profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_log`; `has_permission()`, `is_staff()`, `my_permissions()` |
| Website content | `site_settings`, `pages` (+ `page_revisions`), `navigation_items`, `services`, `team_members`, `partners`, `testimonials`, `announcements`, `media_assets`, `notification_recipients` |
| Blog | `post_categories`, `posts` |
| Academy (catalogue) | `courses` |
| Shop (catalogue) | `product_categories`, `products` |
| Forms inbox | `enquiries`, `enquiry_notes`; `submit_enquiry()` for all public forms |
| Files | Storage buckets `public-media`, `private-documents` |

Initial content from the client proposal (services, blog categories, course list, products, pages, menus) is loaded by migration `…0600_initial_content.sql`. Courses, products and pages start as **drafts** until the owner fills in details.

### Rules enforced by the database

- Visitors only ever see **published** content; scheduled blog posts appear on their publish date.
- Staff permissions follow their role (`<section>.<action>`, e.g. `content.edit`). The owner can create custom roles.
- **Two-factor sign-in is required for staff** on the live project (`private.security_settings.require_staff_mfa`).
- Only a Super Admin can grant Super Admin, and the last active Super Admin cannot be removed.
- Deactivated accounts lose all permissions immediately.
- A testimonial cannot be published without recorded consent; a partner cannot be shown without permission; a course cannot be labelled externally accredited without the accrediting body and reference.
- Every change to managed tables is written to `audit_log` with who made it.
- Editing a page keeps the previous version in `page_revisions`.
- Public forms go through `submit_enquiry()`: consent required, email or phone required, hidden bot trap, max 5 submissions per email per hour. Visitors cannot read the inbox.

## Go live (Supabase cloud)

1. Create a project at <https://supabase.com/dashboard> (pick the region closest to Ghana, e.g. London `eu-west-2` or Frankfurt `eu-central-1`, and confirm it meets the client's data-protection requirements).
2. Link and push the schema (this does **not** run `seed.sql`):

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

3. In the dashboard: Authentication → turn off public sign-ups for now, enable TOTP two-factor, set the Site URL, and configure a real SMTP sender.
4. Invite the owner (Authentication → Users → Invite), then in the SQL editor:

   ```sql
   select private.grant_role_by_email('owner@their-domain.com', 'super_admin');
   ```

5. The owner signs in, sets up two-factor, and can then invite and assign roles to other staff.

## Next backend steps

- Edge Function to invite staff from the admin dashboard (needs the secret key, so it can't run in the browser).
- Email notifications for new enquiries (to `notification_recipients`).
- Phase 2 tables: clients, workers and the recruitment pipeline, documents.
