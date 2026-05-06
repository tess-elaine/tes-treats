/**
 * Auth.js v5. Three sign-in methods:
 *   - Google OAuth
 *   - Magic-link via lib/email.ts (SMTP, dev catcher in Mailpit)
 *   - Email + password via Credentials provider (bcryptjs)
 *
 * Session strategy is `jwt` because the Credentials provider doesn't compose
 * with database sessions. The Drizzle adapter still backs OAuth/email — only
 * the session token is JWT-encoded in a cookie.
 *
 * Next 16: this runs in the Node runtime (proxy.ts requirement).
 */
import NextAuth, { type DefaultSession } from "next-auth";
import type { EmailConfig } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema/auth";
import { sendEmail } from "@/lib/email";
import { isAdminEmail } from "@/lib/admin-bootstrap";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "customer" | "admin";
    } & DefaultSession["user"];
  }
}

type AppJWT = { id?: string; role?: "customer" | "admin" };

const magicLinkProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  server: {},
  from: process.env.EMAIL_FROM ?? "TES Treats <noreply@localhost>",
  maxAge: 60 * 60, // 1 hour
  options: {},
  async sendVerificationRequest({ identifier, url }) {
    const host = new URL(url).host;
    await sendEmail({
      to: identifier,
      subject: "Your TES Treats sign-in link",
      html: signInEmailHtml(url, host),
      text: `Click to sign in: ${url}`,
    });
  },
};

function signInEmailHtml(url: string, host: string) {
  return `
<!doctype html><html><body style="font-family:Newsreader,Georgia,serif;background:#fdf8f5;color:#1c1b1a;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:32px;">
    <h1 style="font-family:Epilogue,sans-serif;color:#77553d;font-size:28px;margin:0 0 16px 0;">Welcome back to TES Treats</h1>
    <p style="font-size:16px;line-height:1.6;color:#504441;">Click the button below to sign in. This link expires in an hour and works only once.</p>
    <p style="margin:24px 0;"><a href="${url}" style="background:#77553d;color:#ffffff;padding:14px 24px;text-decoration:none;font-family:Epilogue,sans-serif;font-weight:700;display:inline-block;">Sign in to TES Treats</a></p>
    <p style="font-size:12px;color:#827470;">If you didn&rsquo;t request this email from ${host}, you can safely ignore it.</p>
  </div>
</body></html>`;
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    magicLinkProvider,
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const row = await db.query.users.findFirst({
          where: (t, { eq }) => eq(t.email, email),
        });
        if (!row?.passwordHash) return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email,
          name: row.name ?? null,
          image: row.image ?? null,
          // Surfaced in the JWT callback below.
          role: row.role,
        } as unknown as { id: string; email: string; name: string | null; image: string | null };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
    error: "/sign-in",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    /**
     * Called whenever a JWT is created or updated. We bake the user id and
     * role onto the token so we don't have to hit the DB every request.
     */
    async jwt({ token, user, trigger }) {
      const t = token as AppJWT & typeof token;
      if (user) {
        // user is the AdapterUser (OAuth/email) or our shaped Credentials user.
        const u = user as { id?: string; role?: "customer" | "admin" };
        if (u.id) t.id = u.id;
        if (u.role) t.role = u.role;
      }
      // Re-hydrate role from DB if missing (e.g., user was promoted to admin
      // AFTER signing in, or session.update() was called).
      if (trigger === "update" || (t.id && !t.role)) {
        const row = await db.query.users.findFirst({
          where: (tbl, { eq }) => eq(tbl.id, t.id as string),
          columns: { role: true },
        });
        if (row) t.role = row.role;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as AppJWT;
      if (session.user) {
        session.user.id = t.id ?? "";
        session.user.role = t.role ?? "customer";
      }
      return session;
    },
  },
  events: {
    /**
     * First-time signup hook. Auto-promotes any email listed in
     * ADMIN_EMAILS (comma-separated) to admin so Tess never has to run SQL.
     */
    async createUser({ user }) {
      if (isAdminEmail(user.email) && user.id) {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, user.id as string));
      }
    },
  },
});
