"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { db } from "@/db";
import { customRequests, customRequestPhotos } from "@/db/schema/custom_requests";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB each

export async function submitCustomRequestAction(formData: FormData) {
  const session = await auth();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  if (!email || !email.includes("@")) {
    redirect("/custom?error=email");
  }
  if (!description) {
    redirect("/custom?error=description");
  }

  const name = String(formData.get("name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const occasion = String(formData.get("occasion") ?? "").trim() || null;
  const desiredDate = String(formData.get("desiredDate") ?? "").trim() || null;
  const servingsRaw = String(formData.get("servings") ?? "").trim();
  const servings = servingsRaw ? Number(servingsRaw) : null;

  const number = `CR-${randomBytes(3).toString("hex").toUpperCase()}`;

  const [request] = await db
    .insert(customRequests)
    .values({
      number,
      userId: session?.user?.id,
      email,
      name,
      phone,
      occasion,
      description,
      desiredDate,
      servings: Number.isFinite(servings) ? servings : null,
      status: "submitted",
    })
    .returning({ id: customRequests.id });

  // Upload up to 5 photos. Each is independently optional.
  const files = formData.getAll("photos") as File[];
  const useable = files.filter((f) => f && f instanceof File && f.size > 0);
  const toUpload = useable.slice(0, MAX_PHOTOS);
  for (let i = 0; i < toUpload.length; i++) {
    const file = toUpload[i];
    if (file.size > MAX_BYTES) continue; // silently skip oversized
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const { url } = await putObject({
        prefix: `custom-requests/${request.id}`,
        filename: file.name,
        body: buf,
        contentType: file.type || "application/octet-stream",
      });
      await db.insert(customRequestPhotos).values({
        requestId: request.id,
        url,
        sortOrder: i,
      });
    } catch (e) {
      console.error("[custom-request] photo upload failed", e);
      // continue rather than fail the whole submission
    }
  }

  // Notify Tess.
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `[TES] New custom request ${number}`,
      html: `
        <p>A new custom request just came in.</p>
        <p><strong>From:</strong> ${name ?? "(no name)"} &lt;${email}&gt;</p>
        ${occasion ? `<p><strong>Occasion:</strong> ${occasion}</p>` : ""}
        ${desiredDate ? `<p><strong>Desired date:</strong> ${desiredDate}</p>` : ""}
        ${servings ? `<p><strong>Approx. servings:</strong> ${servings}</p>` : ""}
        <p><strong>Description:</strong></p>
        <p style="white-space:pre-wrap">${description.replace(/</g, "&lt;")}</p>
        <p>Review in admin → /admin/custom-requests/${request.id}</p>
      `,
    });
  }

  // Confirmation to the customer.
  await sendEmail({
    to: email,
    subject: "TES Treats — we got your request",
    html: `
      <p>Hi${name ? " " + name.split(" ")[0] : ""},</p>
      <p>Your custom request <strong>${number}</strong> just landed in Tess's inbox. She typically responds within a day or two with a quote.</p>
      <p>If anything changes on your end, just reply to this email.</p>
      <p>— TES Treats</p>
    `,
  });

  redirect("/custom?submitted=1");
}
