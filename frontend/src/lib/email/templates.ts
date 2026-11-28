/**
 * Automatic emails whose wording the owner can change (Communications → Email templates).
 * The built-in wording below is used for any field left empty. Placeholders such as
 * {first_name} are filled in when the email is sent. No server code: unit tested.
 */

export type Copy = { subject: string; heading: string; message: string };
export type TemplateDef = { key: string; name: string; when: string; placeholders: Record<string, string>; defaults: Copy };

export const TEMPLATES: TemplateDef[] = [
  {
    key: "invite_worker",
    name: "Care worker invitation",
    when: "When the office creates a care worker account.",
    placeholders: { first_name: "Their first name" },
    defaults: {
      subject: "Your Chase Care care worker account",
      heading: "Welcome to Chase Care, {first_name}",
      message:
        "The Chase Care office has set up your care worker account. You'll use it on your phone to see your visits and the care plans of the people you support, and to send a short report after each visit.",
    },
  },
  {
    key: "invite_family",
    name: "Family portal invitation",
    when: "When the office invites a family member to the family portal.",
    placeholders: { first_name: "Their first name", client_name: "The client's name" },
    defaults: {
      subject: "Follow {client_name}'s care with Chase Care",
      heading: "Welcome to Chase Care, {first_name}",
      message:
        "The Chase Care office has invited you to the family portal, where you can see {client_name}'s booked visits, read visit reports and the care plan, and message the office.",
    },
  },
  {
    key: "invite_learner",
    name: "Academy learner invitation",
    when: "When the Academy enrols someone new on an online course.",
    placeholders: { first_name: "Their first name", course: "The course title" },
    defaults: {
      subject: "Your ChaseCare Academy course: {course}",
      heading: "Welcome to the ChaseCare Academy, {first_name}",
      message: "The ChaseCare Academy has enrolled you on {course}. You can study online at your own pace, on your phone or computer, and download your certificate when you finish.",
    },
  },
  {
    key: "course_ready",
    name: "Course ready (existing account)",
    when: "When someone who already has an account is enrolled on a course.",
    placeholders: { first_name: "Their first name", course: "The course title" },
    defaults: {
      subject: "You're enrolled: {course}",
      heading: "Hello {first_name}, your course is ready",
      message: "Sign in with your usual Chase Care email and password.",
    },
  },
  {
    key: "event_confirmation",
    name: "Event registration confirmation",
    when: "When someone registers for the Monthly Forum or another event.",
    placeholders: { first_name: "Their first name", event: "The event title" },
    defaults: { subject: "You're registered: {event}", heading: "You're registered, {first_name}!", message: "" },
  },
  {
    key: "event_reminder",
    name: "Event reminder",
    when: "When the office sends a reminder to everyone registered.",
    placeholders: { first_name: "Their first name", event: "The event title", date: "The event date" },
    defaults: { subject: "Reminder: {event}, {date}", heading: "See you soon, {first_name}", message: "" },
  },
  {
    key: "document_expiring",
    name: "Document expiring soon (to care worker)",
    when: "30 and 7 days before a care worker's document expires.",
    placeholders: { first_name: "Their first name" },
    defaults: {
      subject: "Reminder: please renew your document",
      heading: "Hello {first_name}, a document needs renewing soon",
      message: "Please renew it and send the new details (and a photo or PDF) in your care worker portal, or bring it to the office.",
    },
  },
  {
    key: "document_expired",
    name: "Document expired (to care worker)",
    when: "On the day a care worker's document expires.",
    placeholders: { first_name: "Their first name" },
    defaults: {
      subject: "Action needed: a document has expired",
      heading: "Hello {first_name}, a document has expired",
      message:
        "Please renew it and send the new details (and a photo or PDF) in your care worker portal, or bring it to the office. Until it's renewed you may not be booked for visits.",
    },
  },
  {
    key: "newsletter_confirm",
    name: "Newsletter: please confirm",
    when: "When someone signs up for news by email.",
    placeholders: {},
    defaults: {
      subject: "Please confirm your subscription to Chase Care news",
      heading: "Please confirm your subscription",
      message: "You asked to get new articles and news from Chase Care Services by email. Please confirm it was you:",
    },
  },
];

export const templateDef = (key: string) => TEMPLATES.find((t) => t.key === key);

/** Fills {placeholders}; unknown ones are left as typed so the owner can spot a typo. */
export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/** The wording to send: the owner's version where set, else the built-in one, with placeholders filled. */
export function renderCopy(key: string, override: Partial<Copy> | null | undefined, vars: Record<string, string>): Copy {
  const d = templateDef(key)?.defaults ?? { subject: "", heading: "", message: "" };
  const pick = (f: keyof Copy) => (override?.[f]?.trim() ? override[f]!.trim() : d[f]);
  return { subject: fill(pick("subject"), vars), heading: fill(pick("heading"), vars), message: fill(pick("message"), vars) };
}

/** Placeholders used in a draft that this email doesn't know about. */
export function unknownPlaceholders(key: string, texts: string[]) {
  const known = new Set(Object.keys(templateDef(key)?.placeholders ?? {}));
  const found = texts.flatMap((t) => [...t.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]));
  return [...new Set(found.filter((k) => !known.has(k)))];
}
