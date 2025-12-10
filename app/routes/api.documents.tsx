import type { ActionFunctionArgs, LoaderFunctionArgs } from "partymix";
import { json } from "@remix-run/react";

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
function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;
  return `${host}/parties/documents-server/default${path}`;
}

// GET /api/documents?archived=true
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const showArchived = url.searchParams.get("archived") === "true";
  const storageUrl = getStorageUrl(
    request,
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
export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;

  // POST /api/documents - Create new document
  if (method === "POST") {
    const body = await request.json();

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
    const storageUrl = getStorageUrl(request, `/storage-put`);
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
