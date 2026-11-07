import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [getSessionSecret()],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export async function createUserSession(name: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userName", name);
  session.set("authenticated", true);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function getUserName(request: Request): Promise<string | null> {
  const session = await getUserSession(request);
  const authenticated = session.get("authenticated");
  const userName = session.get("userName");
  return authenticated && userName ? userName : null;
}

export async function requireAuth(request: Request, redirectTo: string = "/") {
  const userName = await getUserName(request);
  if (!userName) {
    const searchParams = new URLSearchParams([["next", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userName;
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export function verifyPassword(
  password: string,
  householdPassword: string
): boolean {
  // Constant-time comparison (hash first to normalize length).
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(householdPassword).digest();
  return timingSafeEqual(a, b);
}

export async function ensureCsrfToken(
  request: Request
): Promise<{ token: string; headers?: Headers }> {
  const session = await getUserSession(request);
  let token = session.get("csrf");
  if (typeof token !== "string" || token.length === 0) {
    token = randomBytes(32).toString("base64url");
    session.set("csrf", token);
    return {
      token,
      headers: new Headers({
        "Set-Cookie": await sessionStorage.commitSession(session),
      }),
    };
  }
  return { token };
}

export async function verifyCsrfToken(
  request: Request,
  submitted: unknown
): Promise<boolean> {
  if (typeof submitted !== "string" || submitted.length === 0) {
    return false;
  }
  const session = await getUserSession(request);
  const expected = session.get("csrf");
  if (typeof expected !== "string") {
    return false;
  }
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(submitted).digest();
  return timingSafeEqual(a, b);
}
