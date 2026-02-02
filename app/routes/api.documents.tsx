import type { ActionFunctionArgs, LoaderFunctionArgs } from "partymix";
import { json } from "@remix-run/react";

// Define environment variables type
type Env = {
  IS_LOCAL_DEV?: string;
};

export type Document = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

// Helper to get PartyServer storage URL
function getStorageUrl(request: Request, env: Env, path: string = "") {
  // With custom domain routing in wrangler.toml, both request.url and Host header
  // show the production domain even in local dev. Use environment variable instead.
  const isLocal = env.IS_LOCAL_DEV === "true";

  console.log("🔍 [getStorageUrl] IS_LOCAL_DEV:", env.IS_LOCAL_DEV, "isLocal:", isLocal);

  const host = isLocal ? `http://localhost:8787` : `http://schiller.town`;
  const fullUrl = `${host}/parties/documents-server/default${path}`;
  console.log("🔍 [getStorageUrl] Returning URL:", fullUrl);
  return fullUrl;
}

// GET /api/documents?archived=true
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as Env;
  const url = new URL(request.url);
  const showArchived = url.searchParams.get("archived") === "true";
  const storageUrl = getStorageUrl(
    request,
    env,
    `/storage-list?archived=${showArchived}`
  );

  const response = await fetch(storageUrl);
  if (!response.ok) {
    throw new Response("Failed to fetch documents", { status: 500 });
  }

  const documents = await response.json();
  return json(documents);
}

// POST /api/documents (create)
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as Env;
  const method = request.method;

  // POST /api/documents - Create new document
  if (method === "POST") {
    const body = (await request.json()) as { slug?: string; title?: string };

    // Validate slug format
    const slugRegex = /^[a-zA-Z0-9._-]+$/;
    if (!body.slug || !slugRegex.test(body.slug)) {
      return json(
        {
          error:
            "Slug can only contain letters, numbers, dashes, dots, and underscores",
        },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const checkUrl = getStorageUrl(
      request,
      env,
      `/storage-get-by-slug/${encodeURIComponent(body.slug)}`
    );
    const checkResponse = await fetch(checkUrl);
    if (checkResponse.ok) {
      return json(
        { error: "A document with this slug already exists" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const id = `doc-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const doc: Document = {
      id,
      slug: body.slug,
      title: body.title || "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now,
      archived: false,
    };

    // Store in PartyKit (storage key is doc.id)
    const storageUrl = getStorageUrl(request, env, `/storage-put`);
    const response = await fetch(storageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: doc }),
    });

    if (!response.ok) {
      return json({ error: "Failed to create document" }, { status: 500 });
    }

    return json(doc);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
