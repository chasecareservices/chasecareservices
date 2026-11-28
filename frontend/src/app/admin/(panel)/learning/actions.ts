"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { enrolledAlert } from "@/lib/email/alerts";
import { getEmailCopy } from "@/lib/email/copy";
import { sendEmail } from "@/lib/email/send";
import { sendInvitation } from "@/lib/email/send-invite";
import { createSecretClient } from "@/lib/supabase/server-auth";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;
const back = (id: string, saved: string, hash = "") => redirect(`/admin/learning/${id}?saved=${saved}${hash}`);

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function saveLearningSettings(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.edit");
  const id = String(formData.get("id") ?? "");
  const pass = Number(formData.get("pass_mark") ?? 80);
  const cpdRaw = String(formData.get("cpd_hours") ?? "").trim();
  const cpd = cpdRaw ? Number(cpdRaw) : null;
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!Number.isInteger(pass) || pass < 1 || pass > 100) return { error: "The pass mark must be between 1 and 100." };
  if (cpd !== null && (!Number.isFinite(cpd) || cpd < 0 || cpd > 999)) return { error: "CPD hours must be a number, e.g. 3 or 1.5." };
  const { error } = await staff.supabase
    .from("courses")
    .update({ online_enabled: formData.get("online_enabled") === "on", self_enrol: formData.get("self_enrol") === "on", pass_mark: pass, cpd_hours: cpd })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/", "layout");
  back(id, "settings");
}

