/**
 * Built-in copy taken from the client proposal (doc/client-specification/).
 * A page shows this until the owner publishes their own version of the page
 * in the admin dashboard (same slug), which then replaces it.
 */

export type CopySection = {
  heading: string;
  text?: string;
  items?: string[];
  pathway?: string[];
};

export type PageCopy = {
  eyebrow?: string;
  title: string;
  intro: string;
  sections: CopySection[];
  ctas: { label: string; href: string }[];
};

export const MISSION =
  "To provide high-quality, person-centred care and support while developing a competent, compassionate and professionally supported care workforce.";

export const VISION =
  "To make quality care accessible, excellent, sustainable and person-centred for everyone who needs it in Ghana and beyond.";

export const MISSION_POINTS = [
  "Match clients with suitable carers and professionals",
  "Provide competency-based training before workers begin assignments",
  "Support continuous professional development (CPD)",
  "Provide wellbeing and counselling services for the workforce",
  "Connect workers with appropriate health and laboratory services",
  "Support families and parents through education and respite",
  "Promote inclusion for people living with disabilities",
  "Work with schools, hospitals, organisations and community partners",
  "Create opportunities for young people to enter the care profession",
  "Provide reliable care solutions for Ghanaian families locally and in the diaspora",
];

export const VALUES: { name: string; text: string }[] = [
  { name: "Compassion", text: "We care about the person, not simply the condition or task." },
  { name: "Dignity", text: "Every individual deserves respect, privacy and dignity." },
  { name: "Person-Centred Care", text: "Care is tailored to the individual's needs, preferences, culture and circumstances." },
  { name: "Excellence", text: "We continuously improve the quality of our services and training." },
  { name: "Integrity", text: "We operate honestly, responsibly and professionally." },
  { name: "Inclusion", text: "Everyone should have opportunities to participate meaningfully in society." },
  { name: "Safeguarding", text: "The safety and wellbeing of clients, families and workers are fundamental." },
  { name: "Empowerment", text: "We empower clients, families, carers and young people through knowledge, skills and support." },
];

export const WHY_CHOOSE_US: { title: string; text: string }[] = [
  { title: "Person-centred care", text: "Support tailored to each person's needs, preferences, culture and circumstances." },
  { title: "Trained workers", text: "No placement without appropriate preparation: every worker completes training first." },
  { title: "Competency processes", text: "Screening, reference checks and competency assessment before approval." },
  { title: "Wellbeing support", text: "Counselling, health referrals and support for the people who provide care." },
  { title: "Community partnerships", text: "We work with schools, hospitals, organisations and community partners." },
];

export const RECRUITMENT_PATHWAY = ["Register", "Screening", "Training / Competency Assessment", "Approval", "Placement", "Ongoing Support"];

export const STUDENT_PATHWAY = [
  "Register",
  "Introduction to Care",
  "Training",
  "Competency Development",
  "Practical Experience",
  "Certification",
  "Career Opportunities",
];

