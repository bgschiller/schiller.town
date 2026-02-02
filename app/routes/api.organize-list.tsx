import type { ActionFunctionArgs, LoaderFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import { organizeGroceriesByDepartment } from "~/../../party/grocery-categorizer";

// GET /api/organize-list (handles OPTIONS for CORS preflight)
export async function loader({ request }: LoaderFunctionArgs) {
  return json(
    { ok: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

// POST /api/organize-list
export async function action({ request, context }: ActionFunctionArgs) {
  const body = (await request.json()) as { items?: string[] };

  if (!body.items || !Array.isArray(body.items)) {
    return json(
      { error: "Invalid request: items array required" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // Get ANTHROPIC_API_KEY from Remix context (passed from PartyKit env)
  const apiKey = context?.env?.ANTHROPIC_API_KEY as string | undefined;

  // Use the grocery categorizer directly - it will automatically choose between
  // AI and keyword-based categorization depending on API key availability
  const organized = await organizeGroceriesByDepartment(body.items, apiKey);

  return json(
    { organized },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
