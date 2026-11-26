"use server";

import { notifyEnquiry } from "@/lib/email/notify";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Called by the website's forms right after an enquiry is saved: emails the office about it. */
export async function announceEnquiry(id: string) {
  if (typeof id !== "string" || !UUID.test(id)) return;
  await notifyEnquiry(id);
}
