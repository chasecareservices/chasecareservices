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
  { title: "Professionally trained caregivers", text: "No placement without appropriate preparation: every caregiver completes training first." },
  { title: "Screened, vetted & trusted", text: "Interviews, reference and background checks and a competency assessment before approval." },
  { title: "Person-centred care that matters", text: "Support tailored to each person's needs, preferences, culture and circumstances." },
  { title: "Ongoing support & supervision", text: "Regular review, supervision and wellbeing support for the people who provide care." },
  { title: "Quality care. Peace of mind.", text: "Clear care plans, documentation and communication, so families always know where things stand." },
];

/** The letters of CHASE, as used on the logo. */
export const CHASE_MEANING = ["Care", "Help", "Assist", "Support", "Empower"];

export const TRAINING_TAGLINE = "Training compassion. Delivering excellence.";

export const CARE_PROCESS = ["Initial assessment", "Individual care plan", "Risk assessment", "Care records", "Regular review"];

export const OFFICE_LOCATIONS = ["Weija, Accra", "Spintex Road", "McCarthy Hill"];

/** Countries where families abroad most often ask us to care for loved ones "back home" (from the flyer). */
export const HOME_COUNTRIES = ["Ghana", "Nigeria", "Dubai (UAE)"];

/** Extra numbers from the client's letter, shown on the Contact page alongside the main phone and WhatsApp. */
export const OTHER_CONTACTS: { label: string; value: string; href: string }[] = [
  { label: "Also call", value: "+233 59 499 9582", href: "tel:+233594999582" },
  { label: "WhatsApp (UK)", value: "+44 7999 185420", href: "https://wa.me/447999185420" },
];

