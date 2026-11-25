# Care Worker Portal & Care Reports — Design Notes

Care workers send a report after every visit from their phone (`/portal`). The office reads
the reports, replies and acts on concerns in the staff dashboard (`/admin/care-reports`).

This note maps each design decision to the HCI principles taught in IT-421
(Norman, Shneiderman's 8 Golden Rules, Nielsen's 10 heuristics, WCAG 2.2 and the
"Designing for Ghana" guidance), so the reasoning can be checked and taught.

## Who uses it

| User | Context | What they need |
|---|---|---|
| **Care worker** (e.g. Ama, 28) | Mid-range Android phone, mobile data, often standing, sometimes interrupted, after a tiring shift | Send an accurate report in about two minutes; know it arrived; hear back from the office |
| **Office / care manager** | Laptop at the office, many reports a day | See urgent problems first, read quickly, reply, keep a record |

## The flow

**Care worker:** Sign in → *Today* (their clients only) → **Write today's report** → 1 The visit →
2 How they were → 3 Notes & concerns → 4 Check and send → **Report sent** (reference CR-000123)
→ later sees **✓✓ Read by the office** and the office's note.

**Office:** Dashboard badge "Care reports 3" → inbox sorted urgent first → open report →
optional note → **Mark as read**.

## Principles applied

### Norman
| Principle | Where |
|---|---|
| **Visibility / discoverability** | The three things a worker does (Today, New report, My reports) are always visible in the bottom tab bar. "Call office" is always in the header. |
| **Feedback** | "✓ Saved on this phone at 10:42" while typing; "Sending your report…"; a full green "Report sent" screen with the client's name, time and reference number. |
| **Affordances & signifiers** | Choices are large bordered cards with a radio/tick marker; buttons look like buttons (filled for the main action, outlined for Back). |
| **Mapping** | Steps run top-to-bottom in the order a visit happens; the progress bar fills left to right. |
| **Constraints** | Date picker can't go past today; "Finished" can't be before "Started"; nobody can edit a report after the office has read it, and nobody can delete one. |
| **Conceptual model** | A report is like a paper visit sheet handed to the office: *Sent* → *Read by the office*. Same words in the portal and the dashboard. |

### Shneiderman's 8 Golden Rules
1. **Consistency** — the same labels, badges ("‼ Urgent", "✓ Sent", "✓✓ Read by the office") and mood words in both the portal and the dashboard (one shared source: `src/lib/care.ts`).
2. **Universal usability** — works for first-time and experienced workers; large text (17px base), large targets, keyboard and screen-reader support.
3. **Informative feedback** — see Norman: feedback above.
4. **Dialogs with closure** — 3 short steps plus a review, ending on a clear "Report sent" screen with "Back to today" / "Write another report".
5. **Error prevention** — choices instead of typing; defaults (today's date, the chosen client); "Set Finished to now"; an urgent concern must be explained; the database enforces the same rules.
6. **Easy reversal** — "Back" on every step; "Change" links on the review screen; "Correct this report" until the office reads it; an unfinished report can be continued or started again.
7. **User in control** — nothing is sent until the worker presses **Send report**; "Not now" leaves without losing work (the draft is kept).
8. **Reduce memory load** — the worker never types a client name or remembers codes; their clients and care notes are shown; the review screen shows everything at once.

### Nielsen's 10 heuristics
| # | Heuristic | Where |
|---|---|---|
| 1 | Visibility of system status | "Step 2 of 4" + progress bar; autosave status; Sent / Read status on every report; unread badge in the office sidebar. |
| 2 | Match with the real world | Plain words: "How did they seem today?", "Ate some", "Keep an eye on it", "Auntie Akosua" (preferred names). |
| 3 | User control and freedom | Back, Change, Correct this report, Continue it / Start again. |
| 4 | Consistency and standards | Native date/time pickers, `tel:` links, a standard mobile bottom tab bar. |
| 5 | Error prevention | See Golden Rule 5. |
| 6 | Recognition rather than recall | Pick from lists with icons + words; care notes one tap away. |
| 7 | Flexibility and efficiency | Optional sections can be skipped; "Write today's report for…" goes straight to the right client; the office can filter by client and urgency. |
| 8 | Aesthetic and minimalist design | One question group per screen; no decoration; only the fields that matter. |
| 9 | Help users recover from errors | Messages say what is wrong *and how to fix it* ("The finish time must be after the start time."), the form jumps to the first problem and focuses it; a failed send keeps everything typed. |
| 10 | Help and documentation | Short hints under questions; "Emergency? Call 112 first"; "Call office" always available. |

### Cognitive load (Week 1)
- One task per screen and 4–5 options per question.
- Chunking into three named steps.
- Icons always paired with words (never icon-only, never colour-only).

### WCAG 2.2 AA (Week 6)
- **Perceivable:** text contrast ≥ 4.5:1 (the orange used for small text was darkened site-wide to pass); urgency shown with text and symbols, not colour alone.
- **Operable:** every control works by keyboard; visible focus rings; touch targets 48–56px (WCAG minimum is 24px); no time limits.
- **Understandable:** visible labels linked to fields; errors identified in text and linked with `aria-describedby`; consistent navigation; the worker never re-enters information already given (WCAG 2.2 *Redundant Entry*).
- **Robust:** real `<fieldset>`/`<legend>`, radio buttons and checkboxes; status messages announced with `aria-live`; focus moves to each step's heading.
- Checked with axe (WCAG 2.2 AA rules): no violations on the portal screens or the office screens.

### Designing for Ghana (Week 7)
- **Mobile first** — designed for a phone, then widened for the office's laptop.
- **Thumb zone** — Continue / Send and the tab bar are at the bottom of the screen.
- **Interruptions** — answers are saved on the phone as they are typed; the next visit to "New report" offers to continue.
- **Low bandwidth** — no images or video in the portal; small pages (about 106 kB).
- **Trust & error prevention** (like mobile money) — a review screen before sending, and a confirmation with a reference number after.
- **Shared phones** — "Sign out" is always in the header.

## Privacy and safety (Data Protection Act, 2012 — Act 843)
- Care workers only see the clients assigned to them, and only their own reports (enforced by the database, tested in `backend/supabase/tests/database/07_care_reports.test.sql`).
- Reports cannot be deleted, and every change is recorded in the Activity log.
- Other staff (e.g. the content editor) cannot see clients or reports.
- Urgent concerns tell the worker to call the office, or 112 if anyone is in danger — the report is never the only alarm.

## Next steps (from user testing)
Test with 3–5 real care workers on their own phones (formative evaluation, Week 5): time to send a report, errors made, and how they rate it. Ideas to try next: email/SMS to the office for urgent reports, Twi labels, and an offline queue for sending when the network returns.
