import Link from "next/link";
import { auth } from "@/auth";
import { ProfileDropdown } from "./profile-dropdown";

export async function HeaderAccountMenu() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="font-label text-sm uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <ProfileDropdown
      user={{
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
        role: user.role,
      }}
    />
  );
}
