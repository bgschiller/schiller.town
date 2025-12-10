import type { ActionFunctionArgs } from "partymix";
import { logout } from "~/utils/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  return logout(request, context.env.SESSION_SECRET);
}

export async function loader() {
  // Redirect GET requests to home
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}
