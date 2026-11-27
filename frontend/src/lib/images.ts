/**
 * Every photo slot on the website, in one place.
 *
 * To add a photo: put the file in `public/images/` (JPG or WebP, at least 1600px wide for
 * banners and slides) and set `src` to its path, e.g. "/images/hero-elderly-care.jpg".
 * While `src` is null the site shows a branded placeholder instead, so nothing looks broken.
 *
 * Only use photos you have the rights to, and photos of clients only with their consent.
 */

export type SiteImage = {
  src: string | null;
  /** Describes the photo for people using screen readers. */
  alt: string;
  /** Which part of the photo to keep in view when it is cropped (CSS object-position). */
  focus?: string;
};

/** A short, silent, looping background video. Files live in `public/videos/` or the media library. */
export type SiteVideo = {
  /** MP4 (H.264) — plays everywhere. */
  src: string;
  /** Optional smaller WebM version, tried first by browsers that support it. */
  webm?: string | null;
  /** Still image shown while loading, and instead of the video when motion is turned off. */
  poster?: string | null;
};

export type HeroSlide = {
  image: SiteImage;
  /** When set, the video plays behind the text instead of the photo. */
  video?: SiteVideo | null;
  eyebrow?: string;
  heading: string;
  text: string;
  buttons: { label: string; href: string }[];
};

/** Homepage slider. The owner can replace these from the admin dashboard (Home page → hero). */
export const HERO_SLIDES: HeroSlide[] = [
  {
    image: { src: "/videos/chase-hero-poster.jpg", alt: "A smiling nurse caring for an older woman, with the CHASE logo", focus: "80% 50%" },
    video: { src: "/videos/chase-hero.mp4", webm: "/videos/chase-hero.webm", poster: "/videos/chase-hero-poster.jpg" },
    eyebrow: "Training compassion. Delivering excellence.",
    heading: "Better Care. Better Lives.",
    text: "Trained, compassionate and trusted caregivers for families in Ghana and across the diaspora — in the comfort of home.",
    buttons: [
      { label: "Request Care", href: "/register/client" },
      { label: "Get on our caregiver register", href: "/join-our-team" },
    ],
  },
  {
    image: { src: "/images/hero/slide-2-home-care.jpg", alt: "A caregiver in blue scrubs helping an older woman walk with a frame at home", focus: "55% 30%" },
    eyebrow: "Chase Care Services · Ghana",
    heading: "Quality Care. Compassionate Support. Empowered Lives.",
    text: "Professional, person-centred care and support for individuals and families in Ghana and across the diaspora.",
    buttons: [
      { label: "Find a Care Service", href: "/care-services" },
      { label: "Join Our Team", href: "/join-our-team" },
    ],
  },
  {
    image: { src: "/images/hero/slide-3-diaspora.jpg", alt: "A caregiver and an older woman laughing together on a video call", focus: "45% 30%" },
    eyebrow: "Care from anywhere in the world",
    heading: "Your loved one is in Ghana. We're right there with them.",
    text: "Trusted care, welfare visits and regular updates for families living abroad.",
    buttons: [{ label: "Arrange Care in Ghana", href: "/diaspora" }],
  },
  {
    image: { src: null, alt: "Caregivers in training at the ChaseCare Academy" },
    eyebrow: "ChaseCare Academy",
    heading: "Build your career in care.",
    text: "Competency-based training, CPD and a structured route into care for young people.",
    buttons: [
      { label: "Explore Our Training", href: "/academy" },
      { label: "Start Your Care Career", href: "/academy#student-programme" },
    ],
  },
  {
    image: { src: null, alt: "A young person enjoying a supported activity during a respite stay" },
    eyebrow: "Respite & Accommodation",
    heading: "Time to rest, knowing your loved one is cared for.",
    text: "Planned respite and safe, supportive short stays for young people and adults with additional needs.",
    buttons: [{ label: "Explore Respite", href: "/respite" }],
  },
];

