import type { LegalDocument } from "./types";

export const acceptableUsePolicy: LegalDocument = {
  slug: "acceptable-use-policy",
  title: "Acceptable Use Policy",
  summary: "What you may and may not do when using the Chase Care Services website.",
  version: "1.0",
  lastUpdated: "25 November 2026",
  sections: [
    {
      id: "about",
      heading: "About this policy",
      blocks: [
        "This policy forms part of our Website Terms of Use and applies to everyone who uses the Chase Care Services website, including our forms, portals and any interactive features. By using the website you agree to follow it.",
      ],
    },
    {
      id: "allowed",
      heading: "Using our website",
      blocks: ["You may use our website only for lawful purposes and in a way that respects the people we support, their families and our staff."],
    },
    {
      id: "not-allowed",
      heading: "What you must not do",
      blocks: [
        "You must not use our website:",
        {
          list: [
            "in any way that breaks the law in Ghana or in any other country, or that is fraudulent;",
            "to harm, or try to harm, children or vulnerable adults in any way;",
            "to submit false or misleading information, or to pretend to be someone else;",
            "to share another person's personal information without their permission or the authority to do so;",
            "to send abusive, threatening, discriminatory or offensive material to anyone, including our staff;",
            "to send unsolicited advertising or promotional material (spam);",
            "to upload anything containing viruses or other harmful software;",
            "to access, or try to access, parts of the website, our systems or our data that you are not authorised to use, including other people's accounts;",
            "to interfere with, damage or disrupt the website, the systems it runs on, or the software it uses;",
            "to copy, collect or extract content from the website in bulk by automated means, except search engines indexing public pages.",
          ],
        },
      ],
    },
    {
      id: "accounts",
      heading: "Accounts and portals",
      blocks: [
        "If we give you an account, for example to a staff, worker or client portal, keep your sign-in details private and use only the information you are authorised to see, for the purpose it was shared. Tell us straight away if you think someone else has used your account.",
      ],
    },
    {
      id: "interactive",
      heading: "Interactive features",
      blocks: [
        "Where we offer interactive features such as online forums or webinars, we will explain how they work and whether and how they are moderated. Children may use them only with the permission and supervision of a parent or guardian. Please follow any rules shown for the feature and report anything that worries you.",
      ],
    },
    {
      id: "safeguarding",
      heading: "If you are worried about someone",
      blocks: [
        "If you see anything on or through our website that makes you worried about the safety of a child or vulnerable adult, please tell us straight away using our Contact page. If someone is in immediate danger, call the emergency services on 112.",
      ],
    },
    {
      id: "breaches",
      heading: "What happens if this policy is broken",
      blocks: [
        "We decide whether this policy has been broken. If it has, we may take any action we consider reasonable, including:",
        {
          list: [
            "withdrawing your right to use the website, temporarily or permanently;",
            "removing anything you have submitted;",
            "giving you a warning;",
            "closing or suspending your account;",
            "reporting the matter to the police or other authorities;",
            "taking legal action, including to recover our reasonable costs.",
          ],
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: ["We may update this policy from time to time by changing this page. Please check it regularly. The version on this page when you use the website applies."],
    },
  ],
};
