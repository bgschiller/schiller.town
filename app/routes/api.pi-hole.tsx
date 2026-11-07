import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth, verifyCsrfToken } from "~/utils/session.server";
import { getBlockingStatus, setBlocking } from "~/utils/pihole.server";

const ALLOWED_TIMERS: Record<string, number> = {
  "30s": 30,
  "5m": 5 * 60,
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 60 * 60,
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "pi-hole unavailable";
}

export const loader: LoaderFunction = async ({ request }) => {
  await requireAuth(request);
  try {
    return json({ ok: true, status: await getBlockingStatus() });
  } catch (e) {
    return json({ ok: false, error: errorMessage(e) });
  }
};

export const action: ActionFunction = async ({ request }) => {
  await requireAuth(request);

  const form = await request.formData();
  if (!(await verifyCsrfToken(request, form.get("csrf")))) {
    return json({ ok: false, error: "Invalid CSRF token" }, { status: 403 });
  }

  const duration = form.get("duration");
  if (typeof duration === "string" && duration in ALLOWED_TIMERS) {
    try {
      return json({
        ok: true,
        status: await setBlocking(false, ALLOWED_TIMERS[duration]),
      });
    } catch (e) {
      return json({ ok: false, error: errorMessage(e) }, { status: 502 });
    }
  }

  if (form.get("intent") === "enable") {
    try {
      return json({ ok: true, status: await setBlocking(true) });
    } catch (e) {
      return json({ ok: false, error: errorMessage(e) }, { status: 502 });
    }
  }

  return json({ ok: false, error: "Invalid request" }, { status: 400 });
};