export const PAGE_COPY: Record<string, PageCopy> = {
  "join-our-team": {
    eyebrow: "Careers",
    title: "Build Your Career in Care",
    intro:
      "We are looking for caregivers, nurses, healthcare professionals, therapists, nannies, housekeepers and support workers who want to make a real difference — and who want to be trained, supported and valued while they do it.",
    sections: [
      { heading: "Our recruitment pathway", pathway: RECRUITMENT_PATHWAY },
      {
        heading: "Who we're looking for",
        items: ["Caregivers", "Nurses", "Therapists", "Healthcare professionals", "Nannies", "Housekeepers", "Support workers"],
      },
      {
        heading: "No placement without appropriate preparation",
        text: "Every worker goes through interview and screening, background and safeguarding checks as applicable, reference checks and a competency assessment before their first placement.",
        items: [
          "Practical care skills",
          "Communication",
          "Professional conduct",
          "Client dignity",
          "Safeguarding",
          "Care documentation",
          "Emergency procedures",
        ],
      },
    ],
    ctas: [
      { label: "Register your interest", href: "/contact?topic=worker_application" },
      { label: "Explore our training", href: "/academy" },
    ],
  },
  wellbeing: {
    eyebrow: "Wellbeing Hub",
    title: "Supporting the people who provide care",
    intro:
      "Caring for others is demanding. The ChaseCare Wellbeing Hub makes sure our caregivers and care professionals are supported too.",
    sections: [
      {
        heading: "What the Wellbeing Hub offers",
        items: [
          "Counselling and emotional wellbeing support",
          "Health services and referrals",
          "Access to partner laboratory services for appropriate tests",
          "Information about worker insurance benefits",
          "Health education",
          "Wellbeing resources",
          "Webinars and support sessions",
        ],
      },
    ],
    ctas: [
      { label: "Join Our Team", href: "/join-our-team" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  "schools-and-hospitals": {
    eyebrow: "Partnerships",
    title: "Working with Schools & Hospitals",
    intro: "We partner with schools and hospitals to support learners, patients and their families.",
    sections: [
      {
        heading: "Working with schools",
        items: [
          "Individual support",
          "Special educational needs",
          "Disability support",
          "Care assistance",
          "Training",
          "Parent support",
          "Specialist referrals",
        ],
      },
      {
        heading: "Working with hospitals",
        items: [
          "Discharge support",
          "Home-care arrangements",
          "Post-hospital support",
          "Family support",
          "Caregiver placement",
          "Community follow-up",
        ],
      },
    ],
    ctas: [{ label: "Partner With ChaseCare", href: "/contact?topic=partnership" }],
  },
  community: {
    eyebrow: "Community",
    title: "Community & Partnerships",
    intro: "Wellbeing, inclusion, education and partnerships — we believe care is stronger when communities are involved.",
    sections: [
      {
        heading: "How we engage",
        items: [
          "Community outreach",
          "Volunteering",
          "Disability inclusion",
          "Awareness programmes",
          "School programmes",
          "Health initiatives",
          "Community events",
          "Corporate and professional partnerships",
        ],
      },
    ],
    ctas: [
      { label: "Monthly Community Forum", href: "/community/monthly-forum" },
      { label: "Partner With ChaseCare", href: "/contact?topic=partnership" },
    ],
  },
  "community/monthly-forum": {
    eyebrow: "Every third Thursday",
    title: "Monthly ChaseCare Community Forum",
    intro: "An open forum held on the third Thursday of every month for families, carers, professionals and anyone interested in care.",
    sections: [
      {
        heading: "Topics we cover",
        items: [
          "Dementia",
          "Autism",
          "Disability",
          "Elderly care",
          "Parenting",
          "Caregiver wellbeing",
          "Mental health",
          "Safeguarding",
          "Inclusive communities",
          "Healthcare",
        ],
      },
    ],
    ctas: [{ label: "Register for the next forum", href: "/contact?topic=forum_registration" }],
  },
  "parent-and-family-learning": {
    eyebrow: "Parent & Family Learning Centre",
    title: "Understanding and supporting your child",
    intro: "Training for parents who want to better understand special educational needs and disability.",
    sections: [
      {
        heading: "Topics",
        items: [
          "Understanding autism",
          "Supporting communication",
          "Behaviour and positive support",
          "Inclusive education",
          "Supporting independence",
          "Home routines",
          "Emotional regulation",
          "Advocacy",
          "Working with schools",
          "Understanding individual needs",
        ],
      },
    ],
    ctas: [{ label: "Explore Parent Training", href: "/contact?topic=parent_training" }],
  },
  "academy/workforce-standards": {
    eyebrow: "ChaseCare Academy",
    title: "Competency Training & Workforce Standards",
    intro: "A key ChaseCare commitment: no placement without appropriate preparation.",
    sections: [
      {
        heading: "Before any placement",
        items: [
          "Interview and screening",
          "Background and safeguarding checks as applicable",
          "Reference checks",
          "Competency assessment",
        ],
      },
      {
        heading: "What we assess",
        items: [
          "Practical care skills",
          "Communication",
          "Professional conduct",
          "Client dignity",
          "Safeguarding",
          "Care documentation",
          "Emergency procedures",
        ],
      },
    ],
    ctas: [
      { label: "Join Our Team", href: "/join-our-team" },
      { label: "View courses", href: "/academy" },
    ],
  },
};
