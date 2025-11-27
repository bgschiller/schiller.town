import { createCookieSessionStorage, redirect } from "partymix";

// This should be set in your .env file
const SESSION_SECRET =
  process.env.SESSION_SECRET || "default-secret-change-this";
const HOUSEHOLD_PASSWORD = process.env.HOUSEHOLD_PASSWORD || "household2024";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
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
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
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

export function verifyPassword(password: string): boolean {
  return password === HOUSEHOLD_PASSWORD;
}
