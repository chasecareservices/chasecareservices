import type { Database } from "@/lib/database.types";

export type EnquiryType = Database["public"]["Enums"]["enquiry_type"];

/** Topics on the contact form. Each maps to an enquiry type in the admin inbox. */
export const CONTACT_TOPICS: { value: EnquiryType; label: string }[] = [
  { value: "contact", label: "General enquiry" },
  { value: "care_request", label: "I need care (for myself or a loved one)" },
  { value: "worker_application", label: "I want to work with ChaseCare" },
  { value: "course_registration", label: "Training / course registration" },
  { value: "student_programme", label: "Student / young caregiver programme" },
  { value: "parent_training", label: "Parent & family training" },
  { value: "respite", label: "Respite or accommodation" },
  { value: "partnership", label: "Partnership (school, hospital, organisation)" },
  { value: "forum_registration", label: "Monthly Community Forum registration" },
];

export function isEnquiryType(value: unknown): value is EnquiryType {
  return CONTACT_TOPICS.some((t) => t.value === value);
}