/** Background photos behind the purple banner at the top of each page. */
export const PAGE_BANNERS: Record<string, SiteImage> = {
  "care-services": { src: null, alt: "" },
  diaspora: { src: null, alt: "" },
  respite: { src: null, alt: "" },
  academy: { src: null, alt: "" },
  about: { src: null, alt: "" },
  journal: { src: null, alt: "" },
  shop: { src: null, alt: "" },
  contact: { src: null, alt: "" },
  "register/client": { src: null, alt: "" },
  "join-our-team": { src: null, alt: "" },
  wellbeing: { src: null, alt: "" },
  community: { src: null, alt: "" },
  "community/monthly-forum": { src: null, alt: "" },
  "schools-and-hospitals": { src: null, alt: "" },
  "parent-and-family-learning": { src: null, alt: "" },
  "academy/workforce-standards": { src: null, alt: "" },
};

/**
 * "Who We Are" banner on the About page: portraits shown side by side.
 * Square crops (800×800) framing head and shoulders, in public/images/team/.
 * Replace the alt text with each person's name and role once confirmed.
 */
export const ABOUT_TEAM_STRIP: SiteImage[] = [
  { src: "/images/team/team-1.jpg", alt: "A member of the Chase Care Services team", focus: "center 45%" },
  { src: "/images/team/team-2.jpg", alt: "A member of the Chase Care Services team", focus: "center 0%" },
  { src: "/images/team/team-3.jpg", alt: "A member of the Chase Care Services team", focus: "center 30%" },
  { src: "/images/team/team-4.jpg", alt: "A member of the Chase Care Services team", focus: "center 25%" },
];

/** Photos beside the text sections on the homepage. */
export const SECTION_IMAGES = {
  whoWeAre: {
    src: "/brand/chase-care-hero.jpg",
    alt: "A Chase Care Services caregiver checking on an elderly client",
  },
  diaspora: { src: "/images/home/home-diaspora.jpg", alt: "A smiling caregiver hugging an older woman on the sofa" },
  academy: { src: null, alt: "Trainees practising care skills" },
  wellbeing: { src: null, alt: "Care workers at a wellbeing session" },
  community: { src: "/images/home/home-community.jpg", alt: "Older and younger people talking together around a table at a community meeting" },
} satisfies Record<string, SiteImage>;

/**
 * Built-in course photos, by course slug. A photo uploaded for the course in the
 * dashboard (Courses → Photo) takes priority over these.
 */
export const COURSE_IMAGES: Record<string, SiteImage> = {
  "dementia-care": {
    src: "/images/courses/dementia-care.jpg",
    alt: "A smiling caregiver holding hands with two older women in a bright living room",
    focus: "60% 15%",
  },
};

/**
 * Built-in service photos, by service slug: `gallery` fades behind the service page's
 * banner, `card` is the preview on service cards. A photo uploaded for the service in
 * the dashboard (Services → Photo) takes priority over these.
 */
/** Photos shared by the Disability Support and Autism Support pages. */
const SUPPORT_PHOTOS = {
  wheelchair: { src: "/images/services/disability-support-3.jpg", alt: "A smiling support worker beside a young girl in a wheelchair, joining in a class activity" },
  sensory: { src: "/images/services/disability-support-1.jpg", alt: "A support worker sharing a sensory activity with a young girl in a classroom" },
  highFive: { src: "/images/services/disability-support-2.jpg", alt: "A support worker and a delighted young girl giving each other a high five" },
};

export const SERVICE_PHOTOS: Record<string, { card: SiteImage; gallery: SiteImage[] }> = {
  "autism-support": {
    card: { ...SUPPORT_PHOTOS.highFive, focus: "50% 30%" },
    gallery: [
      { ...SUPPORT_PHOTOS.sensory, focus: "55% 30%" },
      { ...SUPPORT_PHOTOS.highFive, focus: "50% 35%" },
      { ...SUPPORT_PHOTOS.wheelchair, focus: "60% 35%" },
    ],
  },
  "disability-support": {
    card: {
      src: "/images/services/disability-support-3.jpg",
      alt: "A smiling support worker beside a young girl in a wheelchair, joining in a class activity",
      focus: "65% 35%",
    },
    gallery: [
      { src: "/images/services/disability-support-3.jpg", alt: "A smiling support worker beside a young girl in a wheelchair, joining in a class activity", focus: "60% 35%" },
      { src: "/images/services/disability-support-1.jpg", alt: "A support worker sharing a sensory activity with a young girl in a classroom", focus: "55% 30%" },
      { src: "/images/services/disability-support-2.jpg", alt: "A support worker and a delighted young girl giving each other a high five", focus: "50% 35%" },
    ],
  },
};
