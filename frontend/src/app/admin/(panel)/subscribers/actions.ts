"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { articleEmail } from "@/lib/newsletter";
import { mediaUrl } from "@/lib/content";

type Result = { error: string } | undefined;

export async function removeSubscriber(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.delete");
  const id = String(formData.get("id") ?? "");
  const { error } = await staff.supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) return { error: "Could not remove them. Please try again." };
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers?saved=removed");
}

/**
 * Emails a published article to every confirmed subscriber, once. Each email is
 * sent separately (nobody sees other addresses) with its own unsubscribe link.
 */
export async function sendArticle(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const postId = String(formData.get("post_id") ?? "");
  const db = staff.supabase;

  const { data: post } = await db
    .from("posts")
    .select("id, slug, title, excerpt, cover_image_path, status, published_at, category:post_categories(name)")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { error: "Article not found." };
  if (post.status !== "published" || (post.published_at && Date.parse(post.published_at) > Date.now())) {
    return { error: "Publish the article first. Only articles that are live on the website can be emailed." };
  }
  const { data: subscribers } = await db.from("newsletter_subscribers").select("email, token").eq("status", "subscribed");
  if (!subscribers?.length) return { error: "There are no confirmed subscribers yet." };

  // Claim the send first: the database allows one send per article.
  const { data: send, error: claimError } = await db
    .from("newsletter_sends")
    .insert({ post_id: post.id, sent_by: staff.user.id, recipients: subscribers.length })
    .select("id")
    .single();
  if (claimError || !send) return { error: "This article has already been emailed to subscribers." };

  const base = await siteUrl();
  const category = post.category as unknown as { name: string } | null;
  const article = {
    title: post.title,
    excerpt: post.excerpt,
    url: `${base}/journal/${post.slug}`,
    imageUrl: mediaUrl(post.cover_image_path),
    category: category?.name ?? null,
  };
  let failed = 0;
  for (const s of subscribers) {
    const result = await sendEmail({ to: [s.email], ...articleEmail(article, `${base}/api/newsletter/unsubscribe/${s.token}`) });
    if (!result.sent) {
      failed += 1;
      if (result.reason === "not-configured") {
        failed = subscribers.length;
        break;
      }
    }
  }
  await db.from("newsletter_sends").update({ failed, finished_at: new Date().toISOString() }).eq("id", send.id);
  revalidatePath("/admin/subscribers");
  redirect(`/admin/content/posts/${post.id}?saved=emailed`);
}
