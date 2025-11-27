import type { ActionFunctionArgs } from "partymix";
import { logout } from "~/utils/session.server";

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export async function loader() {
  // Redirect GET requests to home
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}
