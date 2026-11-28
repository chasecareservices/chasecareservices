"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLearner } from "@/lib/learn/session";
import { createAuthClient } from "@/lib/supabase/server-auth";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const SLUG = /^[a-z0-9-]{1,120}$/;

export async function signOutLearner() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/learn/login");
}

/** "Mark as finished" on a lesson, then on to the next one. */
export async function finishLesson(formData: FormData): Promise<Result> {
  const learner = await requireLearner();
  const lesson = String(formData.get("lesson") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!UUID.test(lesson) || !SLUG.test(slug)) return { error: "Something went wrong. Please reload the page." };
  const { data: cert, error } = await learner.supabase.rpc("complete_lesson", { lesson });
  if (error) return { error: "That couldn't be saved. Check your connection and try again." };
  revalidatePath("/learn", "layout");
  if (cert) redirect(`/learn/courses/${slug}?completed=1`);
  redirect(UUID.test(next) ? `/learn/courses/${slug}/lessons/${next}` : `/learn/courses/${slug}?lessons=done`);
}

export async function enrolMyself(formData: FormData): Promise<Result> {
  const learner = await requireLearner();
  const course = String(formData.get("course") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!UUID.test(course) || !SLUG.test(slug)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await learner.supabase.rpc("self_enrol", { course });
  if (error) return { error: "This course isn't open for online enrolment. Please contact the Academy." };
  revalidatePath("/learn", "layout");
  redirect(`/learn/courses/${slug}?enrolled=1`);
}

/** Marks the assessment on the server (the answers never reach the browser). */
export async function submitAssessment(formData: FormData): Promise<Result> {
  const learner = await requireLearner();
  const course = String(formData.get("course") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const count = Number(formData.get("count") ?? 0);
  if (!UUID.test(course) || !SLUG.test(slug) || !Number.isInteger(count) || count < 1 || count > 200) return { error: "Something went wrong. Please reload the page." };
  const answers: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = formData.get(`q${i}`);
    if (v === null) return { error: `Please answer question ${i + 1}.` };
    answers.push(Number(v));
  }
  const { data, error } = await learner.supabase.rpc("submit_quiz", { course, answers });
  if (error) {
    return { error: error.code === "54000" || error.code === "55000" || error.code === "22023" ? error.message : "Your answers couldn't be sent. Please try again." };
  }
  const r = data?.[0];
  revalidatePath("/learn", "layout");
  redirect(`/learn/courses/${slug}/assessment?score=${r?.score ?? 0}&total=${r?.total ?? 0}&passed=${r?.passed ? 1 : 0}&mark=${r?.pass_mark ?? 0}`);
}
