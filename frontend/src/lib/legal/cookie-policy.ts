import type { LegalDocument } from "./types";

/**
 * Keep this in step with what the website actually stores. If analytics or advertising
 * tools are ever added, they need a consent banner and an update here first.
 */
export const cookiePolicy: LegalDocument = {
  slug: "cookie-policy",
  title: "Cookie Policy",
  summary: "The cookies and similar technologies the Chase Care Services website uses, and how to control them.",
  version: "1.0",
  lastUpdated: "25 November 2026",
  sections: [
    {
      id: "what",
      heading: "What cookies are",
      blocks: [
        "Cookies are small text files that a website saves on your device so it can remember information, such as your preferences. Similar technologies, such as your browser's local storage, do the same job. In this policy, \"cookies\" covers both.",
      ],
    },
    {
      id: "our-approach",
      heading: "Our approach",
      blocks: [
        "We keep cookies to a minimum. Our website does not use advertising cookies, and we do not use cookies to track you across other websites. We do not currently use analytics cookies. If we ever want to, we will ask for your permission first and update this policy.",
      ],
    },
    {
      id: "list",
      heading: "Cookies we use",
      blocks: [
        {
          list: [
            "Language choice (googtrans): set only if you choose a language other than English in the \"Choose language\" menu. It remembers your choice for up to 12 months so pages stay in your language. Choosing English again deletes it.",
            "Google Translate cookies: when you choose another language, Google's translation service may set its own cookies. These are controlled by Google, and Google's privacy and cookie policies apply.",
            "Signing in (staff and portal users only): when you sign in to a Chase Care account, your browser stores a secure sign-in token so you stay signed in. It is removed when you sign out. These are strictly necessary for signed-in areas to work.",
          ],
        },
        "Visitors who use the website in English and do not sign in do not receive any cookies from us.",
      ],
    },
    {
      id: "types",
      heading: "Types of cookies",
      blocks: [
        {
          list: [
            "Strictly necessary: needed for features you ask for, such as signing in. The site cannot work properly without them.",
            "Functional: remember choices you make, such as your language.",
            "Session cookies are deleted when you close your browser. Persistent cookies stay for a set time, as listed above.",
          ],
        },
      ],
    },
    {
      id: "control",
      heading: "How to control cookies",
      blocks: [
        "You can choose English in the \"Choose language\" menu at any time to remove the language cookie.",
        "You can also view, block or delete cookies in your browser's settings. If you block strictly necessary cookies, signed-in areas will not work. The website www.allaboutcookies.org explains how to manage cookies in different browsers.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: ["We will update this policy if the cookies we use change. The latest version, with the date it was updated, is always on this page."],
    },
  ],
};