export async function saveLesson(formData: FormData): Promise<Result> {
  const course = String(formData.get("course") ?? "");
  const lesson = String(formData.get("lesson") ?? "");
  const staff = await requirePermission(lesson ? "academy.edit" : "academy.create");
  const title = text(formData, "title", 200);
  const video = text(formData, "video_url", 500);
  const resource = text(formData, "resource_url", 500);
  const minutesRaw = String(formData.get("minutes") ?? "").trim();
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  if (!UUID.test(course) || (lesson && !UUID.test(lesson))) return { error: "Something went wrong. Please reload the page." };
  if (!title || title.length < 2) return { error: "Give the lesson a title." };
  if ((video && !/^https:\/\//i.test(video)) || (resource && !/^https:\/\//i.test(resource))) return { error: "Links must start with https://" };
  const minutes = minutesRaw ? Number(minutesRaw) : null;
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) return { error: "Minutes must be a whole number between 1 and 600." };
  const values = {
    title,
    section: text(formData, "section", 120),
    body: text(formData, "body", 30000),
    video_url: video,
    resource_url: resource,
    resource_label: text(formData, "resource_label", 120),
    minutes,
    published: formData.get("published") === "on",
  };
  if (lesson) {
    const { error } = await staff.supabase.from("course_lessons").update({ ...values, ...(sortRaw ? { sort_order: Number(sortRaw) || 0 } : {}) }).eq("id", lesson).eq("course_id", course);
    if (error) return { error: "The lesson couldn't be saved. Please try again." };
  } else {
    const { data: last } = await staff.supabase.from("course_lessons").select("sort_order").eq("course_id", course).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await staff.supabase.from("course_lessons").insert({ ...values, course_id: course, sort_order: sortRaw ? Number(sortRaw) || 0 : (last?.sort_order ?? 0) + 1 });
    if (error) return { error: "The lesson couldn't be saved. Please try again." };
  }
  revalidatePath(`/admin/learning/${course}`);
  back(course, lesson ? "lesson" : "lesson-added", "#lessons");
}

export async function deleteLesson(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.delete");
  const course = String(formData.get("course") ?? "");
  const lesson = String(formData.get("lesson") ?? "");
  if (!UUID.test(course) || !UUID.test(lesson)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await staff.supabase.from("course_lessons").delete().eq("id", lesson).eq("course_id", course);
  if (error) return { error: "The lesson couldn't be deleted." };
  back(course, "lesson-deleted", "#lessons");
}

export async function saveQuestion(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.edit");
  const course = String(formData.get("course") ?? "");
  const qid = String(formData.get("question_id") ?? "");
  const question = text(formData, "question", 1000);
  const raw = [0, 1, 2, 3, 4, 5].map((i) => String(formData.get(`option_${i}`) ?? "").trim().slice(0, 300));
  const correctRaw = Number(formData.get("correct") ?? -1);
  if (!UUID.test(course) || (qid && !UUID.test(qid))) return { error: "Something went wrong. Please reload the page." };
  if (!question || question.length < 5) return { error: "Write the question (at least 5 characters)." };
  // Keep the answers in order without gaps, remembering which one is right.
  const filled = raw.map((o, i) => ({ o, i })).filter((x) => x.o);
  if (filled.length < 2) return { error: "Give at least two answers." };
  const correct = filled.findIndex((x) => x.i === correctRaw);
  if (correct < 0) return { error: "Choose which answer is correct." };
  const values = { question, options: filled.map((x) => x.o), correct_option: correct, explanation: text(formData, "explanation", 1000), sort_order: Number(formData.get("sort_order") ?? 0) || 0 };
  const { error } = qid
    ? await staff.supabase.from("course_quiz_questions").update(values).eq("id", qid).eq("course_id", course)
    : await staff.supabase.from("course_quiz_questions").insert({ ...values, course_id: course });
  if (error) return { error: "The question couldn't be saved. Please try again." };
  back(course, qid ? "question" : "question-added", "#assessment");
}

export async function deleteQuestion(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.edit");
  const course = String(formData.get("course") ?? "");
  const qid = String(formData.get("question_id") ?? "");
  if (!UUID.test(course) || !UUID.test(qid)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await staff.supabase.from("course_quiz_questions").delete().eq("id", qid).eq("course_id", course);
  if (error) return { error: "The question couldn't be deleted." };
  back(course, "question-deleted", "#assessment");
}

/**
 * Enrols someone by email. Existing accounts are enrolled (and given the Learner role if they
 * have no learning role yet) and emailed; new people get a ChaseCare Academy invitation.
 */
export async function enrolLearner(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.create");
  const course = String(formData.get("course") ?? "");
  const fullName = text(formData, "full_name", 120);
  const email = text(formData, "email", 254)?.toLowerCase() ?? "";
  if (!UUID.test(course)) return { error: "Something went wrong. Please reload the page." };
  if (!fullName || fullName.length < 2) return { error: "Enter their full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  const admin = createSecretClient();
  if (!admin) return { error: "Enrolling isn't set up yet: the site's secret key is missing." };
  const { data: c } = await staff.supabase.from("courses").select("id, title, online_enabled").eq("id", course).maybeSingle();
  if (!c) return { error: "Course not found." };
  if (!c.online_enabled) return { error: "Turn on online learning for this course first (Settings above)." };

  const { data: existing } = await admin.rpc("find_user_id_by_email", { lookup: email });
  let userId = typeof existing === "string" ? existing : null;
  let invited = false;
  if (!userId) {
    const invite = await sendInvitation(admin, { email, fullName, kind: "learner", redirectTo: `${await siteOrigin()}/admin/set-password`, clientName: c.title });
    if ("error" in invite) {
      return { error: invite.error === "email-failed" ? "The invitation email couldn't be sent. Check Site settings → Email alerts → Send a test email." : "The invitation couldn't be sent. Please try again." };
    }
    userId = invite.userId;
    invited = true;
  }
  const { data: roles } = await admin.from("user_roles").select("role_key").eq("user_id", userId);
  if (!(roles ?? []).some((r) => ["learner", "worker", "professional"].includes(r.role_key))) {
    const { error } = await admin.from("user_roles").insert({ user_id: userId, role_key: "learner" });
    if (error) return { error: "The Learner role couldn't be added. Please try again." };
  }
  const { data: before } = await admin.from("course_enrolments").select("id, status").eq("course_id", course).eq("user_id", userId).maybeSingle();
  if (before && before.status !== "withdrawn") return { error: "They're already enrolled on this course." };
  const { error } = before
    ? await staff.supabase.from("course_enrolments").update({ status: "enrolled" }).eq("id", before.id)
    : await staff.supabase.from("course_enrolments").insert({ course_id: course, user_id: userId, source: "staff", enrolled_by: staff.user.id });
  if (error) return { error: "Couldn't enrol them. Please try again." };
  if (!invited) {
    const first = fullName.split(/\s+/)[0];
    await sendEmail({ to: [email], ...enrolledAlert({ first_name: first, course_title: c.title }, await siteOrigin(), await getEmailCopy("course_ready")) }).catch(() => undefined);
  }
  revalidatePath(`/admin/learning/${course}`);
  back(course, invited ? "invited" : "enrolled", "#learners");
}

export async function setEnrolmentStatus(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.edit");
  const course = String(formData.get("course") ?? "");
  const enrolment = String(formData.get("enrolment") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(course) || !UUID.test(enrolment) || !["enrolled", "withdrawn"].includes(status)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await staff.supabase.from("course_enrolments").update({ status }).eq("id", enrolment).eq("course_id", course).neq("status", "completed");
  if (error) return { error: "Couldn't save. Please try again." };
  back(course, status === "withdrawn" ? "withdrawn" : "reenrolled", "#learners");
}

/** A certificate for an in-person course (or a learner who completed outside the website). */
export async function issueCertificate(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.create");
  const course = String(formData.get("course_id") ?? "");
  const name = text(formData, "learner_name", 120);
  const date = String(formData.get("completed_on") ?? "");
  if (!UUID.test(course)) return { error: "Choose the course." };
  if (!name || name.length < 2) return { error: "Enter the learner's full name, as it should appear on the certificate." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Date.parse(date) > Date.now() + 86400_000) return { error: "Choose the date they completed the course." };
  const { data: c } = await staff.supabase.from("courses").select("id, title, certification_type, accrediting_body, cpd_hours").eq("id", course).maybeSingle();
  if (!c) return { error: "Course not found." };
  const { data, error } = await staff.supabase
    .from("certificates")
    .insert({
      course_id: c.id,
      learner_name: name,
      course_title: c.title,
      certification_type: c.certification_type,
      accrediting_body: c.certification_type === "externally_accredited" ? c.accrediting_body : null,
      cpd_hours: c.cpd_hours,
      completed_on: date,
      issued_by: staff.user.id,
    })
    .select("number")
    .single();
  if (error || !data) return { error: "The certificate couldn't be issued. Please try again." };
  revalidatePath("/admin/learning/certificates");
  redirect(`/admin/learning/certificates?issued=${data.number}`);
}

export async function revokeCertificate(formData: FormData): Promise<Result> {
  const staff = await requirePermission("academy.edit");
  const id = String(formData.get("id") ?? "");
  const reason = text(formData, "reason", 300);
  const undo = formData.get("undo") === "1";
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!undo && !reason) return { error: "Give a reason for revoking it." };
  const { error } = await staff.supabase
    .from("certificates")
    .update(undo ? { revoked_at: null, revoked_reason: null } : { revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin/learning/certificates");
  redirect(`/admin/learning/certificates?saved=${undo ? "restored" : "revoked"}`);
}
