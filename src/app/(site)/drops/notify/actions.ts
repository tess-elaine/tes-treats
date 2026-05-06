"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dropSubscribers } from "@/db/schema/drops";

export async function subscribeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const source = String(formData.get("source") ?? "drops-notify-page");
  if (!email || !email.includes("@")) {
    redirect("/drops/notify?error=email");
  }

  const existing = await db.query.dropSubscribers.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });
  if (existing) {
    if (existing.unsubscribedAt) {
      // Re-subscribe.
      await db
        .update(dropSubscribers)
        .set({ unsubscribedAt: null, subscribedAt: new Date(), source })
        .where(eq(dropSubscribers.id, existing.id));
    }
    redirect("/drops/notify?subscribed=1");
  }

  await db.insert(dropSubscribers).values({ email, source });
  redirect("/drops/notify?subscribed=1");
}