/** "What we do" highlight box (About page). */
export const WHAT_WE_DO: { lead: string; href: string; text: string }[] = [
  {
    lead: "Care services",
    href: "/care-services",
    text: "for older people, people living with disability or autism, and families — at home, in the community and overnight.",
  },
  {
    lead: "Care from anywhere in the world",
    href: "/diaspora",
    text: "for Ghanaian families abroad, with welfare visits, hospital support and care coordination, and regular updates.",
  },
  {
    lead: "Respite and short stays",
    href: "/respite",
    text: "giving parents and carers time to rest, with safe, structured stays for young people and adults with additional needs.",
  },
  {
    lead: "ChaseCare Academy",
    href: "/academy",
    text: "competency-based training, CPD and our signature Care Beyond Care course, plus a route into care for young people.",
  },
  {
    lead: "The Wellbeing Hub",
    href: "/wellbeing",
    text: "counselling, health and laboratory referrals and support for the people who provide care.",
  },
  {
    lead: "Community and partnerships",
    href: "/community",
    text: "the Monthly Community Forum, outreach and inclusion programmes, and work with schools and hospitals.",
  },
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
  "about/how-we-care": {
    eyebrow: "About Us",
    title: "How We Care",
    intro:
      "CHASE Care Services is a professional care organisation dedicated to providing compassionate, reliable and person-centred care to individuals and families — including professional care in the comfort and familiarity of their own home.",
    sections: [
      {
        heading: "What CHASE stands for",
        text: "Our name is our promise: Care, Help, Assist, Support and Empower. Our mission is to ensure that every patient, child and client receives appropriate, respectful and dependable support.",
        items: CHASE_MEANING,
      },
      {
        heading: "Our core services",
        items: [
          "Professional patient home care — including support after a stroke (CVA) and for complex care needs",
          "Special needs and disability support — for children and adults with autism, developmental conditions and other disabilities",
          "Special needs support for schools and families — after school, at weekends and in the holidays",
          "Nanny and childcare — daily routines, supervision, personal care and well-being",
          "Companionship and personal support — company, encouragement and help with everyday activities",
        ],
      },
      {
        heading: "Our approach to care",
        text: "Quality care goes beyond meeting basic needs. We take a person-centred approach that recognises each client's individual circumstances, preferences and goals. Where appropriate, every package of care follows the same safe, coordinated and accountable process:",
        pathway: CARE_PROCESS,
      },
      {
        heading: "Where we are",
        text: "Our offices are in the following areas. Please contact us to confirm availability and arrangements for your location.",
        items: OFFICE_LOCATIONS,
      },
      {
        heading: "More than care",
        text: "At CHASE Care Services, we do not simply provide care: we build trust, preserve dignity and empower lives.",
      },
    ],
    ctas: [
      { label: "Request Care", href: "/register/client" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  "join-our-team": {
    eyebrow: "Careers",
    title: "Build Your Career in Care",
    intro:
      "We are looking for caregivers, nurses, healthcare professionals, therapists, nannies, housekeepers and support workers who want to make a real difference — and who want to be trained, supported and valued while they do it.",
    sections: [
      {
        heading: "Trained to care. Ready to serve.",
        text: "We train caregivers to meet the highest standards of care, compassion and professionalism. Get on our register as a caregiver and join our network of trained and trusted caregivers — we match you with families who value quality care.",
      },
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
      { label: "Apply now", href: "/register/worker" },
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
    title: "Specialist Care & School Support Partnerships",
    intro:
      "Supporting young people with special educational needs, learning disabilities, autism and additional care needs to live, learn and participate with dignity, confidence and greater independence.",
    sections: [
      {
        heading: "Our partnership vision",
        text: "We partner with special schools and other educational settings so families can access appropriately trained professional carers who complement the work of the school. Where a parent needs additional one-to-one or ongoing support, one of our carers provides continuity around the young person's needs — at school where agreed, and after school, at home and in the community. This continuity reduces disruption and gives parents confidence that their child's needs are understood across every part of the day.",
      },
      {
        heading: "Our care & support services",
        items: [
          "Full-time live-in care and support",
          "Full-time live-out care and support",
          "After-school support and one-to-one assistance",
          "Weekend support where required",
          "School-based support, subject to school agreement and safeguarding requirements",
          "Support with daily living, personal care and routines",
          "Community participation, activities and social development",
          "Support with transitions between school, home and community",
          "Consistent implementation of the young person's care and support plan",
        ],
      },
      {
        heading: "Our carers",
        text: "Our carers come from healthcare backgrounds, including qualified nurses and healthcare assistants, and receive additional training in special educational needs. They work within our safeguarding, professional conduct and person-centred care framework: building respectful relationships, communicating appropriately, promoting independence, noticing changes in well-being and escalating concerns through agreed pathways.",
      },
      {
        heading: "Person-centred planning",
        text: "Every placement starts with an individual assessment of the young person's needs, preferences, strengths, routines and goals. We develop a support plan and care plan with the parent or guardian and, where appropriate, the school and other professionals — covering communication, personal care, routines, emotional well-being, learning support, social participation, independence, health needs, risk management and agreed outcomes. Plans are reviewed as needs change.",
      },
      {
        heading: "Safeguarding at the core",
        text: "Every young person is treated with dignity, respect and appropriate professional boundaries. Our approach includes clear reporting and escalation procedures, risk awareness, confidentiality, safe working practices and prompt action when a concern is identified. Any school-based support follows the school's own safeguarding procedures and policies.",
      },
      {
        heading: "Benefits to the school",
        items: [
          "A trusted support option schools can signpost to parents",
          "Carers with healthcare experience and SEN-focused training",
          "Greater continuity between school and home",
          "A structured approach to care, support planning and safeguarding",
          "A collaborative channel with parents and professionals",
          "Less pressure on families who need consistent one-to-one support",
          "A flexible service adapted to each young person and family",
        ],
      },
      {
        heading: "Flexible arrangements and fees",
        text: "We can provide short-term or weekend support, but our preferred arrangements are full-time live-in or live-out care, which give consistency, strong professional relationships and predictable routines. Fees are adaptable and competitive, depending on the type, duration and intensity of support. A formal contract setting out the service, responsibilities, working pattern, fees and safeguarding expectations is agreed before care begins.",
      },
      {
        heading: "Monthly Care & Support Forum",
        text: "Our monthly online forum brings together parents, schools, care and medical professionals to share experiences, raise concerns and improve support — with consent and confidentiality respected. Our philosophy is simple: professionals should listen to learn.",
      },
      {
        heading: "Why we started",
        text: "Families supporting children and young people with special needs in Ghana often struggle to find consistent, appropriately trained and professionally minded caregivers. Our partnership model is a practical bridge to close that gap, and part of a wider ambition: for professional caregiving to be recognised as an essential part of inclusive education, family well-being and community support. No family should have to navigate these challenges alone.",
      },
      {
        heading: "How a partnership starts",
        pathway: [
          "Introductory meeting",
          "Safeguarding & partnership requirements",
          "Our standards & training",
          "Referral pathway agreed",
          "Parent consultation & assessment",
          "Individual care plan",
          "Contract, checks & care begins",
        ],
      },
      {
        heading: "Working with hospitals",
        items: [
          "Discharge support",
          "Home-care arrangements",
          "Post-hospital support, including after a stroke",
          "Family support",
          "Caregiver placement",
          "Community follow-up",
        ],
      },
    ],
    ctas: [
      { label: "Partner With ChaseCare", href: "/contact?topic=partnership" },
      { label: "Request support for a young person", href: "/register/client?service=school-support" },
    ],
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
      { label: "Upcoming community events", href: "/community/events" },
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
    ctas: [{ label: "Register for the next forum", href: "/community/monthly-forum" }],
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
