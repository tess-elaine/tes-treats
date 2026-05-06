"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { isAdminEmail } from "@/lib/admin-bootstrap";

export async function signInWithGoogle(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl ?? "/" });
}

export async function signInWithEmailMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/");
  if (!email) return;
  await signIn("email", { email, redirectTo: next });
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!email || !password) {
    redirect(`/sign-in?error=missing&next=${encodeURIComponent(next)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: next,
    });
  } catch (err) {
    // Auth.js throws a NEXT_REDIRECT-shaped error on success — propagate it.
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect(`/sign-in?error=invalid&next=${encodeURIComponent(next)}`);
  }
}

export async function signUpWithPassword(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: isAdminEmail(email) ? "admin" : "customer",
    emailVerified: new Date(), // password-confirmed; treat email as verified
  });

  // Sign them in immediately. Auth.js's signIn throws a redirect on success.
  await signIn("credentials", {
    email,
    password,
    redirect: true,
    redirectTo: next,
  });
  // Unreachable, but TS likes a return path.
  redirect(next);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
