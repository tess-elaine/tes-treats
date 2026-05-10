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
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
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

// Resend HTTP API for magic-link sign-in. Avoids SMTP entirely (Railway and
// most managed hosts block outbound 25/465/587). Custom sendVerificationRequest
// overrides the default template so the email is on-brand. id stays "email"
// to keep call sites stable (they pass that string to signIn()).
const magicLinkProvider = {
  ...Resend({
    apiKey: process.env.AUTH_RESEND_KEY ?? process.env.SMTP_PASS ?? "",
    from: process.env.EMAIL_FROM ?? "TES Treats <noreply@localhost>",
    maxAge: 60 * 60, // 1 hour
    async sendVerificationRequest({ identifier, url, provider }) {
      const host = new URL(url).host;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: provider.from,
          to: identifier,
          subject: "Your TES Treats sign-in link",
          html: signInEmailHtml(url, host),
          text: `Click to sign in: ${url}`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend error ${res.status}: ${body}`);
      }
    },
  }),
  id: "email",
};

function signInEmailHtml(url: string, host: string) {
  return `
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf8f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#ffffff;">
        <tr><td style="padding:32px;">
          <h1 style="font-family:Arial,sans-serif;color:#77553d;font-size:26px;margin:0 0 16px 0;">Welcome back to TES Treats</h1>
          <p style="font-size:16px;line-height:1.6;color:#504441;margin:0 0 24px 0;">Click the button below to sign in. This link expires in one hour and works only once.</p>

          <!-- Bulletproof button: background on <td>, not <a>, so the full area is tappable on mobile -->
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" bgcolor="#77553d" style="border-radius:4px;">
                <a href="${url}" target="_blank" style="display:inline-block;color:#ffffff;padding:16px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:16px;font-weight:700;line-height:1;">Sign in to TES Treats</a>
              </td>
            </tr>
          </table>

          <p style="font-size:13px;color:#827470;margin:24px 0 0 0;">If the button doesn&rsquo;t work, copy and paste this link into your browser:</p>
          <p style="font-size:12px;color:#77553d;word-break:break-all;margin:8px 0 0 0;"><a href="${url}" style="color:#77553d;">${url}</a></p>

          <p style="font-size:12px;color:#827470;margin:24px 0 0 0;">If you didn&rsquo;t request this from ${host}, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
