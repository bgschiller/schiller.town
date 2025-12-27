import { createCookieSessionStorage, redirect } from "partymix";

// Create session storage with a function that will use the actual secret at runtime
export function getSessionStorage(sessionSecret: string) {
  return createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [sessionSecret],
      secure: true, // Always use secure in production
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });
}

export async function createUserSession(
  name: string,
  redirectTo: string,
  sessionSecret: string
) {
  const sessionStorage = getSessionStorage(sessionSecret);
  const session = await sessionStorage.getSession();
  session.set("userName", name);
  session.set("authenticated", true);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request, sessionSecret: string) {
  const sessionStorage = getSessionStorage(sessionSecret);
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function getUserName(
  request: Request,
  sessionSecret: string
): Promise<string | null> {
  const session = await getUserSession(request, sessionSecret);
  const authenticated = session.get("authenticated");
  const userName = session.get("userName");
  return authenticated && userName ? userName : null;
}

export async function requireAuth(
  request: Request,
  sessionSecret: string,
  redirectTo: string = "/"
) {
  const userName = await getUserName(request, sessionSecret);
  if (!userName) {
    const searchParams = new URLSearchParams([["next", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userName;
}

export async function logout(request: Request, sessionSecret: string) {
  const sessionStorage = getSessionStorage(sessionSecret);
  const session = await getUserSession(request, sessionSecret);
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
  return password === householdPassword;
}
