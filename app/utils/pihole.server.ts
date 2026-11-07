// Server-side client for the LAN pi-hole (v6) API.
// Authenticates with the app password to get a short-lived session
// (sid + csrf), caches it, and re-authenticates before it lapses.

const PIHOLE_URL = process.env.PIHOLE_URL ?? "http://192.168.0.26";

interface PiHoleSession {
  sid: string;
  csrf: string;
  expiresAt: number;
}

export interface BlockingStatus {
  blocking: boolean;
  timerSeconds: number | null;
}

let cachedSession: PiHoleSession | null = null;

async function authenticate(): Promise<PiHoleSession> {
  const password = process.env.PIHOLE_APP_PASSWORD;
  if (!password) {
    throw new Error("PIHOLE_APP_PASSWORD is not set");
  }

  const res = await fetch(`${PIHOLE_URL}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(`pi-hole auth failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    session: {
      valid: boolean;
      sid: string | null;
      csrf: string | null;
      validity: number;
      message: string | null;
    };
  };

  const { valid, sid, csrf, validity, message } = data.session ?? {};
  if (!valid || !sid || !csrf) {
    throw new Error(`pi-hole auth failed: ${message ?? "invalid credentials"}`);
  }

  return {
    sid,
    csrf,
    // Re-authenticate one minute before the session actually expires.
    expiresAt: Date.now() + validity * 1000 - 60_000,
  };
}

async function getSession(): Promise<PiHoleSession> {
  if (cachedSession && cachedSession.expiresAt > Date.now()) {
    return cachedSession;
  }
  cachedSession = await authenticate();
  return cachedSession;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const session = await getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("X-CSRF-TOKEN", session.csrf);
  headers.set("Cookie", `sid=${session.sid}`);
  return fetch(`${PIHOLE_URL}${path}`, { ...init, headers });
}

function parseStatus(data: {
  blocking: string;
  timer: number | null;
}): BlockingStatus {
  return {
    blocking: data.blocking === "enabled",
    timerSeconds: typeof data.timer === "number" ? data.timer : null,
  };
}

export async function getBlockingStatus(): Promise<BlockingStatus> {
  const res = await request("/api/dns/blocking");
  if (!res.ok) throw new Error(`pi-hole status failed: HTTP ${res.status}`);
  return parseStatus(
    (await res.json()) as { blocking: string; timer: number | null }
  );
}

export async function setBlocking(
  enabled: boolean,
  timerSeconds?: number
): Promise<BlockingStatus> {
  const body: { blocking: boolean; timer?: number } = { blocking: enabled };
  if (!enabled && typeof timerSeconds === "number") {
    body.timer = timerSeconds;
  }
  const res = await request("/api/dns/blocking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`pi-hole update failed: HTTP ${res.status}`);
  return parseStatus(
    (await res.json()) as { blocking: string; timer: number | null }
  );
}
