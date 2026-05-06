import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the current user (or null) from the database session cookie. */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Hard-redirect to /sign-in if not authenticated. Returns the user otherwise. */
export async function requireUser(returnTo?: string) {
  const user = await currentUser();
  if (!user) {
    const qs = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/sign-in${qs}`);
  }
  return user;
}

/** Hard-redirect non-admins to /. Returns the user when admin. */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
